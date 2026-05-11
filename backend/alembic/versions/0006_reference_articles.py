"""add reference_articles table

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-11

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reference_articles",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("syllabus_category", sa.String(100), nullable=False),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column("order_num", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "is_published", sa.Boolean, nullable=False, server_default=sa.false()
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
    op.create_index(
        "ix_reference_articles_syllabus_category",
        "reference_articles",
        ["syllabus_category"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_reference_articles_syllabus_category", table_name="reference_articles"
    )
    op.drop_table("reference_articles")
