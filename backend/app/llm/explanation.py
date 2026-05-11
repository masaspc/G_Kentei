"""Generate problem explanations with Claude Haiku 4.5."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from anthropic import AsyncAnthropic

from app.config import get_settings

_SYSTEM_PROMPT = (
    "あなたはG検定対策の優秀な講師です。"
    "ディープラーニング・AI倫理・法律に精通しており、"
    "受験者が暗記ではなく理解できる解説を提供します。"
)


@dataclass
class ExplanationResult:
    text: str
    model: str
    usage: Any


async def generate_explanation(
    *,
    question_text: str,
    correct_answer: Any,
    category: str,
    client: AsyncAnthropic | None = None,
) -> ExplanationResult:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    sdk = client or AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = settings.anthropic_haiku_model

    user_prompt = (
        f"【問題】{question_text}\n"
        f"【正解】{correct_answer}\n"
        f"【分野】{category}\n"
        "この問題の解説を300字程度で書いてください。"
        "正解の理由・関連知識・覚え方のコツを含めてください。"
    )

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
        messages=[{"role": "user", "content": user_prompt}],
    )

    text_parts = [block.text for block in response.content if block.type == "text"]
    return ExplanationResult(
        text="".join(text_parts).strip(),
        model=model,
        usage=response.usage,
    )
