import json

import pytest

from app.llm.generator import _extract_json


def test_extract_json_plain() -> None:
    data = _extract_json('{"a": 1}')
    assert data == {"a": 1}


def test_extract_json_fenced() -> None:
    text = """```json
{"a": 1, "b": [1, 2]}
```"""
    assert _extract_json(text) == {"a": 1, "b": [1, 2]}


def test_extract_json_invalid_raises() -> None:
    with pytest.raises(json.JSONDecodeError):
        _extract_json("not json at all")
