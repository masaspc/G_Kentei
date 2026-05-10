"""Q&A chat with Claude Sonnet 4.6 grounded in a specific question."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from anthropic import AsyncAnthropic

from app.config import get_settings

_SYSTEM_PROMPT = (
    "あなたはG検定対策の優秀な講師です。"
    "ユーザーが取り組んでいる問題に関する質問に、"
    "事実に基づき分かりやすく日本語で答えてください。"
    "問題のコンテキストは「context」セクションに記載されています。"
)


@dataclass
class ChatTurn:
    role: str  # "user" or "assistant"
    content: str


@dataclass
class ChatResult:
    text: str
    model: str
    usage: Any


def _format_context(
    question_text: str,
    correct_answer: Any,
    explanation: str | None,
    category: str,
) -> str:
    parts = [
        "<context>",
        f"分野: {category}",
        f"問題: {question_text}",
        f"正解: {correct_answer}",
    ]
    if explanation:
        parts.append(f"解説: {explanation}")
    parts.append("</context>")
    return "\n".join(parts)


async def ask(
    *,
    question_text: str,
    correct_answer: Any,
    explanation: str | None,
    category: str,
    history: list[ChatTurn],
    user_message: str,
    client: AsyncAnthropic | None = None,
) -> ChatResult:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    sdk = client or AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = settings.anthropic_sonnet_model

    context_block = _format_context(
        question_text=question_text,
        correct_answer=correct_answer,
        explanation=explanation,
        category=category,
    )

    messages: list[dict[str, Any]] = []
    # The first user turn carries the context, then conversation continues.
    first_user_content = f"{context_block}\n\n質問: {user_message}"
    if not history:
        messages.append({"role": "user", "content": first_user_content})
    else:
        # Rebuild conversation: prepend context to the first user turn.
        first_appended = False
        for turn in history:
            content = turn.content
            if not first_appended and turn.role == "user":
                content = f"{context_block}\n\n{content}"
                first_appended = True
            messages.append({"role": turn.role, "content": content})
        messages.append({"role": "user", "content": user_message})

    response = await sdk.messages.create(
        model=model,
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    )

    text_parts = [block.text for block in response.content if block.type == "text"]
    return ChatResult(
        text="".join(text_parts).strip(),
        model=model,
        usage=response.usage,
    )
