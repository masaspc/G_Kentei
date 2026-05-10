from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.db.models import Question
from app.llm.chat import ChatTurn, ask
from app.llm.usage import is_over_budget, log_usage
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=ChatResponse)
async def chat_ask(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
) -> ChatResponse:
    question = await db.get(Question, payload.question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    if await is_over_budget(db):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Monthly Claude API budget exceeded",
        )

    history = [ChatTurn(role=t.role, content=t.content) for t in payload.history]

    try:
        result = await ask(
            question_text=question.question_text,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            category=question.syllabus_category,
            history=history,
            user_message=payload.user_message,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)
        ) from exc

    await log_usage(db, model=result.model, purpose="chat", usage=result.usage)

    return ChatResponse(reply=result.text)
