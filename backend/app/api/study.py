from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import Bookmark, Question, SrsState, StudyLog
from app.schemas.study import (
    DueCountResponse,
    EvaluateRequest,
    EvaluateResponse,
    PracticeQuestion,
    StudyAnswerRequest,
    StudyAnswerResponse,
    StudySessionRequest,
    StudySessionResponse,
)
from app.services.srs import apply_rating, new_state
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
    elif payload.condition == "srs_due":
        due = select(SrsState.question_id).where(
            SrsState.next_review_at <= func.now()
        )
        stmt = stmt.where(Question.id.in_(due))
    elif payload.condition == "bookmarked":
        bookmarked = select(Bookmark.question_id)
        stmt = stmt.where(Question.id.in_(bookmarked))

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

    log = StudyLog(
        question_id=question.id,
        selected_answer=payload.selected_answer,
        is_correct=correct,
        response_time_ms=payload.response_time_ms,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return StudyAnswerResponse(
        study_log_id=log.id,
        is_correct=correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        reference_links=list(question.reference_links or []),
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_question(
    payload: EvaluateRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> EvaluateResponse:
    question = await db.get(Question, payload.question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    state = await db.get(SrsState, payload.question_id)
    if state is None:
        state = new_state(payload.question_id)
        db.add(state)

    apply_rating(state, payload.self_evaluation)

    if payload.study_log_id is not None:
        log = await db.get(StudyLog, payload.study_log_id)
        if log is not None and log.question_id == payload.question_id:
            log.self_evaluation = payload.self_evaluation

    await db.commit()
    return EvaluateResponse(next_review_in_days=state.interval_days)


@router.get("/srs/due-count", response_model=DueCountResponse)
async def get_due_count(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> DueCountResponse:
    stmt = (
        select(func.count())
        .select_from(SrsState)
        .where(SrsState.next_review_at <= func.now())
    )
    count = (await db.execute(stmt)).scalar_one()
    return DueCountResponse(due_count=int(count))
