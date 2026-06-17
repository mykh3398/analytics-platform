import logging

import aiohttp

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"


async def send_message(
    page_id: str,
    target_id: str,
    text: str,
    access_token: str,
    platform: str,
) -> None:
    if not access_token:
        logger.error(
            "send_message aborted: access_token is empty for pageId=%s. "
            "Check that the page was registered via add_page with a valid token.",
            page_id,
        )
        return

    token_preview = (
        f"{access_token[:6]}...{access_token[-4:]}"
        if len(access_token) > 10
        else f"[too_short: {len(access_token)} chars]"
    )
    logger.info(
        "DEBUG send_message: platform=%s pageId=%s targetId=%s "
        "token_length=%d token_preview='%s'",
        platform, page_id, target_id, len(access_token), token_preview,
    )

    if platform == "FACEBOOK":
        url = f"{GRAPH_API_BASE}/me/messages"
        payload = {
            "recipient":      {"id": target_id},
            "message":        {"text": text},
            "messaging_type": "RESPONSE",
        }
    else:
        url = f"{GRAPH_API_BASE}/{page_id}/messages"
        payload = {
            "recipient": {"id": target_id},
            "message":   {"text": text},
        }

    params = {"access_token": access_token}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                params=params,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    logger.info(
                        "Message sent: platform=%s pageId=%s targetId=%s",
                        platform, page_id, target_id,
                    )
                else:
                    body = await resp.text()
                    logger.error(
                        "Graph API error: platform=%s pageId=%s targetId=%s "
                        "[HTTP %d]: %s",
                        platform, page_id, target_id, resp.status, body,
                    )
    except Exception as exc:
        logger.error(
            "Send message failed: platform=%s pageId=%s targetId=%s error=%s",
            platform, page_id, target_id, exc,
        )