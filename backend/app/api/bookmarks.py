from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_user
from app.db import get_db
from app.db.models import Bookmark, Question

router = APIRouter(tags=["bookmarks"])


@router.get("/bookmarks/ids", response_model=list[int])
async def list_bookmark_ids(
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> list[int]:
    rows = (
        await db.execute(
            select(Bookmark.question_id).where(Bookmark.user_id == user.id)
        )
    ).scalars().all()
    return list(rows)


@router.post(
    "/questions/{question_id}/bookmark",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def add_bookmark(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> None:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    existing = await db.get(Bookmark, (user.id, question_id))
    if existing is None:
        db.add(Bookmark(user_id=user.id, question_id=question_id))
        await db.commit()


@router.delete(
    "/questions/{question_id}/bookmark",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_bookmark(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> None:
    existing = await db.get(Bookmark, (user.id, question_id))
    if existing is not None:
        await db.delete(existing)
        await db.commit()
