import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

from aiohttp import web

from .config import settings
from .dto import RawMessageDto
from .meta_client import meta_client

logger = logging.getLogger(__name__)


def _verify_signature(body: bytes, signature_header: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.APP_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    received = signature_header[len("sha256="):]
    return hmac.compare_digest(expected, received)


def _format_sent_at(timestamp_ms: int) -> str:
    dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


async def _process_messaging(
    messaging: dict,
    platform: str,
    instance_id: str,
    access_token: str,
    raw_body: bytes,
    publisher,
) -> None:
    message = messaging.get("message", {})

    if message.get("is_echo"):
        logger.info("%s: ignoring echo mid=%s", platform, message.get("mid"))
        return

    text = message.get("text")
    if not text:
        logger.info("%s: ignoring non-text mid=%s", platform, message.get("mid"))
        return

    sender_id = str(messaging["sender"]["id"])
    sender_name = await meta_client.get_sender_name(sender_id, access_token, platform)

    dto = RawMessageDto(
        source=platform,
        instanceId=instance_id,
        externalId=str(message["mid"]),
        chatId=sender_id,
        senderId=sender_id,
        senderName=sender_name,
        text=text,
        sentAt=_format_sent_at(messaging.get("timestamp", 0)),
        rawPayload=raw_body.decode("utf-8"),
    )
    await publisher.publish(dto)


def create_webhook_app(publisher, registry) -> web.Application:
    app = web.Application()

    async def handle_verification(request: web.Request) -> web.Response:
        """
        GET /webhook/meta
        Одноразова верифікація при реєстрації Webhook у Meta Console.
        """
        mode = request.rel_url.query.get("hub.mode")
        token = request.rel_url.query.get("hub.verify_token")
        challenge = request.rel_url.query.get("hub.challenge", "")

        if mode == "subscribe" and token == settings.VERIFY_TOKEN:
            logger.info("Webhook URL verified by Meta")
            return web.Response(text=challenge, status=200)

        logger.warning("Webhook verification failed: invalid verify_token")
        return web.Response(status=403)

    async def handle_webhook(request: web.Request) -> web.Response:
        """
        POST /webhook/meta

        Flow:
          1. Верифікуємо HMAC підпис через глобальний APP_SECRET
          2. Визначаємо platform за update["object"]
          3. recipient.id → registry.get(pageId) → instanceId + accessToken
          4. Публікуємо в RabbitMQ з правильним instanceId та source
        """
        body = await request.read()
        signature = request.headers.get("X-Hub-Signature-256", "")

        if not _verify_signature(body, signature):
            logger.warning("Rejected: invalid HMAC signature")
            return web.Response(status=403)

        try:
            update = json.loads(body)
        except json.JSONDecodeError:
            return web.Response(status=400)

        obj = update.get("object")
        if obj == "instagram":
            platform = "INSTAGRAM"
        elif obj == "page":
            platform = "FACEBOOK"
        else:
            logger.info("Ignoring unknown object type: %s", obj)
            return web.Response(status=200)

        for entry in update.get("entry", []):
            for messaging in entry.get("messaging", []):
                recipient_id = str(messaging.get("recipient", {}).get("id", ""))
                page = registry.get(recipient_id)

                if page is None:
                    logger.warning(
                        "%s: unknown recipient_id=%s — not in registry, skipping",
                        platform, recipient_id,
                    )
                    continue

                await _process_messaging(
                    messaging=messaging,
                    platform=platform,
                    instance_id=page["instanceId"],
                    access_token=page["accessToken"],
                    raw_body=body,
                    publisher=publisher,
                )

        return web.Response(status=200)

    app.router.add_get(settings.WEBHOOK_PATH, handle_verification)
    app.router.add_post(settings.WEBHOOK_PATH, handle_webhook)

    return app