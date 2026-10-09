import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db.base_class import Base


class PersonalScheduleRecord(Base):
    __tablename__ = "personal_schedule_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    date = Column(String(10), nullable=False, index=True)
    title = Column(String(240), nullable=False)
    note = Column(Text, default="")
    start_time = Column(String(5), default="")
    end_time = Column(String(5), default="")
    timezone = Column(String(80), default="Asia/Tokyo")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
