import logging

import aiohttp

from .config import settings

logger = logging.getLogger(__name__)

class ChannelRegistry:
    def __init__(self) -> None:
        self._pages: dict[str, dict] = {}

    async def load_from_backend(self) -> None:
        """
        Завантажує всі підключені сторінки з бекенду при старті.
        """
        url = f"{settings.BACKEND_URL}/api/internal/channels/meta"
        headers = {"X-Internal-Key": settings.INTERNAL_API_KEY}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        pages = await resp.json()
                        for page in pages:
                            self._upsert(page)
                        logger.info(
                            "Loaded %d page(s) from backend", len(self._pages)
                        )
                    else:
                        text = await resp.text()
                        logger.error(
                            "Failed to load channels [HTTP %d]: %s", resp.status, text
                        )
        except Exception as exc:
            logger.error("Error loading channels from backend: %s", exc)

    def add(
        self,
        page_id: str,
        instance_id: str,
        workspace_id: str,
        access_token: str,
        platform: str,
    ) -> None:
        self._pages[page_id] = {
            "instanceId":  instance_id,
            "workspaceId": workspace_id,
            "accessToken": access_token,
            "platform":    platform.upper(),
        }
        logger.info(
            "Page added/updated: pageId=%s instanceId=%s platform=%s",
            page_id, instance_id, platform,
        )

    def remove(self, page_id: str) -> None:
        if page_id in self._pages:
            del self._pages[page_id]
            logger.info("Page removed: pageId=%s", page_id)
        else:
            logger.warning("Tried to remove unknown page: pageId=%s", page_id)

    def get(self, page_id: str) -> dict | None:
        """Повертає { instanceId, workspaceId, accessToken, platform } або None."""
        return self._pages.get(page_id)

    def all(self) -> dict[str, dict]:
        return dict(self._pages)

    def count(self) -> int:
        return len(self._pages)

    def _upsert(self, page: dict) -> None:
        page_id = page.get("pageId")
        if not page_id:
            logger.warning("Page record missing pageId, skipping: %s", page)
            return
        self._pages[page_id] = {
            "instanceId":  page["instanceId"],
            "workspaceId": page["workspaceId"],
            "accessToken": page["accessToken"],
            "platform":    page.get("platform", "UNKNOWN").upper(),
        }