"""Discord webhook notification sender."""

from __future__ import annotations

import httpx

from app.config import get_settings


async def send_discord(message: str) -> bool:
    """Post a message to the configured Discord webhook. Returns True on success."""
    settings = get_settings()
    url = settings.discord_webhook_url
    if not url:
        return False

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json={"content": message})
        return resp.status_code in (200, 204)
