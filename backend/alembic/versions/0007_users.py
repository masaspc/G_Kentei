"""add users table and user_id columns

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-11

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1) users テーブル作成
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
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
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # 2) 既存データを admin に紐付けるためのブートストラップ admin (id=1)
    # password_hash は startup でアプリが env から上書きする
    op.execute(
        "INSERT INTO users (id, username, password_hash, role, is_active) "
        "VALUES (1, 'admin', '__bootstrap__', 'admin', true) "
        "ON CONFLICT DO NOTHING"
    )
    # シーケンスを進めて次の挿入で id=2 以降になるようにする
    op.execute("SELECT setval(pg_get_serial_sequence('users', 'id'), 1, true)")

    # 3) study_logs に user_id 追加 (既存行は admin=1 に backfill)
    op.add_column(
        "study_logs",
        sa.Column("user_id", sa.BigInteger, nullable=True),
    )
    op.execute("UPDATE study_logs SET user_id = 1 WHERE user_id IS NULL")
    op.alter_column("study_logs", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_study_logs_user_id",
        "study_logs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_study_logs_user_id", "study_logs", ["user_id"])

    # 4) exam_sessions に user_id 追加
    op.add_column(
        "exam_sessions",
        sa.Column("user_id", sa.BigInteger, nullable=True),
    )
    op.execute("UPDATE exam_sessions SET user_id = 1 WHERE user_id IS NULL")
    op.alter_column("exam_sessions", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_exam_sessions_user_id",
        "exam_sessions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_exam_sessions_user_id", "exam_sessions", ["user_id"])

    # 5) bookmarks: PK を (user_id, question_id) に変更
    op.add_column(
        "bookmarks",
        sa.Column("user_id", sa.BigInteger, nullable=True),
    )
    op.execute("UPDATE bookmarks SET user_id = 1 WHERE user_id IS NULL")
    op.alter_column("bookmarks", "user_id", nullable=False)
    op.drop_constraint("bookmarks_pkey", "bookmarks", type_="primary")
    op.create_primary_key("bookmarks_pkey", "bookmarks", ["user_id", "question_id"])
    op.create_foreign_key(
        "fk_bookmarks_user_id",
        "bookmarks",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 6) question_notes: PK を (user_id, question_id) に変更
    op.add_column(
        "question_notes",
        sa.Column("user_id", sa.BigInteger, nullable=True),
    )
    op.execute("UPDATE question_notes SET user_id = 1 WHERE user_id IS NULL")
    op.alter_column("question_notes", "user_id", nullable=False)
    op.drop_constraint("question_notes_pkey", "question_notes", type_="primary")
    op.create_primary_key(
        "question_notes_pkey", "question_notes", ["user_id", "question_id"]
    )
    op.create_foreign_key(
        "fk_question_notes_user_id",
        "question_notes",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 7) srs_states: PK を (user_id, question_id) に変更
    op.add_column(
        "srs_states",
        sa.Column("user_id", sa.BigInteger, nullable=True),
    )
    op.execute("UPDATE srs_states SET user_id = 1 WHERE user_id IS NULL")
    op.alter_column("srs_states", "user_id", nullable=False)
    op.drop_constraint("srs_states_pkey", "srs_states", type_="primary")
    op.create_primary_key(
        "srs_states_pkey", "srs_states", ["user_id", "question_id"]
    )
    op.create_foreign_key(
        "fk_srs_states_user_id",
        "srs_states",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_srs_states_user_id", "srs_states", type_="foreignkey")
    op.drop_constraint("srs_states_pkey", "srs_states", type_="primary")
    op.create_primary_key("srs_states_pkey", "srs_states", ["question_id"])
    op.drop_column("srs_states", "user_id")

    op.drop_constraint("fk_question_notes_user_id", "question_notes", type_="foreignkey")
    op.drop_constraint("question_notes_pkey", "question_notes", type_="primary")
    op.create_primary_key("question_notes_pkey", "question_notes", ["question_id"])
    op.drop_column("question_notes", "user_id")

    op.drop_constraint("fk_bookmarks_user_id", "bookmarks", type_="foreignkey")
    op.drop_constraint("bookmarks_pkey", "bookmarks", type_="primary")
    op.create_primary_key("bookmarks_pkey", "bookmarks", ["question_id"])
    op.drop_column("bookmarks", "user_id")

    op.drop_index("ix_exam_sessions_user_id", table_name="exam_sessions")
    op.drop_constraint("fk_exam_sessions_user_id", "exam_sessions", type_="foreignkey")
    op.drop_column("exam_sessions", "user_id")

    op.drop_index("ix_study_logs_user_id", table_name="study_logs")
    op.drop_constraint("fk_study_logs_user_id", "study_logs", type_="foreignkey")
    op.drop_column("study_logs", "user_id")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
