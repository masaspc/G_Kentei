from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    question_text: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str] = mapped_column(String(20))
    choices: Mapped[Any] = mapped_column(JSONB)
    correct_answer: Mapped[Any] = mapped_column(JSONB)
    explanation: Mapped[str | None] = mapped_column(Text)
    explanation_source: Mapped[str | None] = mapped_column(String(20))
    reference_links: Mapped[Any] = mapped_column(
        JSONB, server_default="[]"
    )
    syllabus_category: Mapped[str] = mapped_column(String(100), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(100))
    difficulty: Mapped[int] = mapped_column(SmallInteger)
    tags: Mapped[Any] = mapped_column(JSONB, server_default="[]")
    source: Mapped[str | None] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class StudyLog(Base):
    __tablename__ = "study_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("questions.id", ondelete="CASCADE"),
        index=True,
    )
    selected_answer: Mapped[Any] = mapped_column(JSONB)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    response_time_ms: Mapped[int | None] = mapped_column(Integer)
    self_evaluation: Mapped[int | None] = mapped_column(SmallInteger)
    exam_session_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("exam_sessions.id", ondelete="SET NULL"),
        index=True,
    )
    studied_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), index=True
    )


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True)
    )
    total_questions: Mapped[int] = mapped_column(Integer)
    correct_count: Mapped[int | None] = mapped_column(Integer)
    elapsed_seconds: Mapped[int | None] = mapped_column(Integer)


class SrsState(Base):
    __tablename__ = "srs_states"

    question_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("questions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ease_factor: Mapped[float] = mapped_column(Float, server_default="2.5")
    interval_days: Mapped[int] = mapped_column(Integer, server_default="0")
    consecutive_correct: Mapped[int] = mapped_column(Integer, server_default="0")
    next_review_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), index=True
    )


class Bookmark(Base):
    __tablename__ = "bookmarks"

    question_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("questions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )


class Term(Base):
    __tablename__ = "terms"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    term: Mapped[str] = mapped_column(String(200), index=True)
    definition: Mapped[str] = mapped_column(Text)
    syllabus_category: Mapped[str | None] = mapped_column(String(100), index=True)
    tags: Mapped[Any] = mapped_column(JSONB, server_default="[]")
    reference_links: Mapped[Any] = mapped_column(JSONB, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ApiUsageLog(Base):
    __tablename__ = "api_usage_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    model: Mapped[str] = mapped_column(String(50))
    purpose: Mapped[str] = mapped_column(String(50))
    input_tokens: Mapped[int] = mapped_column(Integer)
    output_tokens: Mapped[int] = mapped_column(Integer)
    cached_input_tokens: Mapped[int] = mapped_column(Integer, server_default="0")
    estimated_cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6))
    called_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), index=True
    )
