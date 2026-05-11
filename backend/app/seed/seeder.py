"""DB シーダー。backend 起動時に必要な初期データを投入する。"""

from __future__ import annotations

import logging

from sqlalchemy import select

from app.db.models import ReferenceArticle
from app.db.session import SessionLocal
from app.seed.reference_articles import ARTICLES

logger = logging.getLogger(__name__)


async def seed_reference_articles() -> None:
    """参考書記事を投入する。

    タイトル単位で重複チェックし、未登録のもののみ追加する。
    既存記事 (管理画面で編集済みの可能性あり) は上書きしない。
    """
    async with SessionLocal() as session:
        existing = await session.execute(select(ReferenceArticle.title))
        existing_titles = {row[0] for row in existing.all()}

        new_count = 0
        for article in ARTICLES:
            if article["title"] in existing_titles:
                continue
            session.add(
                ReferenceArticle(
                    title=article["title"],
                    syllabus_category=article["syllabus_category"],
                    content=article["content"],
                    order_num=article["order_num"],
                    is_published=True,
                )
            )
            new_count += 1

        if new_count:
            await session.commit()
            logger.info("Seeded %d reference articles", new_count)
        else:
            logger.info("Reference articles already seeded, skipping")
