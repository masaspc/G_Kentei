from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TermBase(BaseModel):
    term: str = Field(min_length=1, max_length=200)
    definition: str = Field(min_length=1)
    syllabus_category: str | None = Field(default=None, max_length=100)
    tags: list[str] = Field(default_factory=list)
    reference_links: list[str] = Field(default_factory=list)


class TermCreate(TermBase):
    pass


class TermUpdate(BaseModel):
    term: str | None = Field(default=None, min_length=1, max_length=200)
    definition: str | None = Field(default=None, min_length=1)
    syllabus_category: str | None = Field(default=None, max_length=100)
    tags: list[str] | None = None
    reference_links: list[str] | None = None


class TermRead(TermBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class TermListResponse(BaseModel):
    items: list[TermRead]
    total: int
