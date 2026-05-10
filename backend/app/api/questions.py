from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import Question
from app.schemas.question import (
    QuestionCreate,
    QuestionListResponse,
    QuestionRead,
    QuestionUpdate,
)

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=QuestionListResponse)
async def list_questions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    difficulty: int | None = Query(None, ge=1, le=3),
    is_active: bool | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> QuestionListResponse:
    stmt = select(Question)
    if category:
        stmt = stmt.where(Question.syllabus_category == category)
    if difficulty is not None:
        stmt = stmt.where(Question.difficulty == difficulty)
    if is_active is not None:
        stmt = stmt.where(Question.is_active == is_active)
    if search:
        stmt = stmt.where(Question.question_text.ilike(f"%{search}%"))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    items_stmt = (
        stmt.order_by(Question.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(items_stmt)).scalars().all()

    return QuestionListResponse(
        items=[QuestionRead.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = Question(**payload.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.get("/{question_id}", response_model=QuestionRead)
async def get_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return question


@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Question:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, key, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> None:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    await db.delete(question)
    await db.commit()
