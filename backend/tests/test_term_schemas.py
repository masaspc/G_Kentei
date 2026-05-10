import pytest
from pydantic import ValidationError

from app.schemas.term import TermCreate, TermUpdate


def test_create_valid() -> None:
    term = TermCreate(term="ReLU", definition="Rectified Linear Unit")
    assert term.tags == []
    assert term.reference_links == []
    assert term.syllabus_category is None


def test_create_rejects_empty_term() -> None:
    with pytest.raises(ValidationError):
        TermCreate(term="", definition="ok")


def test_create_rejects_empty_definition() -> None:
    with pytest.raises(ValidationError):
        TermCreate(term="X", definition="")


def test_update_partial() -> None:
    upd = TermUpdate(tags=["DL"])
    assert upd.model_dump(exclude_unset=True) == {"tags": ["DL"]}
