"""move todo evidence column patch into migration

Revision ID: 20260531_0002
Revises: 20260531_0001
Create Date: 2026-05-31 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260531_0002"
down_revision = "20260531_0001"
branch_labels = None
depends_on = None

TABLE_NAME = "brse_todo_items"
COLUMN_NAME = "evidences_json"


def _has_column() -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    if TABLE_NAME not in inspector.get_table_names():
        return False
    return COLUMN_NAME in {column["name"] for column in inspector.get_columns(TABLE_NAME)}


def upgrade() -> None:
    if not _has_column():
        op.add_column(TABLE_NAME, sa.Column(COLUMN_NAME, sa.Text(), server_default="[]"))


def downgrade() -> None:
    if _has_column():
        with op.batch_alter_table(TABLE_NAME) as batch_op:
            batch_op.drop_column(COLUMN_NAME)
