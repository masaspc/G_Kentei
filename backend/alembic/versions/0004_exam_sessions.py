"""add exam_sessions table + exam_session_id on study_logs

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-10

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "started_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", postgresql.TIMESTAMP(timezone=True)),
        sa.Column("total_questions", sa.Integer, nullable=False),
        sa.Column("correct_count", sa.Integer),
        sa.Column("elapsed_seconds", sa.Integer),
    )

    op.add_column(
        "study_logs",
        sa.Column(
            "exam_session_id",
            sa.BigInteger,
            sa.ForeignKey("exam_sessions.id", ondelete="SET NULL"),
        ),
    )
    op.create_index(
        "ix_study_logs_exam_session_id", "study_logs", ["exam_session_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_study_logs_exam_session_id", table_name="study_logs")
    op.drop_column("study_logs", "exam_session_id")
    op.drop_table("exam_sessions")
