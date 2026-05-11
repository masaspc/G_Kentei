from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import UserContext, get_current_user
from app.db import get_db
from app.db.models import Question, SrsState, StudyLog
from app.schemas.stats import (
    CategoryAccuracy,
    DailyCount,
    DashboardStats,
    HeatmapCell,
    HeatmapResponse,
    ProgressPoint,
    ProgressResponse,
)

router = APIRouter(prefix="/stats", tags=["stats"])


def _accuracy(correct: int, attempts: int) -> float:
    return correct / attempts if attempts > 0 else 0.0


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> DashboardStats:
    total_questions = int(
        (await db.execute(select(func.count()).select_from(Question))).scalar_one()
    )

    overall = (
        await db.execute(
            select(
                func.count().label("attempts"),
                func.coalesce(
                    func.sum(case((StudyLog.is_correct.is_(True), 1), else_=0)), 0
                ).label("correct"),
            ).where(StudyLog.user_id == user.id)
        )
    ).one()
    total_attempts = int(overall.attempts)
    total_correct = int(overall.correct)

    today_utc = datetime.now(UTC).date()
    week_start = today_utc - timedelta(days=6)

    day_col = func.date_trunc("day", StudyLog.studied_at).label("day")
    daily_stmt = (
        select(
            day_col,
            func.count().label("attempts"),
            func.coalesce(
                func.sum(case((StudyLog.is_correct.is_(True), 1), else_=0)), 0
            ).label("correct"),
        )
        .where(StudyLog.user_id == user.id, StudyLog.studied_at >= week_start)
        .group_by(day_col)
        .order_by(day_col)
    )
    daily_rows = (await db.execute(daily_stmt)).all()
    daily_7d = [
        DailyCount(
            day=row.day.date(),
            attempts=int(row.attempts),
            correct=int(row.correct),
        )
        for row in daily_rows
    ]

    weak_stmt = (
        select(
            Question.syllabus_category.label("category"),
            func.count().label("attempts"),
            func.coalesce(
                func.sum(case((StudyLog.is_correct.is_(True), 1), else_=0)), 0
            ).label("correct"),
        )
        .join(StudyLog, StudyLog.question_id == Question.id)
        .where(StudyLog.user_id == user.id)
        .group_by(Question.syllabus_category)
        .having(func.count() >= 3)
    )
    weak_rows = (await db.execute(weak_stmt)).all()
    categories = [
        CategoryAccuracy(
            category=row.category,
            attempts=int(row.attempts),
            correct=int(row.correct),
            accuracy=_accuracy(int(row.correct), int(row.attempts)),
        )
        for row in weak_rows
    ]
    weak_categories = sorted(categories, key=lambda c: c.accuracy)[:3]

    streak_days = await _streak_days(db, today_utc, user.id)

    due_today = int(
        (
            await db.execute(
                select(func.count())
                .select_from(SrsState)
                .where(
                    SrsState.user_id == user.id,
                    SrsState.next_review_at <= func.now(),
                )
            )
        ).scalar_one()
    )

    return DashboardStats(
        total_questions=total_questions,
        total_attempts=total_attempts,
        overall_accuracy=_accuracy(total_correct, total_attempts),
        streak_days=streak_days,
        due_today=due_today,
        daily_7d=daily_7d,
        weak_categories=weak_categories,
    )


@router.get("/heatmap", response_model=HeatmapResponse)
async def heatmap(
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> HeatmapResponse:
    stmt = (
        select(
            Question.syllabus_category.label("category"),
            Question.difficulty.label("difficulty"),
            func.count().label("attempts"),
            func.coalesce(
                func.sum(case((StudyLog.is_correct.is_(True), 1), else_=0)), 0
            ).label("correct"),
        )
        .join(StudyLog, StudyLog.question_id == Question.id)
        .where(StudyLog.user_id == user.id)
        .group_by(Question.syllabus_category, Question.difficulty)
        .order_by(Question.syllabus_category, Question.difficulty)
    )
    rows = (await db.execute(stmt)).all()
    cells = [
        HeatmapCell(
            category=row.category,
            difficulty=int(row.difficulty),
            attempts=int(row.attempts),
            correct=int(row.correct),
            accuracy=_accuracy(int(row.correct), int(row.attempts)),
        )
        for row in rows
    ]
    return HeatmapResponse(cells=cells)


@router.get("/progress", response_model=ProgressResponse)
async def progress(
    days: int = 60,
    db: AsyncSession = Depends(get_db),
    user: UserContext = Depends(get_current_user),
) -> ProgressResponse:
    days = max(1, min(days, 365))
    cutoff = datetime.now(UTC) - timedelta(days=days - 1)

    baseline_stmt = (
        select(func.count())
        .select_from(StudyLog)
        .where(StudyLog.user_id == user.id, StudyLog.studied_at < cutoff)
    )
    cumulative = int((await db.execute(baseline_stmt)).scalar_one())

    day_col = func.date_trunc("day", StudyLog.studied_at).label("day")
    stmt = (
        select(
            day_col,
            func.count().label("attempts"),
            func.coalesce(
                func.sum(case((StudyLog.is_correct.is_(True), 1), else_=0)), 0
            ).label("correct"),
        )
        .where(StudyLog.user_id == user.id, StudyLog.studied_at >= cutoff)
        .group_by(day_col)
        .order_by(day_col)
    )
    rows = (await db.execute(stmt)).all()

    points: list[ProgressPoint] = []
    for row in rows:
        cumulative += int(row.attempts)
        points.append(
            ProgressPoint(
                day=row.day.date(),
                attempts=int(row.attempts),
                correct=int(row.correct),
                cumulative_attempts=cumulative,
            )
        )
    return ProgressResponse(points=points)


async def _streak_days(db: AsyncSession, today_utc, user_id: int) -> int:
    """Consecutive trailing days that have at least one study_log."""

    cutoff = today_utc - timedelta(days=365)
    day_col = func.date_trunc("day", StudyLog.studied_at)
    stmt = (
        select(day_col.label("day"))
        .where(StudyLog.user_id == user_id, StudyLog.studied_at >= cutoff)
        .group_by("day")
        .order_by(day_col.desc())
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return 0

    days = [row.day.date() for row in rows]
    streak = 0
    expected = today_utc
    if days[0] != today_utc:
        expected = today_utc - timedelta(days=1)
        if days[0] != expected:
            return 0
    for day in days:
        if day == expected:
            streak += 1
            expected = expected - timedelta(days=1)
        else:
            break
    return streak
