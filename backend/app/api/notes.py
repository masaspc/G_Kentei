from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import Question, QuestionNote

router = APIRouter(prefix="/questions", tags=["notes"])


class NoteResponse(BaseModel):
    note: str | None


class NotePayload(BaseModel):
    note: str


@router.get("/{question_id}/note", response_model=NoteResponse)
async def get_note(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> NoteResponse:
    row = await db.get(QuestionNote, question_id)
    return NoteResponse(note=row.note if row else None)


@router.put("/{question_id}/note", response_model=NoteResponse)
async def upsert_note(
    question_id: int,
    payload: NotePayload,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> NoteResponse:
    question = await db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    row = await db.get(QuestionNote, question_id)
    text = payload.note.strip()
    if text == "":
        if row is not None:
            await db.delete(row)
            await db.commit()
        return NoteResponse(note=None)

    if row is None:
        row = QuestionNote(question_id=question_id, note=text)
        db.add(row)
    else:
        row.note = text
    await db.commit()
    return NoteResponse(note=text)
