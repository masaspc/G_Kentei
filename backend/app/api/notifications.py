"""F-15: Notification endpoints.

- POST /api/notifications/daily-summary  — webhook-secret auth, sends Discord summary
- POST /api/notifications/test           — JWT auth, sends a test ping to Discord
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_admin
from app.config import get_settings
from app.db import get_db
from app.db.models import SrsState, StudyLog
from app.services.notifications import send_discord

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _verify_webhook_secret(x_webhook_secret: str | None = Header(default=None)) -> None:
    settings = get_settings()
    expected = settings.notification_webhook_secret
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Webhook secret not configured",
        )
    if not x_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Webhook-Secret header",
        )
    if not hmac.compare_digest(
        hashlib.sha256(x_webhook_secret.encode()).digest(),
        hashlib.sha256(expected.encode()).digest(),
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook secret",
        )


@router.post("/daily-summary", status_code=status.HTTP_204_NO_CONTENT)
async def daily_summary(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_webhook_secret),
) -> None:
    """Build and send a daily study summary to Discord."""
    settings = get_settings()
    if not settings.discord_webhook_url:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="DISCORD_WEBHOOK_URL not configured",
        )

    today_utc = datetime.now(UTC).date()
    yesterday = today_utc - timedelta(days=1)

    row = (
        await db.execute(
            select(
                func.count().label("attempts"),
                func.coalesce(
                    func.sum(case((StudyLog.is_correct.is_(True), 1), else_=0)), 0
                ).label("correct"),
            ).where(
                func.date_trunc("day", StudyLog.studied_at) == yesterday
            )
        )
    ).one()

    attempts = int(row.attempts)
    correct = int(row.correct)
    accuracy = correct / attempts * 100 if attempts > 0 else 0.0

    due_count = int(
        (
            await db.execute(
                select(func.count())
                .select_from(SrsState)
                .where(SrsState.next_review_at <= func.now())
            )
        ).scalar_one()
    )

    lines = [
        f"**G検定 日次レポート ({yesterday})**",
        f"昨日の演習: {attempts} 問 / 正解 {correct} 問 ({accuracy:.1f}%)",
        f"本日のSRS復習待ち: {due_count} 問",
    ]
    if attempts == 0:
        lines.append("昨日は学習がありませんでした。今日こそ頑張りましょう！")

    sent = await send_discord("\n".join(lines))
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send Discord notification",
        )


@router.post("/test", status_code=status.HTTP_204_NO_CONTENT)
async def test_notification(
    _: UserContext = Depends(get_current_admin),
) -> None:
    """Send a test ping to Discord (JWT auth)."""
    settings = get_settings()
    if not settings.discord_webhook_url:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="DISCORD_WEBHOOK_URL not configured",
        )

    sent = await send_discord("G検定サイトからのテスト通知です :white_check_mark:")
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send Discord notification",
        )
