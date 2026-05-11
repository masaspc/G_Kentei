"""Generate reference article content with Claude Sonnet."""

from __future__ import annotations

from anthropic import AsyncAnthropic

from app.config import get_settings

_SYSTEM_PROMPT = (
    "あなたはG検定対策の優秀な講師です。"
    "ディープラーニング・機械学習・AI倫理・法律に精通しており、"
    "受験者が体系的に理解できる参考記事を提供します。"
    "Markdown形式で読みやすい構成にしてください。"
)


async def generate_article(
    *,
    title: str,
    syllabus_category: str,
) -> tuple[str, object]:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    sdk = AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = settings.anthropic_sonnet_model

    user_prompt = (
        f"【タイトル】{title}\n"
        f"【シラバスカテゴリ】{syllabus_category}\n\n"
        "G検定の学習者向けに、以下の構成で参考記事をMarkdown形式で書いてください。\n"
        "1. 概要（Overview）\n"
        "2. 重要概念（Key Concepts）\n"
        "3. 重要ポイント（Important Points）\n"
        "4. 試験に出やすいパターン（Exam Patterns）\n"
    )

    response = await sdk.messages.create(
        model=model,
        max_tokens=2048,
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
    return "".join(text_parts).strip(), response.usage
