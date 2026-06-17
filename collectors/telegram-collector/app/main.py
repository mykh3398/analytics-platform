import asyncio
import logging

import aiohttp
import aio_pika
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from app.config import settings
from aiogram import Router
from app.handlers.message_handler import handle_message
from app.health.health_server import start_health_server
from app.publisher.rabbitmq_publisher import RabbitMQPublisher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Per-bot dispatcher factory
# ---------------------------------------------------------------------------

def _build_dispatcher(publisher: RabbitMQPublisher, instance_id: str) -> Dispatcher:
    router = Router(name=f"messages-{instance_id}")
    router.message()(handle_message)

    dp = Dispatcher()
    dp["publisher"] = publisher
    dp["instance_id"] = instance_id
    dp.include_router(router)
    return dp


# ---------------------------------------------------------------------------
# BotManager
# ---------------------------------------------------------------------------

class BotManager:
    """
    Manages the lifecycle of multiple Telegram bots within a single process.

    active_bots structure:
        {
            "sales":   {"task": asyncio.Task, "bot": Bot},
            "support": {"task": asyncio.Task, "bot": Bot},
        }
    """

    def __init__(self, publisher: RabbitMQPublisher) -> None:
        self._publisher = publisher
        self._active_bots: dict[str, dict] = {}

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def start_bot(self, instance_id: str, token: str) -> None:
        if instance_id in self._active_bots:
            logger.warning("Bot '%s' is already running — ignoring start command", instance_id)
            return

        try:
            bot = Bot(
                token=token,
                default=DefaultBotProperties(parse_mode=ParseMode.HTML),
            )
        except Exception as exc:
            logger.error(
                "Bot init failed — invalid token for instance='%s' | %s: %s",
                instance_id,
                type(exc).__name__,
                exc,
            )
            return

        dp = _build_dispatcher(self._publisher, instance_id)

        task = asyncio.create_task(
            dp.start_polling(bot, publisher=self._publisher, instance_id=instance_id),
            name=f"polling-{instance_id}",
        )
        task.add_done_callback(lambda t: self._on_task_done(instance_id, t))

        self._active_bots[instance_id] = {"task": task, "bot": bot}
        logger.info("Bot started | instance=%s", instance_id)

    async def stop_bot(self, instance_id: str) -> None:
        """
        Gracefully stops a running bot and removes it from the registry.
        """
        entry = self._active_bots.pop(instance_id, None)
        if entry is None:
            logger.warning("Stop command for unknown bot '%s' — ignoring", instance_id)
            return

        entry["task"].cancel()
        try:
            await entry["task"]
        except asyncio.CancelledError:
            pass

        await entry["bot"].session.close()
        logger.info("Bot stopped | instance=%s", instance_id)

    async def stop_all(self) -> None:
        for instance_id in list(self._active_bots.keys()):
            await self.stop_bot(instance_id)

    @property
    def active_instance_ids(self) -> list[str]:
        return list(self._active_bots.keys())

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _on_task_done(self, instance_id: str, task: asyncio.Task) -> None:
        """Callback fired when a polling task finishes (normally or with error)."""
        self._active_bots.pop(instance_id, None)
        if task.cancelled():
            logger.info("Polling task cancelled | instance=%s", instance_id)
        elif task.exception():
            logger.error(
                "Polling task crashed | instance=%s | %s",
                instance_id,
                task.exception(),
            )

    # ------------------------------------------------------------------
    # Initial sync
    # ------------------------------------------------------------------

    async def initial_sync(self) -> None:
        """
        Fetches the list of active bots from Spring Boot on startup.
        Retries indefinitely until the backend responds with HTTP 200.

        Retryable conditions:
          - aiohttp.ClientConnectorError  (backend not up yet)
          - asyncio.TimeoutError          (backend too slow)
          - HTTP 502 / 503               (backend behind proxy, not ready)

        Non-retryable conditions (logged and returns immediately):
          - HTTP 401 / 403               (auth problem — fix config, not retry)
          - Any other unexpected HTTP status

        Expected 200 response: [{"instanceId": "...", "token": "..."}]
        """
        url = f"{settings.BACKEND_URL}/api/internal/channels/telegram"
        headers = {}
        if settings.INTERNAL_API_KEY:
            headers["X-Internal-Key"] = settings.INTERNAL_API_KEY

        retry_delay = settings.INITIAL_SYNC_RETRY_DELAY
        attempt = 0

        while True:
            attempt += 1
            logger.info("Initial sync: GET %s (attempt %d)", url, attempt)

            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        url,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:

                        if resp.status in (502, 503):
                            logger.warning(
                                "Backend not ready yet (HTTP %d) — retrying in %ds...",
                                resp.status,
                                retry_delay,
                            )
                            await asyncio.sleep(retry_delay)
                            continue

                        if resp.status != 200:
                            logger.error(
                                "Initial sync: unexpected HTTP %d — "
                                "check INTERNAL_API_KEY and backend routing. Giving up.",
                                resp.status,
                            )
                            return

                        bots: list[dict] = await resp.json()

            except (aiohttp.ClientConnectorError, asyncio.TimeoutError) as exc:
                logger.warning(
                    "Backend is not ready yet (%s: %s) — retrying in %ds...",
                    type(exc).__name__,
                    exc,
                    retry_delay,
                )
                await asyncio.sleep(retry_delay)
                continue

            except Exception as exc:
                logger.error(
                    "Initial sync: unexpected error (%s: %s) — giving up.",
                    type(exc).__name__,
                    exc,
                )
                return

            break

        logger.info("Initial sync: received %d bot(s) after %d attempt(s)", len(bots), attempt)
        for entry in bots:
            instance_id = entry.get("instanceId")
            token = entry.get("token")
            if not instance_id or not token:
                logger.warning("Initial sync: skipping malformed entry: %s", entry)
                continue
            await self.start_bot(instance_id, token)

    # ------------------------------------------------------------------
    # Control queue consumer
    # ------------------------------------------------------------------

    async def listen_control_queue(self) -> None:
        """
        Consumes bot lifecycle commands from a TopicExchange indefinitely.

        Topology (mirrors Spring Boot RabbitMQConfig):
            Exchange:    bot-control-exchange  (TopicExchange, durable)
            Queue:       tg-control-queue      (durable, created here if absent)
            Binding key: control.tg

        Each collector type has its own queue so RabbitMQ never round-robins
        a command to the wrong collector (e.g. a Telegram start command going
        to the Viber collector).

        Supported commands:
            {"action": "start", "instanceId": "...", "token": "..."}
            {"action": "stop",  "instanceId": "..."}

        Unknown actions are logged and acknowledged (not re-queued).
        Malformed JSON is logged and acknowledged.
        """
        import json

        connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            fail_fast=False,
        )
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)

        exchange = await channel.declare_exchange(
            settings.CONTROL_EXCHANGE,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

        queue = await channel.declare_queue(
            settings.CONTROL_QUEUE,
            durable=True,
        )
        await queue.bind(exchange, routing_key=settings.CONTROL_ROUTING_KEY)

        logger.info(
            "Listening on control queue: '%s' (exchange='%s' routing_key='%s')",
            settings.CONTROL_QUEUE,
            settings.CONTROL_EXCHANGE,
            settings.CONTROL_ROUTING_KEY,
        )

        async with queue.iterator() as messages:
            async for message in messages:
                async with message.process():
                    try:
                        payload = json.loads(message.body.decode())
                    except Exception as exc:
                        logger.error("Control queue: malformed JSON — %s | body=%s", exc, message.body)
                        continue

                    action = payload.get("action")
                    instance_id = payload.get("instanceId")

                    if not action or not instance_id:
                        logger.warning("Control queue: missing 'action' or 'instanceId' — %s", payload)
                        continue

                    logger.info("Control command received | action=%s instance=%s", action, instance_id)

                    if action == "start":
                        token = payload.get("token")
                        if not token:
                            logger.error("Control queue: 'start' command missing 'token' — %s", payload)
                            continue
                        await self.start_bot(instance_id, token)

                    elif action == "stop":
                        await self.stop_bot(instance_id)

                    elif action == "send_message":
                        target_id = payload.get("targetId")
                        text = payload.get("text")

                        if not target_id or not text:
                            logger.error(
                                "Control queue: 'send_message' missing 'targetId' or 'text' — %s", payload
                            )
                            continue

                        entry = self._active_bots.get(instance_id)
                        if entry is None:
                            logger.error(
                                "Control queue: 'send_message' — bot '%s' is not running, cannot send",
                                instance_id,
                            )
                            continue

                        try:
                            await entry["bot"].send_message(chat_id=target_id, text=text)
                            logger.info(
                                "Message sent | instance=%s target=%s",
                                instance_id,
                                target_id,
                            )
                        except Exception as exc:
                            logger.error(
                                "Message send failed | instance=%s target=%s | %s: %s",
                                instance_id,
                                target_id,
                                type(exc).__name__,
                                exc,
                            )

                    else:
                        logger.warning("Control queue: unknown action '%s' — ignoring", action)



async def run() -> None:
    publisher = RabbitMQPublisher(settings.RABBITMQ_URL)
    await publisher.connect()

    manager = BotManager(publisher)

    health_runner = await start_health_server(publisher, manager)

    await manager.initial_sync()

    logger.info(
        "Bot manager running | active_bots=%s",
        manager.active_instance_ids,
    )

    try:
        await manager.listen_control_queue()
    except asyncio.CancelledError:
        logger.info("Shutdown signal received")
    finally:
        logger.info("Shutting down all bots...")
        await manager.stop_all()
        await publisher.disconnect()
        await health_runner.cleanup()
        logger.info("Bot manager stopped")


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()