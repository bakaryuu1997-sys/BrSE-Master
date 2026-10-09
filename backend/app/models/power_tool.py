from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db.base_class import Base


class PowerToolsStateRecord(Base):
    __tablename__ = "power_tools_states"

    project_id = Column(String(120), primary_key=True, index=True)
    payload = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
