import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, Date, DateTime, String, Text

from app.db.base_class import Base


class MeetingMinutesRecord(Base):
    __tablename__ = "meeting_minutes_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(String(120), default="default", index=True)
    title = Column(String(240), nullable=False, index=True)
    meeting_date = Column(Date, index=True)
    location = Column(String(240), default="")
    status = Column(String(40), default="draft", index=True)
    template = Column(String(80), default="standard", index=True)
    language = Column(String(16), default="vi", index=True)
    source_meeting_id = Column(String(36), default="", index=True)
    attendees = Column(Text, default="[]")
    agenda_items = Column(Text, default="[]")
    action_items = Column(Text, default="[]")
    body_markdown = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), index=True)

    @staticmethod
    def encode_json(value) -> str:
        return json.dumps(value or [], ensure_ascii=False)

    @staticmethod
    def decode_json(value: str):
        try:
            parsed = json.loads(value or "[]")
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
