from app.db import Base


def test_metadata_has_expected_tables() -> None:
    table_names = set(Base.metadata.tables.keys())
    assert table_names == {
        "questions",
        "study_logs",
        "srs_states",
        "api_usage_logs",
    }


def test_questions_has_indexed_category() -> None:
    questions = Base.metadata.tables["questions"]
    indexed_columns = {
        idx.columns.keys()[0] for idx in questions.indexes if len(idx.columns) == 1
    }
    assert "syllabus_category" in indexed_columns
