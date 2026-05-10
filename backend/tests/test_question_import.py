import json

import pytest

from app.services.question_import import parse_csv, parse_json


def test_parse_csv_basic() -> None:
    csv_text = (
        "question_text,question_type,choices,correct_answer,"
        "syllabus_category,difficulty\n"
        '"What is X?",single,"[""A"",""B""]",0,Cat1,2\n'
    )
    records = parse_csv(csv_text.encode("utf-8"))
    assert len(records) == 1
    record = records[0]
    assert record["question_text"] == "What is X?"
    assert record["question_type"] == "single"
    assert record["choices"] == ["A", "B"]
    assert record["correct_answer"] == 0
    assert record["syllabus_category"] == "Cat1"
    assert record["difficulty"] == 2


def test_parse_csv_strips_bom() -> None:
    csv_text = (
        "﻿question_text,question_type,choices,correct_answer,"
        "syllabus_category,difficulty\n"
        '"Q",single,"[""A""]",0,Cat,1\n'
    )
    records = parse_csv(csv_text.encode("utf-8"))
    assert records[0]["question_text"] == "Q"


def test_parse_csv_handles_blank_optionals() -> None:
    csv_text = (
        "question_text,question_type,choices,correct_answer,"
        "syllabus_category,subcategory,difficulty,is_active\n"
        '"Q",single,"[""A""]",0,Cat,,1,true\n'
    )
    records = parse_csv(csv_text.encode("utf-8"))
    record = records[0]
    assert record["subcategory"] is None
    assert record["is_active"] is True


def test_parse_json_array() -> None:
    data = json.dumps(
        [
            {
                "question_text": "Q",
                "question_type": "single",
                "choices": ["A"],
                "correct_answer": 0,
                "syllabus_category": "C",
                "difficulty": 1,
            }
        ]
    )
    records = parse_json(data.encode("utf-8"))
    assert len(records) == 1
    assert records[0]["question_text"] == "Q"


def test_parse_json_single_object_becomes_list() -> None:
    data = json.dumps(
        {
            "question_text": "Q",
            "question_type": "single",
            "choices": ["A"],
            "correct_answer": 0,
            "syllabus_category": "C",
            "difficulty": 1,
        }
    )
    records = parse_json(data.encode("utf-8"))
    assert len(records) == 1


def test_parse_json_scalar_raises() -> None:
    with pytest.raises(ValueError, match="object or array"):
        parse_json(b'"just a string"')
