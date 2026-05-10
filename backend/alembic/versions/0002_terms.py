"""add terms table

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-10

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "terms",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("term", sa.String(200), nullable=False),
        sa.Column("definition", sa.Text, nullable=False),
        sa.Column("syllabus_category", sa.String(100)),
        sa.Column(
            "tags",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "reference_links",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_terms_term", "terms", ["term"])
    op.create_index(
        "ix_terms_syllabus_category", "terms", ["syllabus_category"]
    )


def downgrade() -> None:
    op.drop_table("terms")
