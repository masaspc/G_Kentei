from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

QuestionType = Literal["single", "multi", "true_false", "fill_blank"]
ExplanationSource = Literal["manual", "claude_haiku", "claude_sonnet"]


class QuestionBase(BaseModel):
    question_text: str = Field(min_length=1)
    question_type: QuestionType
    choices: list[Any] = Field(default_factory=list)
    correct_answer: Any
    explanation: str | None = None
    explanation_source: ExplanationSource | None = None
    reference_links: list[str] = Field(default_factory=list)
    syllabus_category: str = Field(min_length=1, max_length=100)
    subcategory: str | None = Field(default=None, max_length=100)
    difficulty: int = Field(ge=1, le=3)
    tags: list[str] = Field(default_factory=list)
    source: str | None = Field(default=None, max_length=200)
    is_active: bool = True


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    question_type: QuestionType | None = None
    choices: list[Any] | None = None
    correct_answer: Any | None = None
    explanation: str | None = None
    explanation_source: ExplanationSource | None = None
    reference_links: list[str] | None = None
    syllabus_category: str | None = Field(default=None, min_length=1, max_length=100)
    subcategory: str | None = Field(default=None, max_length=100)
    difficulty: int | None = Field(default=None, ge=1, le=3)
    tags: list[str] | None = None
    source: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class QuestionRead(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class QuestionListResponse(BaseModel):
    items: list[QuestionRead]
    total: int
    page: int
    page_size: int


class ImportError(BaseModel):
    row: int
    message: str


class ImportResult(BaseModel):
    success: int
    failed: int
    errors: list[ImportError]
