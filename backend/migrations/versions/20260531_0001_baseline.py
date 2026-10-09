"""baseline current local schema

Revision ID: 20260531_0001
Revises:
Create Date: 2026-05-31 00:00:00.000000
"""

from alembic import op

from app.db.base_class import Base
from app.db.model_registry import import_all_models

revision = "20260531_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    import_all_models()
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    import_all_models()
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
