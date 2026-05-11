"""参考書コーナー (Reference Articles) API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db import get_db
from app.db.models import ReferenceArticle
from app.llm.article import generate_article
from app.llm.usage import is_over_budget, log_usage
from app.schemas.reference import (
    ReferenceArticleDetail,
    ReferenceArticleInput,
    ReferenceArticleSummary,
)

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("", response_model=list[ReferenceArticleSummary])
async def list_published_articles(
    db: AsyncSession = Depends(get_db),
) -> list[ReferenceArticle]:
    stmt = (
        select(ReferenceArticle)
        .where(ReferenceArticle.is_published.is_(True))
        .order_by(ReferenceArticle.syllabus_category, ReferenceArticle.order_num)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


# IMPORTANT: /admin must be declared before /{id} to avoid routing conflict.
@router.get("/admin", response_model=list[ReferenceArticleDetail])
async def list_all_articles(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[ReferenceArticle]:
    stmt = select(ReferenceArticle).order_by(
        ReferenceArticle.syllabus_category, ReferenceArticle.order_num
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


@router.get("/{article_id}", response_model=ReferenceArticleDetail)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
) -> ReferenceArticle:
    article = await db.get(ReferenceArticle, article_id)
    if article is None or not article.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    return article


@router.post("", response_model=ReferenceArticleDetail, status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: ReferenceArticleInput,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> ReferenceArticle:
    article = ReferenceArticle(**payload.model_dump())
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return article


@router.patch("/{article_id}", response_model=ReferenceArticleDetail)
async def update_article(
    article_id: int,
    payload: ReferenceArticleInput,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> ReferenceArticle:
    article = await db.get(ReferenceArticle, article_id)
    if article is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(article, key, value)
    await db.commit()
    await db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> None:
    article = await db.get(ReferenceArticle, article_id)
    if article is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    await db.delete(article)
    await db.commit()


@router.post("/{article_id}/generate", response_model=ReferenceArticleDetail)
async def generate_article_content(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> ReferenceArticle:
    settings = get_settings()

    if not settings.anthropic_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Anthropic API key is not configured",
        )

    if await is_over_budget(db):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Monthly API budget exceeded",
        )

    article = await db.get(ReferenceArticle, article_id)
    if article is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")

    content, usage = await generate_article(
        title=article.title,
        syllabus_category=article.syllabus_category,
    )

    await log_usage(
        db,
        model=settings.anthropic_sonnet_model,
        purpose="article_generation",
        usage=usage,
    )

    article.content = content
    await db.commit()
    await db.refresh(article)
    return article
