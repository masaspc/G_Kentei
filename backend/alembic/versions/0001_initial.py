"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-10

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "questions",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("question_type", sa.String(20), nullable=False),
        sa.Column("choices", postgresql.JSONB, nullable=False),
        sa.Column("correct_answer", postgresql.JSONB, nullable=False),
        sa.Column("explanation", sa.Text),
        sa.Column("explanation_source", sa.String(20)),
        sa.Column(
            "reference_links",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("syllabus_category", sa.String(100), nullable=False),
        sa.Column("subcategory", sa.String(100)),
        sa.Column("difficulty", sa.SmallInteger, nullable=False),
        sa.Column(
            "tags",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("source", sa.String(200)),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.text("true")
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
        "ix_questions_syllabus_category", "questions", ["syllabus_category"]
    )

    op.create_table(
        "study_logs",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "question_id",
            sa.BigInteger,
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("selected_answer", postgresql.JSONB, nullable=False),
        sa.Column("is_correct", sa.Boolean, nullable=False),
        sa.Column("response_time_ms", sa.Integer),
        sa.Column("self_evaluation", sa.SmallInteger),
        sa.Column(
            "studied_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_study_logs_question_id", "study_logs", ["question_id"])
    op.create_index("ix_study_logs_studied_at", "study_logs", ["studied_at"])

    op.create_table(
        "srs_states",
        sa.Column(
            "question_id",
            sa.BigInteger,
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "ease_factor",
            sa.Float,
            nullable=False,
            server_default=sa.text("2.5"),
        ),
        sa.Column(
            "interval_days", sa.Integer, nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "consecutive_correct",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("next_review_at", postgresql.TIMESTAMP(timezone=True)),
    )
    op.create_index(
        "ix_srs_states_next_review_at", "srs_states", ["next_review_at"]
    )

    op.create_table(
        "api_usage_logs",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("model", sa.String(50), nullable=False),
        sa.Column("purpose", sa.String(50), nullable=False),
        sa.Column("input_tokens", sa.Integer, nullable=False),
        sa.Column("output_tokens", sa.Integer, nullable=False),
        sa.Column(
            "cached_input_tokens",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("estimated_cost_usd", sa.Numeric(10, 6), nullable=False),
        sa.Column(
            "called_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_api_usage_logs_called_at", "api_usage_logs", ["called_at"])


def downgrade() -> None:
    op.drop_table("api_usage_logs")
    op.drop_table("srs_states")
    op.drop_table("study_logs")
    op.drop_table("questions")
    op.execute("DROP EXTENSION IF EXISTS vector")
