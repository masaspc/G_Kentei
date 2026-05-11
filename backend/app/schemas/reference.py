from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ReferenceArticleSummary(BaseModel):
    id: int
    title: str
    syllabus_category: str
    order_num: int
    model_config = {"from_attributes": True}


class ReferenceArticleDetail(ReferenceArticleSummary):
    content: str
    is_published: bool
    created_at: datetime
    updated_at: datetime


class ReferenceArticleInput(BaseModel):
    title: str
    syllabus_category: str
    content: str = ""
    order_num: int = 0
    is_published: bool = False
