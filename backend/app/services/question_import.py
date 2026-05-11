"""Bulk import for questions from CSV/JSON payloads."""

from __future__ import annotations

import csv
import io
import json
from typing import Any

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Question
from app.schemas.question import (
    ImportError as ImportRowError,
)
from app.schemas.question import (
    ImportResult,
    QuestionCreate,
)

_JSON_FIELDS = {"choices", "correct_answer", "reference_links", "tags"}
_BOOL_FIELDS = {"is_active"}
_INT_FIELDS = {"difficulty"}
_NULLABLE_STR_FIELDS = {"explanation", "explanation_source", "subcategory", "source"}


def _coerce_csv_value(key: str, value: str) -> Any:
    stripped = value.strip()
    if stripped == "":
        if key in _NULLABLE_STR_FIELDS:
            return None
        if key in _JSON_FIELDS:
            return [] if key != "correct_answer" else None
        return None
    if key in _JSON_FIELDS:
        return json.loads(stripped)
    if key in _BOOL_FIELDS:
        return stripped.lower() in {"true", "1", "yes", "y"}
    if key in _INT_FIELDS:
        return int(stripped)
    return value


def _parse_csv_row(row: dict[str, str | None]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for raw_key, raw_value in row.items():
        if raw_key is None:
            continue
        key = raw_key.strip()
        if not key:
            continue
        value = raw_value if raw_value is not None else ""
        coerced = _coerce_csv_value(key, value)
        if coerced is None and key not in _NULLABLE_STR_FIELDS:
            # Skip empty non-nullable fields so Pydantic raises a clear error
            continue
        out[key] = coerced
    return out


def parse_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [_parse_csv_row(row) for row in reader]


def parse_json(content: bytes) -> list[dict[str, Any]]:
    data = json.loads(content.decode("utf-8"))
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    raise ValueError("JSON payload must be an object or array of objects")


def _format_validation_error(exc: ValidationError) -> str:
    parts = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err.get("loc", []))
        msg = err.get("msg", "invalid")
        parts.append(f"{loc}: {msg}" if loc else msg)
    return "; ".join(parts)


async def import_questions(
    records: list[dict[str, Any]], db: AsyncSession
) -> ImportResult:
    """Validate every record; commit all if and only if all validate."""

    validated: list[QuestionCreate] = []
    errors: list[ImportRowError] = []

    for index, raw in enumerate(records, start=1):
        try:
            validated.append(QuestionCreate.model_validate(raw))
        except ValidationError as exc:
            errors.append(
                ImportRowError(row=index, message=_format_validation_error(exc))
            )
        except (TypeError, ValueError) as exc:
            errors.append(ImportRowError(row=index, message=str(exc)))

    if errors:
        return ImportResult(success=0, failed=len(errors), errors=errors)

    for payload in validated:
        db.add(Question(**payload.model_dump()))
    await db.commit()

    return ImportResult(success=len(validated), failed=0, errors=[])
