import asyncio
import json
import logging

from aio_pika import ExchangeType, connect_robust
from aio_pika.abc import AbstractIncomingMessage

from .config import settings
from .messenger_client import send_message

logger = logging.getLogger(__name__)

class ControlConsumer:
    def __init__(self, rabbitmq_url: str, registry) -> None:
        self._url = rabbitmq_url
        self._registry = registry
        self._connection = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._consume(), name="control-consumer")
        logger.info(
            "ControlConsumer started | exchange=%s routing_key=%s queue=%s",
            settings.CONTROL_EXCHANGE,
            settings.CONTROL_ROUTING_KEY,
            settings.CONTROL_QUEUE,
        )

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
        logger.info("ControlConsumer stopped")

    async def _consume(self) -> None:
        self._connection = await connect_robust(self._url, fail_fast=False)
        channel = await self._connection.channel()
        await channel.set_qos(prefetch_count=1)

        exchange = await channel.declare_exchange(
            settings.CONTROL_EXCHANGE,
            ExchangeType.TOPIC,
            durable=True,
        )

        queue = await channel.declare_queue(
            settings.CONTROL_QUEUE,
            durable=True,
        )

        await queue.bind(exchange, routing_key=settings.CONTROL_ROUTING_KEY)

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                await self._handle(message)

    async def _handle(self, message: AbstractIncomingMessage) -> None:
        async with message.process():
            try:
                payload = json.loads(message.body)
            except json.JSONDecodeError:
                logger.warning("ControlConsumer: invalid JSON: %s", message.body)
                return

            action = payload.get("action")

            if action == "add_page":
                await self._handle_add_page(payload)

            elif action == "remove_page":
                await self._handle_remove_page(payload)

            elif action == "send_message":
                await self._handle_send_message(payload)

            else:
                logger.warning("ControlConsumer: unknown action '%s'", action)


    async def _handle_add_page(self, payload: dict) -> None:
        page_id      = payload.get("pageId")
        instance_id  = payload.get("instanceId")
        workspace_id = payload.get("workspaceId")
        access_token = payload.get("accessToken")
        platform     = payload.get("platform", "UNKNOWN")

        if not all([page_id, instance_id, workspace_id, access_token]):
            logger.warning("ControlConsumer: incomplete 'add_page': %s", payload)
            return

        self._registry.add(page_id, instance_id, workspace_id, access_token, platform)

    async def _handle_remove_page(self, payload: dict) -> None:
        page_id = payload.get("pageId")
        if not page_id:
            logger.warning("ControlConsumer: 'remove_page' missing pageId")
            return
        self._registry.remove(page_id)

    async def _handle_send_message(self, payload: dict) -> None:
        page_id   = str(payload.get("instanceId", ""))
        target_id = str(payload.get("targetId", ""))
        text      = payload.get("text", "")
        platform  = payload.get("source", "UNKNOWN")

        if not all([page_id, target_id, text]):
            logger.warning(
                "ControlConsumer: incomplete 'send_message' — "
                "missing instanceId/targetId/text: %s", payload,
            )
            return

        page = self._registry.get(page_id)
        if page is None:
            logger.error(
                "ControlConsumer: send_message — pageId=%s not in registry, "
                "cannot send to targetId=%s",
                page_id, target_id,
            )
            return

        await send_message(
            page_id=page_id,
            target_id=target_id,
            text=text,
            access_token=page["accessToken"],
            platform=platform,
        )