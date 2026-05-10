"""CSV export endpoints.

Datasets are personal-scale; we fetch then stream rather than truly
streaming from the DB cursor. UTF-8 with BOM keeps Excel happy.
"""

from __future__ import annotations

import csv
import io
import json
from collections.abc import Iterable, Iterator
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import (
    ApiUsageLog,
    ExamSession,
    Question,
    QuestionNote,
    SrsState,
    StudyLog,
    Term,
)

router = APIRouter(prefix="/export", tags=["export"])


def _to_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list | dict):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _csv_response(
    headers: list[str],
    rows: Iterable[list[Any]],
    filename: str,
) -> StreamingResponse:
    def generate() -> Iterator[bytes]:
        # UTF-8 BOM so Excel opens it correctly
        yield b"\xef\xbb\xbf"
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        yield buffer.getvalue().encode("utf-8")
        buffer.seek(0)
        buffer.truncate(0)
        for row in rows:
            writer.writerow([_to_cell(c) for c in row])
            yield buffer.getvalue().encode("utf-8")
            buffer.seek(0)
            buffer.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/study-logs.csv")
async def export_study_logs(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(StudyLog).order_by(StudyLog.studied_at))
    ).scalars().all()
    return _csv_response(
        headers=[
            "id",
            "question_id",
            "selected_answer",
            "is_correct",
            "response_time_ms",
            "self_evaluation",
            "exam_session_id",
            "studied_at",
        ],
        rows=(
            [
                r.id,
                r.question_id,
                r.selected_answer,
                r.is_correct,
                r.response_time_ms,
                r.self_evaluation,
                r.exam_session_id,
                r.studied_at.isoformat(),
            ]
            for r in rows
        ),
        filename="study_logs.csv",
    )


@router.get("/srs-states.csv")
async def export_srs_states(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(SrsState).order_by(SrsState.question_id))
    ).scalars().all()
    return _csv_response(
        headers=[
            "question_id",
            "ease_factor",
            "interval_days",
            "consecutive_correct",
            "next_review_at",
        ],
        rows=(
            [
                r.question_id,
                r.ease_factor,
                r.interval_days,
                r.consecutive_correct,
                r.next_review_at.isoformat() if r.next_review_at else None,
            ]
            for r in rows
        ),
        filename="srs_states.csv",
    )


@router.get("/questions.csv")
async def export_questions(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(Question).order_by(Question.id))
    ).scalars().all()
    return _csv_response(
        headers=[
            "id",
            "question_text",
            "question_type",
            "choices",
            "correct_answer",
            "explanation",
            "explanation_source",
            "reference_links",
            "syllabus_category",
            "subcategory",
            "difficulty",
            "tags",
            "source",
            "is_active",
            "created_at",
        ],
        rows=(
            [
                r.id,
                r.question_text,
                r.question_type,
                r.choices,
                r.correct_answer,
                r.explanation,
                r.explanation_source,
                r.reference_links,
                r.syllabus_category,
                r.subcategory,
                r.difficulty,
                r.tags,
                r.source,
                r.is_active,
                r.created_at.isoformat(),
            ]
            for r in rows
        ),
        filename="questions.csv",
    )


@router.get("/terms.csv")
async def export_terms(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(Term).order_by(Term.id))
    ).scalars().all()
    return _csv_response(
        headers=[
            "id",
            "term",
            "definition",
            "syllabus_category",
            "tags",
            "reference_links",
            "created_at",
        ],
        rows=(
            [
                r.id,
                r.term,
                r.definition,
                r.syllabus_category,
                r.tags,
                r.reference_links,
                r.created_at.isoformat(),
            ]
            for r in rows
        ),
        filename="terms.csv",
    )


@router.get("/api-usage.csv")
async def export_api_usage(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(ApiUsageLog).order_by(ApiUsageLog.called_at))
    ).scalars().all()
    return _csv_response(
        headers=[
            "id",
            "model",
            "purpose",
            "input_tokens",
            "output_tokens",
            "cached_input_tokens",
            "estimated_cost_usd",
            "called_at",
        ],
        rows=(
            [
                r.id,
                r.model,
                r.purpose,
                r.input_tokens,
                r.output_tokens,
                r.cached_input_tokens,
                str(r.estimated_cost_usd),
                r.called_at.isoformat(),
            ]
            for r in rows
        ),
        filename="api_usage.csv",
    )


@router.get("/exam-sessions.csv")
async def export_exam_sessions(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(ExamSession).order_by(ExamSession.id))
    ).scalars().all()
    return _csv_response(
        headers=[
            "id",
            "started_at",
            "completed_at",
            "total_questions",
            "correct_count",
            "elapsed_seconds",
        ],
        rows=(
            [
                r.id,
                r.started_at.isoformat(),
                r.completed_at.isoformat() if r.completed_at else None,
                r.total_questions,
                r.correct_count,
                r.elapsed_seconds,
            ]
            for r in rows
        ),
        filename="exam_sessions.csv",
    )


@router.get("/question-notes.csv")
async def export_question_notes(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StreamingResponse:
    rows = (
        await db.execute(select(QuestionNote).order_by(QuestionNote.question_id))
    ).scalars().all()
    return _csv_response(
        headers=["question_id", "note", "updated_at"],
        rows=(
            [r.question_id, r.note, r.updated_at.isoformat()] for r in rows
        ),
        filename="question_notes.csv",
    )
