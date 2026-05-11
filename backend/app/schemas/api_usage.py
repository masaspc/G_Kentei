from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ModelBreakdown(BaseModel):
    model: str
    calls: int
    input_tokens: int
    output_tokens: int
    cached_input_tokens: int
    cost_usd: Decimal


class PurposeBreakdown(BaseModel):
    purpose: str
    calls: int
    cost_usd: Decimal


class DailyCost(BaseModel):
    day: date
    cost_usd: Decimal


class ApiUsageSummary(BaseModel):
    month_cost_usd: Decimal
    budget_usd: Decimal
    budget_used_ratio: float
    by_model: list[ModelBreakdown]
    by_purpose: list[PurposeBreakdown]
    daily_30d: list[DailyCost]
