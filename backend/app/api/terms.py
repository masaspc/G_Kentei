from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_admin, get_current_user
from app.db import get_db
from app.db.models import Term
from app.schemas.term import (
    TermCreate,
    TermListResponse,
    TermRead,
    TermUpdate,
)

router = APIRouter(prefix="/terms", tags=["terms"])


@router.get("", response_model=TermListResponse)
async def list_terms(
    search: str | None = Query(default=None),
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> TermListResponse:
    stmt = select(Term)
    if category:
        stmt = stmt.where(Term.syllabus_category == category)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(Term.term.ilike(pattern), Term.definition.ilike(pattern))
        )

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    rows = (await db.execute(stmt.order_by(Term.term))).scalars().all()
    return TermListResponse(
        items=[TermRead.model_validate(row) for row in rows], total=int(total)
    )


@router.post("", response_model=TermRead, status_code=status.HTTP_201_CREATED)
async def create_term(
    payload: TermCreate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_admin),
) -> Term:
    term = Term(**payload.model_dump())
    db.add(term)
    await db.commit()
    await db.refresh(term)
    return term


@router.get("/{term_id}", response_model=TermRead)
async def get_term(
    term_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> Term:
    term = await db.get(Term, term_id)
    if term is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Term not found")
    return term


@router.patch("/{term_id}", response_model=TermRead)
async def update_term(
    term_id: int,
    payload: TermUpdate,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_admin),
) -> Term:
    term = await db.get(Term, term_id)
    if term is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Term not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(term, key, value)
    await db.commit()
    await db.refresh(term)
    return term


@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    term_id: int,
    db: AsyncSession = Depends(get_db),
    _: UserContext = Depends(get_current_admin),
) -> None:
    term = await db.get(Term, term_id)
    if term is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Term not found")
    await db.delete(term)
    await db.commit()
