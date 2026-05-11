from decimal import Decimal

from app.llm.pricing import calculate_cost


def test_haiku_cost() -> None:
    # 500 input + 800 output, no cache
    cost = calculate_cost("claude-haiku-4-5", 500, 800)
    expected = Decimal("0.0005") + Decimal("0.004")  # 500*1/M + 800*5/M
    assert cost == expected.quantize(Decimal("0.000001"))


def test_sonnet_cost() -> None:
    cost = calculate_cost("claude-sonnet-4-6", 2000, 500)
    expected = Decimal("0.006") + Decimal("0.0075")
    assert cost == expected.quantize(Decimal("0.000001"))


def test_cached_input_uses_discount() -> None:
    # 1000 input total, 800 cached → 200 uncached @1/M + 800 cached @0.10/M + 0 out
    cost = calculate_cost("claude-haiku-4-5", 1000, 0, cached_input_tokens=800)
    expected = (Decimal("200") * Decimal("1") + Decimal("800") * Decimal("0.10")) / Decimal(
        "1000000"
    )
    assert cost == expected.quantize(Decimal("0.000001"))


def test_unknown_model_costs_zero() -> None:
    assert calculate_cost("unknown-model", 1000, 1000) == Decimal("0")
