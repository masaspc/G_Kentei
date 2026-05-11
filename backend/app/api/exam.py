from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_user
from app.db import get_db
from app.db.models import ExamSession, Question, StudyLog
from app.schemas.exam import (
    ExamCategoryBreakdown,
    ExamQuestion,
    ExamResult,
    ExamResultItem,
    ExamStartRequest,
    ExamStartResponse,
    ExamSubmitRequest,
)
from app.services.study import is_answer_correct

router = APIRouter(prefix="/exam", tags=["exam"])


@router.post("/start", response_model=ExamStartResponse)
async def start_exam(
    payload: ExamStartRequest,
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> ExamStartResponse:
    stmt = (
        select(Question)
        .where(Question.is_active.is_(True))
        .order_by(func.random())
        .limit(payload.total_questions)
    )
    questions = (await db.execute(stmt)).scalars().all()
    if not questions:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No active questions available for the exam",
        )

    session = ExamSession(user_id=user.id, total_questions=len(questions))
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return ExamStartResponse(
        exam_session_id=session.id,
        started_at=session.started_at,
        items=[ExamQuestion.model_validate(q) for q in questions],
    )


@router.post("/submit", response_model=ExamResult)
async def submit_exam(
    payload: ExamSubmitRequest,
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> ExamResult:
    session = await db.get(ExamSession, payload.exam_session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam session not found")
    if session.completed_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Exam already submitted"
        )

    question_ids = [a.question_id for a in payload.answers]
    if not question_ids:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "No answers provided"
        )

    questions_stmt = select(Question).where(Question.id.in_(question_ids))
    questions = (await db.execute(questions_stmt)).scalars().all()
    by_id = {q.id: q for q in questions}

    correct_count = 0
    for answer in payload.answers:
        q = by_id.get(answer.question_id)
        if q is None:
            continue
        correct = answer.selected_answer is not None and is_answer_correct(
            q.question_type, q.correct_answer, answer.selected_answer
        )
        if correct:
            correct_count += 1
        db.add(
            StudyLog(
                user_id=user.id,
                question_id=q.id,
                selected_answer=answer.selected_answer,
                is_correct=correct,
                response_time_ms=answer.response_time_ms,
                exam_session_id=session.id,
            )
        )

    session.completed_at = datetime.now(UTC)
    session.correct_count = correct_count
    session.elapsed_seconds = payload.elapsed_seconds
    await db.commit()

    return await _build_result(db, session.id)


@router.get("/{exam_session_id}/result", response_model=ExamResult)
async def get_result(
    exam_session_id: int,
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> ExamResult:
    session = await db.get(ExamSession, exam_session_id)
    if (
        session is None
        or session.user_id != user.id
        or session.completed_at is None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam result not available")
    return await _build_result(db, exam_session_id)


async def _build_result(db: AsyncSession, exam_session_id: int) -> ExamResult:
    session = await db.get(ExamSession, exam_session_id)
    assert session is not None and session.completed_at is not None

    rows_stmt = (
        select(StudyLog, Question)
        .join(Question, StudyLog.question_id == Question.id)
        .where(StudyLog.exam_session_id == exam_session_id)
        .order_by(StudyLog.id)
    )
    rows = (await db.execute(rows_stmt)).all()

    items = [
        ExamResultItem(
            question_id=q.id,
            question_text=q.question_text,
            syllabus_category=q.syllabus_category,
            difficulty=q.difficulty,
            is_correct=log.is_correct,
            selected_answer=log.selected_answer,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            response_time_ms=log.response_time_ms,
        )
        for log, q in rows
    ]

    cat_buckets: dict[str, tuple[int, int]] = {}
    for item in items:
        a, c = cat_buckets.get(item.syllabus_category, (0, 0))
        cat_buckets[item.syllabus_category] = (
            a + 1,
            c + (1 if item.is_correct else 0),
        )
    by_category = [
        ExamCategoryBreakdown(category=cat, attempts=a, correct=c)
        for cat, (a, c) in sorted(cat_buckets.items())
    ]

    total = session.total_questions
    correct = session.correct_count or 0
    accuracy = correct / total if total > 0 else 0.0

    return ExamResult(
        exam_session_id=session.id,
        started_at=session.started_at,
        completed_at=session.completed_at,
        total_questions=total,
        correct_count=correct,
        accuracy=accuracy,
        elapsed_seconds=session.elapsed_seconds or 0,
        by_category=by_category,
        items=items,
    )
