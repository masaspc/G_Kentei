from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SessionCondition = Literal["all", "unanswered"]


class StudySessionRequest(BaseModel):
    category: str | None = None
    difficulty: int | None = Field(default=None, ge=1, le=3)
    condition: SessionCondition = "all"
    limit: int = Field(default=20, ge=1, le=200)


class PracticeQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    question_type: str
    choices: list[Any]
    syllabus_category: str
    subcategory: str | None
    difficulty: int


class StudySessionResponse(BaseModel):
    items: list[PracticeQuestion]


class StudyAnswerRequest(BaseModel):
    question_id: int
    selected_answer: Any
    response_time_ms: int | None = Field(default=None, ge=0)


class StudyAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: Any
    explanation: str | None
    reference_links: list[str]
