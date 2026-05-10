"""Generate a draft question with Claude Sonnet 4.6.

The output goes into the admin form for human review; it is never auto-
inserted into the question bank because hallucinated answers would
poison practice.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from anthropic import AsyncAnthropic

from app.config import get_settings

_SYSTEM_PROMPT = (
    "あなたはG検定の作問担当者です。本番試験と同等の難易度・形式の問題を"
    "JSON で生成してください。"
)


@dataclass
class GeneratedQuestion:
    question_text: str
    question_type: str
    choices: list[str]
    correct_answer: Any
    explanation: str
    tags: list[str]


@dataclass
class GenerationResult:
    question: GeneratedQuestion
    model: str
    usage: Any


def _build_prompt(
    *,
    category: str,
    difficulty: int,
    question_type: str,
) -> str:
    schema_hint = {
        "single": '"correct_answer" は正解の選択肢インデックス (0始まりの整数)',
        "multi": '"correct_answer" は正解インデックスの整数配列',
        "true_false": '"correct_answer" は true または false',
        "fill_blank": '"correct_answer" は解答文字列',
    }.get(question_type, "")

    return (
        f"以下の条件でG検定の問題を1問だけ作成してください。\n"
        f"分野: {category}\n"
        f"難易度: {difficulty} (1=易, 2=中, 3=難)\n"
        f"形式: {question_type}\n"
        f"{schema_hint}\n\n"
        "出力は次のJSONスキーマに厳密に従い、JSONのみを返してください。"
        "コードブロックや前置きは不要です。\n"
        "{\n"
        '  "question_text": string,\n'
        '  "question_type": "single"|"multi"|"true_false"|"fill_blank",\n'
        '  "choices": string[]  // fill_blank の場合は空配列\n'
        '  "correct_answer": any,\n'
        '  "explanation": string,\n'
        '  "tags": string[]\n'
        "}\n"
    )


def _extract_json(text: str) -> dict[str, Any]:
    # Strip optional code fences
    stripped = text.strip()
    fence = re.match(r"```(?:json)?\s*(.*?)```", stripped, re.DOTALL)
    if fence:
        stripped = fence.group(1).strip()
    return json.loads(stripped)


async def generate_question(
    *,
    category: str,
    difficulty: int,
    question_type: str = "single",
    client: AsyncAnthropic | None = None,
) -> GenerationResult:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    sdk = client or AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = settings.anthropic_sonnet_model

    response = await sdk.messages.create(
        model=model,
        max_tokens=1536,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": _build_prompt(
                    category=category,
                    difficulty=difficulty,
                    question_type=question_type,
                ),
            }
        ],
    )

    text = "".join(b.text for b in response.content if b.type == "text")
    try:
        data = _extract_json(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Claude returned non-JSON content: {text[:200]}") from exc

    question = GeneratedQuestion(
        question_text=str(data.get("question_text", "")).strip(),
        question_type=str(data.get("question_type", question_type)),
        choices=list(data.get("choices") or []),
        correct_answer=data.get("correct_answer"),
        explanation=str(data.get("explanation", "")).strip(),
        tags=list(data.get("tags") or []),
    )
    return GenerationResult(question=question, model=model, usage=response.usage)
