"""Per-model pricing and a single cost calculator.

Prices are USD per million tokens. Cached input tokens use the 90%
prompt-cache discount.
"""

from __future__ import annotations

from decimal import Decimal

PRICING: dict[str, dict[str, Decimal]] = {
    "claude-haiku-4-5": {
        "input": Decimal("1.00"),
        "output": Decimal("5.00"),
        "cached_input": Decimal("0.10"),
    },
    "claude-sonnet-4-6": {
        "input": Decimal("3.00"),
        "output": Decimal("15.00"),
        "cached_input": Decimal("0.30"),
    },
}


def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cached_input_tokens: int = 0,
) -> Decimal:
    if model not in PRICING:
        return Decimal("0")
    rate = PRICING[model]
    uncached_in = max(0, input_tokens - cached_input_tokens)
    million = Decimal("1000000")
    cost = (
        Decimal(uncached_in) * rate["input"]
        + Decimal(cached_input_tokens) * rate["cached_input"]
        + Decimal(output_tokens) * rate["output"]
    ) / million
    return cost.quantize(Decimal("0.000001"))
