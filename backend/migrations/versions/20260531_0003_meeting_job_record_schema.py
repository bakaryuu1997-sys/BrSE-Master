"""add meeting job record recovery fields

Revision ID: 20260531_0003
Revises: 20260531_0002
Create Date: 2026-05-31 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260531_0003"
down_revision = "20260531_0002"
branch_labels = None
depends_on = None

TABLE_NAME = "meeting_task_status_records"


def _table_exists() -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return TABLE_NAME in inspector.get_table_names()


def _has_column(column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not _table_exists():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(TABLE_NAME)}


def _add_column(column: sa.Column) -> None:
    if not _has_column(column.name):
        op.add_column(TABLE_NAME, column)


def upgrade() -> None:
    if not _table_exists():
        op.create_table(
            TABLE_NAME,
            sa.Column("job_id", sa.String(length=36), primary_key=True),
            sa.Column("meeting_id", sa.String(length=36), nullable=True),
            sa.Column("status", sa.String(length=50), server_default="queued"),
            sa.Column("phase", sa.String(length=80), server_default=""),
            sa.Column("chunk_index", sa.Integer(), nullable=True),
            sa.Column("progress_percent", sa.Integer(), nullable=True),
            sa.Column("status_message", sa.Text(), server_default=""),
            sa.Column("error", sa.Text(), server_default=""),
            sa.Column("failure_reason", sa.Text(), server_default=""),
            sa.Column("retry_count", sa.Integer(), server_default="0"),
            sa.Column("recovery_metadata_json", sa.Text(), server_default="{}"),
            sa.Column("checkpoint_path", sa.String(length=512), server_default=""),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("failed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(f"ix_{TABLE_NAME}_job_id", TABLE_NAME, ["job_id"])
        op.create_index(f"ix_{TABLE_NAME}_meeting_id", TABLE_NAME, ["meeting_id"])
        op.create_index(f"ix_{TABLE_NAME}_status", TABLE_NAME, ["status"])
        op.create_index(f"ix_{TABLE_NAME}_phase", TABLE_NAME, ["phase"])
        return

    _add_column(sa.Column("meeting_id", sa.String(length=36), nullable=True))
    _add_column(sa.Column("status", sa.String(length=50), server_default="queued"))
    _add_column(sa.Column("failure_reason", sa.Text(), server_default=""))
    _add_column(sa.Column("retry_count", sa.Integer(), server_default="0"))
    _add_column(sa.Column("recovery_metadata_json", sa.Text(), server_default="{}"))
    _add_column(sa.Column("started_at", sa.DateTime(), nullable=True))
    _add_column(sa.Column("completed_at", sa.DateTime(), nullable=True))
    _add_column(sa.Column("failed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    for column_name in [
        "failed_at",
        "completed_at",
        "started_at",
        "recovery_metadata_json",
        "retry_count",
        "failure_reason",
        "status",
        "meeting_id",
    ]:
        if _has_column(column_name):
            with op.batch_alter_table(TABLE_NAME) as batch_op:
                batch_op.drop_column(column_name)
