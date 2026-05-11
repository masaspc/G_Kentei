from app.services.study import is_answer_correct


def test_single_correct() -> None:
    assert is_answer_correct("single", 0, 0) is True


def test_single_wrong() -> None:
    assert is_answer_correct("single", 0, 1) is False


def test_multi_correct_regardless_of_order() -> None:
    assert is_answer_correct("multi", [0, 2], [2, 0]) is True


def test_multi_wrong_when_missing_choice() -> None:
    assert is_answer_correct("multi", [0, 2], [0]) is False


def test_multi_handles_empty_correct() -> None:
    assert is_answer_correct("multi", [], []) is True


def test_true_false_correct() -> None:
    assert is_answer_correct("true_false", True, True) is True
    assert is_answer_correct("true_false", False, True) is False


def test_fill_blank_case_insensitive() -> None:
    assert is_answer_correct("fill_blank", "ReLU", "relu") is True
    assert is_answer_correct("fill_blank", "ReLU", "  relu  ") is True


def test_fill_blank_wrong() -> None:
    assert is_answer_correct("fill_blank", "ReLU", "sigmoid") is False
