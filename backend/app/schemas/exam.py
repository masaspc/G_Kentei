from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExamQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    question_type: str
    choices: list[Any]
    syllabus_category: str
    subcategory: str | None
    difficulty: int


class ExamStartRequest(BaseModel):
    total_questions: int = Field(default=145, ge=1, le=200)


class ExamStartResponse(BaseModel):
    exam_session_id: int
    started_at: datetime
    time_limit_seconds: int = 100 * 60
    items: list[ExamQuestion]


class ExamAnswer(BaseModel):
    question_id: int
    selected_answer: Any | None = None
    response_time_ms: int | None = Field(default=None, ge=0)


class ExamSubmitRequest(BaseModel):
    exam_session_id: int
    answers: list[ExamAnswer]
    elapsed_seconds: int = Field(ge=0)


class ExamCategoryBreakdown(BaseModel):
    category: str
    attempts: int
    correct: int


class ExamResultItem(BaseModel):
    question_id: int
    question_text: str
    syllabus_category: str
    difficulty: int
    is_correct: bool
    selected_answer: Any
    correct_answer: Any
    explanation: str | None
    response_time_ms: int | None


class ExamResult(BaseModel):
    exam_session_id: int
    started_at: datetime
    completed_at: datetime
    total_questions: int
    correct_count: int
    accuracy: float
    elapsed_seconds: int
    by_category: list[ExamCategoryBreakdown]
    items: list[ExamResultItem]
