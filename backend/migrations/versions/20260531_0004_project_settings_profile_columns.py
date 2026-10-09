"""move project settings profile column patch into migration

Revision ID: 20260531_0004
Revises: 20260531_0003
Create Date: 2026-06-11 00:00:00.000000

Replaces the startup DDL helper ``ensure_project_settings_schema`` that used to
ALTER ``project_setting_records`` on every app boot. The column adds are guarded
so the migration is safe to run on fresh and legacy databases alike.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260531_0004"
down_revision = "20260531_0003"
branch_labels = None
depends_on = None

TABLE_NAME = "project_setting_records"

# (name, type, server_default) — kept in sync with app/models/project.py
COLUMN_SPECS = (
    ("current_phase", sa.String(length=40), ""),
    ("health_status", sa.String(length=20), "Green"),
    ("next_milestone_date", sa.String(length=20), ""),
    ("stakeholders_json", sa.Text(), "[]"),
    ("integrations_json", sa.Text(), "{}"),
)


def _table_exists() -> bool:
    return TABLE_NAME in inspect(op.get_bind()).get_table_names()


def _has_column(column_name: str) -> bool:
    if not _table_exists():
        return False
    return column_name in {column["name"] for column in inspect(op.get_bind()).get_columns(TABLE_NAME)}


def upgrade() -> None:
    if not _table_exists():
        return
    for name, column_type, server_default in COLUMN_SPECS:
        if not _has_column(name):
            op.add_column(TABLE_NAME, sa.Column(name, column_type, server_default=server_default))


def downgrade() -> None:
    if not _table_exists():
        return
    for name, _column_type, _server_default in reversed(COLUMN_SPECS):
        if _has_column(name):
            with op.batch_alter_table(TABLE_NAME) as batch_op:
                batch_op.drop_column(name)
