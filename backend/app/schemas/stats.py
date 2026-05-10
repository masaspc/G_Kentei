from datetime import date

from pydantic import BaseModel


class DailyCount(BaseModel):
    day: date
    attempts: int
    correct: int


class CategoryAccuracy(BaseModel):
    category: str
    attempts: int
    correct: int
    accuracy: float


class DashboardStats(BaseModel):
    total_questions: int
    total_attempts: int
    overall_accuracy: float
    streak_days: int
    due_today: int
    daily_7d: list[DailyCount]
    weak_categories: list[CategoryAccuracy]


class HeatmapCell(BaseModel):
    category: str
    difficulty: int
    attempts: int
    correct: int
    accuracy: float


class HeatmapResponse(BaseModel):
    cells: list[HeatmapCell]
