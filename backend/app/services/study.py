"""Answer correctness logic for the practice loop."""

from __future__ import annotations

from typing import Any


def _normalize_multi(value: Any) -> list[Any] | None:
    if value is None:
        return []
    if isinstance(value, list):
        try:
            return sorted(value)
        except TypeError:
            return value
    return None


def is_answer_correct(
    question_type: str, correct: Any, selected: Any
) -> bool:
    """Compare a user's answer against the correct answer for a question."""

    if question_type == "multi":
        norm_correct = _normalize_multi(correct)
        norm_selected = _normalize_multi(selected)
        if norm_correct is None or norm_selected is None:
            return correct == selected
        return norm_correct == norm_selected

    if question_type == "fill_blank":
        if isinstance(correct, str) and isinstance(selected, str):
            return correct.strip().casefold() == selected.strip().casefold()
        return correct == selected

    return correct == selected
