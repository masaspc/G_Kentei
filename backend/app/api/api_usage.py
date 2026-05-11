from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_admin
from app.config import get_settings
from app.db import get_db
from app.db.models import ApiUsageLog
from app.llm.usage import month_to_date_cost
from app.schemas.api_usage import (
    ApiUsageSummary,
    DailyCost,
    ModelBreakdown,
    PurposeBreakdown,
)

router = APIRouter(prefix="/api-usage", tags=["api-usage"])


@router.get("/summary", response_model=ApiUsageSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_admin),
) -> ApiUsageSummary:
    settings = get_settings()
    budget = Decimal(str(settings.monthly_api_budget_usd))
    month_cost = await month_to_date_cost(db)
    used_ratio = float(month_cost / budget) if budget > 0 else 0.0
    month_start = datetime.now(UTC).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    model_stmt = (
        select(
            ApiUsageLog.model,
            func.count().label("calls"),
            func.coalesce(func.sum(ApiUsageLog.input_tokens), 0).label("in_tok"),
            func.coalesce(func.sum(ApiUsageLog.output_tokens), 0).label("out_tok"),
            func.coalesce(func.sum(ApiUsageLog.cached_input_tokens), 0).label(
                "cached_tok"
            ),
            func.coalesce(func.sum(ApiUsageLog.estimated_cost_usd), 0).label("cost"),
        )
        .where(ApiUsageLog.called_at >= month_start)
        .group_by(ApiUsageLog.model)
        .order_by(ApiUsageLog.model)
    )
    model_rows = (await db.execute(model_stmt)).all()
    by_model = [
        ModelBreakdown(
            model=row.model,
            calls=int(row.calls),
            input_tokens=int(row.in_tok),
            output_tokens=int(row.out_tok),
            cached_input_tokens=int(row.cached_tok),
            cost_usd=Decimal(row.cost),
        )
        for row in model_rows
    ]

    purpose_stmt = (
        select(
            ApiUsageLog.purpose,
            func.count().label("calls"),
            func.coalesce(func.sum(ApiUsageLog.estimated_cost_usd), 0).label("cost"),
        )
        .where(ApiUsageLog.called_at >= month_start)
        .group_by(ApiUsageLog.purpose)
        .order_by(ApiUsageLog.purpose)
    )
    purpose_rows = (await db.execute(purpose_stmt)).all()
    by_purpose = [
        PurposeBreakdown(
            purpose=row.purpose,
            calls=int(row.calls),
            cost_usd=Decimal(row.cost),
        )
        for row in purpose_rows
    ]

    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    daily_stmt = (
        select(
            func.date_trunc("day", ApiUsageLog.called_at).label("day"),
            func.coalesce(func.sum(ApiUsageLog.estimated_cost_usd), 0).label("cost"),
        )
        .where(ApiUsageLog.called_at >= thirty_days_ago)
        .group_by("day")
        .order_by("day")
    )
    daily_rows = (await db.execute(daily_stmt)).all()
    daily_30d = [
        DailyCost(day=row.day.date(), cost_usd=Decimal(row.cost))
        for row in daily_rows
    ]

    return ApiUsageSummary(
        month_cost_usd=month_cost,
        budget_usd=budget,
        budget_used_ratio=used_ratio,
        by_model=by_model,
        by_purpose=by_purpose,
        daily_30d=daily_30d,
    )
