import asyncio
import logging

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message

from app.dto.raw_message_dto import RawMessageDto

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "messages"
ROUTING_KEY = "tg.raw"

# Retry policy for publish failures.
# On each attempt we wait RETRY_DELAYS[attempt] seconds before retrying.
# If all attempts are exhausted the message payload is logged as ERROR
# so it can be manually recovered — a proper server-side DLQ should be
# configured in Spring Boot's RabbitMQConfig for production use.
RETRY_DELAYS = (1, 2, 4)   # seconds between retries (exponential backoff)


class RabbitMQPublisher:
    """
    Manages a single robust connection to RabbitMQ.
    Publishes RawMessageDto JSON to the 'messages' DirectExchange.

    Uses connect_robust() — automatically reconnects on network failures.
    Failed publishes are retried up to len(RETRY_DELAYS) times with
    exponential backoff before the message is logged and dropped.
    """

    def __init__(self, rabbitmq_url: str) -> None:
        self._url = rabbitmq_url
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(self._url, fail_fast=False)
        self._channel = await self._connection.channel()

        # Declare exchange passively-compatible: durable DirectExchange.
        # Spring Boot declares the same exchange in RabbitMQConfig — declarations must match.
        self._exchange = await self._channel.declare_exchange(
            EXCHANGE_NAME,
            ExchangeType.DIRECT,
            durable=True,
        )
        logger.info(
            "RabbitMQ connected | exchange='%s' routing_key='%s'",
            EXCHANGE_NAME,
            ROUTING_KEY,
        )

    async def disconnect(self) -> None:
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
            logger.info("RabbitMQ connection closed")

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    @property
    def is_connected(self) -> bool:
        """True when the underlying connection exists and is not closed."""
        return (
            self._connection is not None
            and not self._connection.is_closed
            and self._exchange is not None
        )

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    async def publish(self, dto: RawMessageDto) -> None:
        """
        Publish a RawMessageDto to RabbitMQ.

        Retries up to len(RETRY_DELAYS) times with exponential backoff.
        If all retries are exhausted the full JSON payload is logged at
        ERROR level so it can be manually recovered or replayed later.
        """
        if self._exchange is None:
            raise RuntimeError("RabbitMQPublisher.connect() must be called before publish()")

        amqp_message = Message(
            body=dto.to_json_bytes(),
            content_type="application/json",
            delivery_mode=DeliveryMode.PERSISTENT,   # survives broker restart
        )

        last_exc: Exception | None = None
        for attempt, delay in enumerate(RETRY_DELAYS, start=1):
            try:
                await self._exchange.publish(amqp_message, routing_key=ROUTING_KEY)
                logger.info(
                    "Published | instance=%s chat=%s message_id=%s",
                    dto.instanceId,
                    dto.chatId,
                    dto.externalId,
                )
                return
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "Publish failed (attempt %d/%d) | instance=%s chat=%s message_id=%s | %s: %s — retrying in %ds",
                    attempt,
                    len(RETRY_DELAYS),
                    dto.instanceId,
                    dto.chatId,
                    dto.externalId,
                    type(exc).__name__,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)

        # All retries exhausted — log full payload for manual recovery.
        # In production, configure a Dead Letter Queue in Spring Boot's
        # RabbitMQConfig to handle undeliverable messages automatically.
        logger.error(
            "Publish FAILED after %d attempts — message dropped. "
            "Configure a server-side DLQ for automatic recovery. "
            "PAYLOAD: %s | error: %s",
            len(RETRY_DELAYS),
            dto.to_json_bytes().decode(),
            last_exc,
        )