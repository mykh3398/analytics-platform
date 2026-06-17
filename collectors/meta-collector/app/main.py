import asyncio
import logging

from aiohttp import web

from .channel_registry import ChannelRegistry
from .config import settings
from .control_consumer import ControlConsumer
from .health_server import create_health_app
from .publisher import RabbitPublisher
from .token_refresher import TokenRefresher
from .webhook_server import create_webhook_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    publisher = RabbitPublisher(settings.RABBITMQ_URL)
    await publisher.connect()

    registry = ChannelRegistry()
    await registry.load_from_backend()
    logger.info("Registry loaded: %d page(s)", registry.count())

    token_refresher = TokenRefresher(registry)
    token_refresher.start()

    control_consumer = ControlConsumer(settings.RABBITMQ_URL, registry)
    await control_consumer.start()

    webhook_app = create_webhook_app(publisher, registry)
    webhook_runner = web.AppRunner(webhook_app)
    await webhook_runner.setup()
    webhook_site = web.TCPSite(webhook_runner, settings.WEBAPP_HOST, settings.WEBAPP_PORT)
    await webhook_site.start()

    # 6. Health сервер
    health_app = create_health_app(publisher, registry)
    health_runner = web.AppRunner(health_app)
    await health_runner.setup()
    health_site = web.TCPSite(health_runner, settings.WEBAPP_HOST, settings.HEALTH_PORT)
    await health_site.start()

    logger.info(
        "meta-collector started | pages=%d | "
        "webhook=http://%s:%d%s | health=http://%s:%d/health",
        registry.count(),
        settings.WEBAPP_HOST, settings.WEBAPP_PORT, settings.WEBHOOK_PATH,
        settings.WEBAPP_HOST, settings.HEALTH_PORT,
    )

    try:
        await asyncio.Event().wait()
    finally:
        logger.info("Shutting down...")
        await control_consumer.stop()
        await token_refresher.stop()
        await webhook_runner.cleanup()
        await health_runner.cleanup()
        await publisher.close()
        logger.info("Shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())