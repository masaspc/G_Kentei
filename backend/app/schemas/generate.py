from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.question import QuestionType


class GenerateQuestionRequest(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    difficulty: int = Field(default=2, ge=1, le=3)
    question_type: QuestionType = "single"


class GenerateQuestionResponse(BaseModel):
    question_text: str
    question_type: Literal["single", "multi", "true_false", "fill_blank"]
    choices: list[str]
    correct_answer: Any
    explanation: str
    tags: list[str]
