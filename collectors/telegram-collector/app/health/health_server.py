import logging

from aiohttp import web

from app.config import settings
from app.publisher.rabbitmq_publisher import RabbitMQPublisher

logger = logging.getLogger(__name__)

HEALTH_PORT = settings.HEALTH_PORT


async def _health_handler(request: web.Request) -> web.Response:
    publisher: RabbitMQPublisher = request.app["publisher"]
    manager = request.app.get("manager")

    active_bots = manager.active_instance_ids if manager else []

    if publisher.is_connected:
        return web.json_response(
            {
                "status": "ok",
                "rabbitmq": "connected",
                "active_bots": active_bots,
            },
            status=200,
        )

    return web.json_response(
        {
            "status": "degraded",
            "rabbitmq": "disconnected",
            "active_bots": active_bots,
        },
        status=503,
    )


def build_health_app(publisher: RabbitMQPublisher, manager=None) -> web.Application:
    app = web.Application()
    app["publisher"] = publisher
    app["manager"] = manager
    app.router.add_get("/health", _health_handler)
    return app


async def start_health_server(publisher: RabbitMQPublisher, manager=None) -> web.AppRunner:
    """
    Starts the health-check HTTP server as a background task.
    Runs on settings.HEALTH_PORT (default 8001) regardless of MODE.
    Optionally accepts the BotManager to expose active_bots in /health response.
    Returns the AppRunner so it can be cleanly stopped on shutdown.
    """
    app = build_health_app(publisher, manager)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host="0.0.0.0", port=HEALTH_PORT)
    await site.start()
    logger.info("Health server listening on :%d  GET /health", HEALTH_PORT)
    return runner