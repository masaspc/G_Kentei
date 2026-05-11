"""Anki-style 4-level rating applied to an SM-2 derived state machine."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.db.models import SrsState

AGAIN = 0
HARD = 1
GOOD = 2
EASY = 3


def new_state(question_id: int, *, user_id: int) -> SrsState:
    return SrsState(
        user_id=user_id,
        question_id=question_id,
        ease_factor=2.5,
        interval_days=0,
        consecutive_correct=0,
    )


def apply_rating(state: SrsState, rating: int) -> None:
    """Mutate `state` based on the user's self-evaluation (0..3)."""

    if rating == AGAIN:
        state.ease_factor = max(1.3, state.ease_factor - 0.2)
        state.consecutive_correct = 0
        state.interval_days = 1
    elif rating == HARD:
        state.ease_factor = max(1.3, state.ease_factor - 0.15)
        base = max(state.interval_days, 1)
        state.interval_days = max(1, round(base * 1.2))
        state.consecutive_correct += 1
    elif rating == GOOD:
        if state.consecutive_correct == 0:
            state.interval_days = 1
        elif state.consecutive_correct == 1:
            state.interval_days = 6
        else:
            base = max(state.interval_days, 1)
            state.interval_days = max(1, round(base * state.ease_factor))
        state.consecutive_correct += 1
    elif rating == EASY:
        state.ease_factor += 0.15
        if state.consecutive_correct == 0:
            state.interval_days = 4
        else:
            base = max(state.interval_days, 1)
            state.interval_days = max(
                1, round(base * state.ease_factor * 1.3)
            )
        state.consecutive_correct += 1
    else:
        raise ValueError(f"Invalid rating: {rating}")

    state.next_review_at = datetime.now(UTC) + timedelta(days=state.interval_days)
