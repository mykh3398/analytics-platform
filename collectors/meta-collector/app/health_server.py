import logging

from aiohttp import web

logger = logging.getLogger(__name__)


def create_health_app(publisher, registry) -> web.Application:
    app = web.Application()

    async def handle_health(request: web.Request) -> web.Response:
        connected = publisher.is_connected
        pages = registry.all()

        ig_count = sum(1 for p in pages.values() if p["platform"] == "INSTAGRAM")
        fb_count = sum(1 for p in pages.values() if p["platform"] == "FACEBOOK")

        body = {
            "status": "ok" if connected else "degraded",
            "rabbitmq": "connected" if connected else "disconnected",
            "pages": {
                "total": registry.count(),
                "instagram": ig_count,
                "facebook": fb_count,
            },
        }
        return web.json_response(body, status=200 if connected else 503)

    app.router.add_get("/health", handle_health)
    return app