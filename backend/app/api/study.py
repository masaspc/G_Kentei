from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import Question, StudyLog
from app.schemas.study import (
    PracticeQuestion,
    StudyAnswerRequest,
    StudyAnswerResponse,
    StudySessionRequest,
    StudySessionResponse,
)
from app.services.study import is_answer_correct

router = APIRouter(prefix="/study", tags=["study"])


@router.post("/session", response_model=StudySessionResponse)
async def start_session(
    payload: StudySessionRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StudySessionResponse:
    stmt = select(Question).where(Question.is_active.is_(True))
    if payload.category:
        stmt = stmt.where(Question.syllabus_category == payload.category)
    if payload.difficulty is not None:
        stmt = stmt.where(Question.difficulty == payload.difficulty)
    if payload.condition == "unanswered":
        answered = select(StudyLog.question_id).distinct()
        stmt = stmt.where(~Question.id.in_(answered))

    stmt = stmt.order_by(func.random()).limit(payload.limit)
    rows = (await db.execute(stmt)).scalars().all()

    return StudySessionResponse(
        items=[PracticeQuestion.model_validate(row) for row in rows]
    )


@router.post("/answer", response_model=StudyAnswerResponse)
async def submit_answer(
    payload: StudyAnswerRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> StudyAnswerResponse:
    question = await db.get(Question, payload.question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    correct = is_answer_correct(
        question.question_type, question.correct_answer, payload.selected_answer
    )

    db.add(
        StudyLog(
            question_id=question.id,
            selected_answer=payload.selected_answer,
            is_correct=correct,
            response_time_ms=payload.response_time_ms,
        )
    )
    await db.commit()

    return StudyAnswerResponse(
        is_correct=correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        reference_links=list(question.reference_links or []),
    )
