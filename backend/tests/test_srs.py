from app.services.srs import AGAIN, EASY, GOOD, HARD, apply_rating, new_state


def test_again_resets_streak_and_interval() -> None:
    state = new_state(1)
    state.consecutive_correct = 4
    state.interval_days = 30
    state.ease_factor = 2.5
    apply_rating(state, AGAIN)
    assert state.consecutive_correct == 0
    assert state.interval_days == 1
    assert state.ease_factor < 2.5
    assert state.next_review_at is not None


def test_again_floor_for_ease_factor() -> None:
    state = new_state(1)
    state.ease_factor = 1.35
    apply_rating(state, AGAIN)
    assert state.ease_factor == 1.3


def test_good_first_correct_is_one_day() -> None:
    state = new_state(1)
    apply_rating(state, GOOD)
    assert state.interval_days == 1
    assert state.consecutive_correct == 1


def test_good_second_correct_is_six_days() -> None:
    state = new_state(1)
    state.consecutive_correct = 1
    apply_rating(state, GOOD)
    assert state.interval_days == 6
    assert state.consecutive_correct == 2


def test_good_third_uses_ease_factor() -> None:
    state = new_state(1)
    state.consecutive_correct = 2
    state.interval_days = 6
    state.ease_factor = 2.5
    apply_rating(state, GOOD)
    assert state.interval_days == 15  # round(6 * 2.5)


def test_hard_reduces_ease_and_extends_interval() -> None:
    state = new_state(1)
    state.interval_days = 10
    state.ease_factor = 2.5
    apply_rating(state, HARD)
    assert state.ease_factor < 2.5
    assert state.interval_days == 12  # round(10 * 1.2)


def test_easy_increases_ease() -> None:
    state = new_state(1)
    state.consecutive_correct = 2
    state.interval_days = 6
    state.ease_factor = 2.5
    apply_rating(state, EASY)
    assert state.ease_factor > 2.5
    assert state.interval_days > 6
