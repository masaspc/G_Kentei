"""DB シーダー。backend 起動時に必要な初期データを投入する。"""

from __future__ import annotations

import logging

from sqlalchemy import select

from app.config import get_settings
from app.db.models import Question, ReferenceArticle, User
from app.db.session import SessionLocal
from app.seed.reference_articles import ARTICLES
from app.seed.seed_questions import QUESTIONS, SEED_SOURCE

logger = logging.getLogger(__name__)


async def bootstrap_admin() -> None:
    """env の AUTH_USERNAME / AUTH_PASSWORD_HASH を反映する。

    - admin (id=1) が __bootstrap__ なら env から確定パスワードに更新
    - admin ユーザーが存在しなければ作成
    """
    settings = get_settings()
    async with SessionLocal() as session:
        admin = (
            await session.execute(select(User).where(User.role == "admin"))
        ).scalars().first()

        if admin is None:
            if not settings.auth_password_hash:
                logger.warning(
                    "No admin user and AUTH_PASSWORD_HASH is empty; "
                    "login will be impossible until one is created"
                )
                return
            admin = User(
                username=settings.auth_username or "admin",
                password_hash=settings.auth_password_hash,
                role="admin",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            logger.info("Bootstrapped admin user %s", admin.username)
            return

        if admin.password_hash == "__bootstrap__":
            if not settings.auth_password_hash:
                logger.warning(
                    "Admin user has placeholder password and "
                    "AUTH_PASSWORD_HASH is empty; login is impossible"
                )
                return
            admin.username = settings.auth_username or admin.username
            admin.password_hash = settings.auth_password_hash
            await session.commit()
            logger.info("Initialized admin password for %s", admin.username)


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


async def seed_questions() -> None:
    """シラバス準拠の問題を投入する。

    question_text 単位で重複チェックし、未登録のもののみ追加する。
    """
    async with SessionLocal() as session:
        existing = await session.execute(select(Question.question_text))
        existing_texts = {row[0] for row in existing.all()}

        new_count = 0
        for q in QUESTIONS:
            if q["question_text"] in existing_texts:
                continue
            session.add(
                Question(
                    question_text=q["question_text"],
                    question_type=q["question_type"],
                    choices=q.get("choices", []),
                    correct_answer=q["correct_answer"],
                    explanation=q.get("explanation"),
                    explanation_source="manual",
                    reference_links=[],
                    syllabus_category=q["syllabus_category"],
                    subcategory=q.get("subcategory"),
                    difficulty=q.get("difficulty", 1),
                    tags=q.get("tags", []),
                    source=SEED_SOURCE,
                    is_active=True,
                )
            )
            new_count += 1

        if new_count:
            await session.commit()
            logger.info("Seeded %d questions", new_count)
        else:
            logger.info("Questions already seeded, skipping")

