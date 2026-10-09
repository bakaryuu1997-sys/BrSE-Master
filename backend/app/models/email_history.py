import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db.base_class import Base


class EmailHistoryRecord(Base):
    __tablename__ = "email_history_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(String(120), default="default", index=True)
    template_id = Column(String(120), default="", index=True)
    template_title = Column(String(240), default="")
    category = Column(String(80), default="", index=True)
    subject = Column(String(360), default="")
    body = Column(Text, default="")
    variables = Column(Text, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), index=True)
