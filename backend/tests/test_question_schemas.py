import pytest
from pydantic import ValidationError

from app.schemas.question import QuestionCreate, QuestionUpdate


def _valid_payload() -> dict:
    return {
        "question_text": "ディープラーニングの活性化関数として代表的なものは？",
        "question_type": "single",
        "choices": ["ReLU", "線形回帰", "k-means", "ID3"],
        "correct_answer": 0,
        "syllabus_category": "機械学習の基礎",
        "difficulty": 2,
    }


def test_create_accepts_valid_payload() -> None:
    question = QuestionCreate(**_valid_payload())
    assert question.question_type == "single"
    assert question.is_active is True
    assert question.tags == []
    assert question.reference_links == []


def test_create_rejects_empty_question_text() -> None:
    payload = _valid_payload()
    payload["question_text"] = ""
    with pytest.raises(ValidationError):
        QuestionCreate(**payload)


def test_create_rejects_invalid_question_type() -> None:
    payload = _valid_payload()
    payload["question_type"] = "essay"
    with pytest.raises(ValidationError):
        QuestionCreate(**payload)


def test_create_rejects_out_of_range_difficulty() -> None:
    payload = _valid_payload()
    payload["difficulty"] = 5
    with pytest.raises(ValidationError):
        QuestionCreate(**payload)


def test_create_accepts_multi_with_list_answer() -> None:
    payload = _valid_payload()
    payload["question_type"] = "multi"
    payload["correct_answer"] = [0, 2]
    question = QuestionCreate(**payload)
    assert question.correct_answer == [0, 2]


def test_update_supports_partial_fields() -> None:
    update = QuestionUpdate(difficulty=3, is_active=False)
    dumped = update.model_dump(exclude_unset=True)
    assert dumped == {"difficulty": 3, "is_active": False}


def test_update_rejects_invalid_difficulty() -> None:
    with pytest.raises(ValidationError):
        QuestionUpdate(difficulty=0)
