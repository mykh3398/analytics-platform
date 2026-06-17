import logging

from aiogram.types import Message

from app.dto.raw_message_dto import RawMessageDto
from app.publisher.rabbitmq_publisher import RabbitMQPublisher

logger = logging.getLogger(__name__)


async def handle_message(
    message: Message,
    publisher: RabbitMQPublisher,
    instance_id: str,
) -> None:
    """
    Handler for incoming Telegram messages.
    Registered on a fresh Router per bot — NOT a global singleton.

    Non-text messages are silently ignored and logged.
    Text messages are serialised into RawMessageDto and published to RabbitMQ.
    """
    if not message.text:
        logger.info(
            "Non-text message ignored | type=%s chat_id=%s message_id=%s instance=%s",
            message.content_type,
            message.chat.id,
            message.message_id,
            instance_id,
        )
        return

    sender = message.from_user
    if sender:
        if sender.username:
            sender_name = f"@{sender.username}"
        else:
            parts = filter(None, [sender.first_name, sender.last_name])
            sender_name = " ".join(parts) or "unknown"
        sender_id = str(sender.id)
    else:
        sender_name = "anonymous"
        sender_id = "anonymous"

    sent_at = message.date.strftime("%Y-%m-%dT%H:%M:%S")

    dto = RawMessageDto(
        source="TELEGRAM",
        instanceId=instance_id,
        externalId=str(message.message_id),
        chatId=str(message.chat.id),
        senderId=sender_id,
        senderName=sender_name,
        text=message.text,
        sentAt=sent_at,
        rawPayload=message.model_dump_json(),
    )

    await publisher.publish(dto)