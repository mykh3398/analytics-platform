import asyncio
import logging

from aio_pika import DeliveryMode, ExchangeType, Message, connect_robust

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "messages"
ROUTING_KEYS = {
    "INSTAGRAM": "ig.raw",
    "FACEBOOK":  "fb.raw",
}
MAX_RETRIES = 3


class RabbitPublisher:
    def __init__(self, rabbitmq_url: str):
        self._url = rabbitmq_url
        self._connection = None
        self._channel = None
        self._exchange = None

    async def connect(self) -> None:
        self._connection = await connect_robust(self._url, fail_fast=False)
        self._channel = await self._connection.channel()
        self._exchange = await self._channel.declare_exchange(
            EXCHANGE_NAME, ExchangeType.DIRECT, durable=True
        )
        logger.info("RabbitMQ connected, exchange '%s' declared", EXCHANGE_NAME)

    async def publish(self, dto) -> None:
        payload = dto.to_json()
        routing_key = ROUTING_KEYS.get(dto.source)
        if not routing_key:
            raise ValueError(f"Unknown source: {dto.source}")

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                await self._exchange.publish(
                    Message(
                        body=payload,
                        content_type="application/json",
                        delivery_mode=DeliveryMode.PERSISTENT,
                    ),
                    routing_key=routing_key,
                )
                logger.info(
                    "Published [%s → %s]: externalId=%s instanceId=%s",
                    dto.source, routing_key, dto.externalId, dto.instanceId,
                )
                return
            except Exception as exc:
                if attempt == MAX_RETRIES:
                    logger.error(
                        "Publish failed after %d attempts. Payload: %s. Error: %s",
                        MAX_RETRIES, payload.decode(), exc,
                    )
                    raise
                wait = 2 ** (attempt - 1)
                logger.warning(
                    "Publish attempt %d/%d failed, retry in %ds: %s",
                    attempt, MAX_RETRIES, wait, exc,
                )
                await asyncio.sleep(wait)

    @property
    def is_connected(self) -> bool:
        return self._connection is not None and not self._connection.is_closed

    async def close(self) -> None:
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
            logger.info("RabbitMQ connection closed")