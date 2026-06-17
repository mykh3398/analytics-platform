import asyncio
import logging

import aiohttp

logger = logging.getLogger(__name__)

REFRESH_INTERVAL_SECONDS = 50 * 24 * 3600
GRAPH_REFRESH_URL = "https://graph.instagram.com/refresh_access_token"


class TokenRefresher:
    """
    Оновлює Instagram access_token для всіх IG сторінок у реєстрі кожні 50 днів.
    Facebook Page Access Token безстроковий — не оновлюємо.
    """

    def __init__(self, registry) -> None:
        self._registry = registry
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._loop(), name="token-refresher")
        logger.info(
            "TokenRefresher started (interval: %d days)",
            REFRESH_INTERVAL_SECONDS // 86400,
        )

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("TokenRefresher stopped")

    async def _loop(self) -> None:
        while True:
            await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
            await self._refresh_all()

    async def _refresh_all(self) -> None:
        ig_pages = {
            pid: p
            for pid, p in self._registry.all().items()
            if p["platform"] == "INSTAGRAM"
        }

        if not ig_pages:
            logger.info("TokenRefresher: no Instagram pages to refresh")
            return

        logger.info("TokenRefresher: refreshing %d Instagram token(s)", len(ig_pages))

        for page_id, page in ig_pages.items():
            new_token = await self._refresh_one(page_id, page["accessToken"])
            if new_token:
                self._registry.add(
                    page_id,
                    page["instanceId"],
                    page["workspaceId"],
                    new_token,
                    page["platform"],
                )

    async def _refresh_one(self, page_id: str, token: str) -> str | None:
        params = {"grant_type": "ig_refresh_token", "access_token": token}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    GRAPH_REFRESH_URL, params=params,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        logger.info(
                            "Token refreshed: pageId=%s expires_in=%s",
                            page_id, data.get("expires_in", "?"),
                        )
                        return data["access_token"]
                    else:
                        text = await resp.text()
                        logger.error(
                            "Token refresh failed: pageId=%s [HTTP %d]: %s",
                            page_id, resp.status, text,
                        )
        except Exception as exc:
            logger.error("Token refresh error: pageId=%s: %s", page_id, exc)
        return None