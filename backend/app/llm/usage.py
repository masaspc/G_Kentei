"""Record Claude API usage and enforce the monthly budget."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import ApiUsageLog
from app.llm.pricing import calculate_cost


def _usage_tokens(usage: Any) -> tuple[int, int, int]:
    """Extract (input, output, cached_input) from an Anthropic Usage object."""

    input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
    output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
    cached = int(getattr(usage, "cache_read_input_tokens", 0) or 0)
    # Anthropic counts cache_read separately from input_tokens; combine them
    # so our pricing model treats the full prompt as input with a discount on
    # the cached portion.
    total_input = input_tokens + cached
    return total_input, output_tokens, cached


async def month_to_date_cost(db: AsyncSession) -> Decimal:
    start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    stmt = select(func.coalesce(func.sum(ApiUsageLog.estimated_cost_usd), 0)).where(
        ApiUsageLog.called_at >= start
    )
    total = (await db.execute(stmt)).scalar_one()
    return Decimal(total)


async def is_over_budget(db: AsyncSession) -> bool:
    settings = get_settings()
    spent = await month_to_date_cost(db)
    return spent >= Decimal(str(settings.monthly_api_budget_usd))


async def log_usage(
    db: AsyncSession,
    *,
    model: str,
    purpose: str,
    usage: Any,
) -> Decimal:
    input_tokens, output_tokens, cached = _usage_tokens(usage)
    cost = calculate_cost(model, input_tokens, output_tokens, cached)
    db.add(
        ApiUsageLog(
            model=model,
            purpose=purpose,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_input_tokens=cached,
            estimated_cost_usd=cost,
        )
    )
    await db.commit()
    return cost
