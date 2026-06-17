import logging

import aiohttp

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"
_TIMEOUT = aiohttp.ClientTimeout(total=5)


class MetaGraphClient:
    async def get_sender_name(
        self, sender_id: str, access_token: str, platform: str
    ) -> str:
        """
        Instagram: поля name + username → "@username" або "First Last"
        Facebook:  лише поле name (PSID не дає username)
        Fallback:  "anonymous"
        """
        fields = "name,username" if platform == "INSTAGRAM" else "name"
        url = f"{GRAPH_API_BASE}/{sender_id}"
        params = {"fields": fields, "access_token": access_token}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=_TIMEOUT) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if platform == "INSTAGRAM" and (username := data.get("username")):
                            return f"@{username}"
                        if name := data.get("name"):
                            return name
                    else:
                        logger.warning(
                            "Graph API %d for sender=%s platform=%s",
                            resp.status, sender_id, platform,
                        )
        except Exception as exc:
            logger.warning("Graph API error sender=%s: %s", sender_id, exc)

        return "anonymous"


meta_client = MetaGraphClient()