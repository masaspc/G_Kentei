from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "assistant"]


class ChatTurn(BaseModel):
    role: ChatRole
    content: str


class ChatRequest(BaseModel):
    question_id: int
    history: list[ChatTurn] = Field(default_factory=list)
    user_message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    reply: str
