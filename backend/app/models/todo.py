import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base_class import Base


class BrseTodoProjectRecord(Base):
    __tablename__ = "brse_todo_projects"

    id = Column(String(80), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(180), nullable=False, index=True)
    preset = Column(String(40), default="standard")
    active_phase = Column(String(160), default="1. Kick-off & Requirement")
    archived_at = Column(String(40), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class BrseTodoItemRecord(Base):
    __tablename__ = "brse_todo_items"

    id = Column(String(160), primary_key=True, index=True)
    project_id = Column(String(80), ForeignKey("brse_todo_projects.id", ondelete="CASCADE"), index=True, nullable=False)
    phase = Column(String(160), nullable=False, index=True)
    title = Column(String(320), nullable=False, index=True)
    detail = Column(Text, default="")
    priority = Column(String(8), default="P1", index=True)
    presets = Column(Text, default="[]")
    done = Column(Boolean, default=False, index=True)
    note = Column(Text, default="")
    deadline = Column(String(20), default="", index=True)
    evidence_url = Column(Text, default="")
    evidences_json = Column(Text, default="[]")
    operation_id = Column(String(120), default="", index=True)
    source = Column(String(40), default="workflow", index=True)
    meeting_id = Column(String(80), default="", index=True)
    meeting_title = Column(String(320), default="")
    action_index = Column(Integer, nullable=True)
    updated_at_client = Column(String(40), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class MeetingTodoDraftRecord(Base):
    __tablename__ = "meeting_todo_draft_records"

    id = Column(String(180), primary_key=True, index=True)
    project_id = Column(String(80), default="", index=True)
    project_name = Column(String(180), default="")
    meeting_id = Column(String(80), default="", index=True)
    meeting_title = Column(String(320), default="")
    action_index = Column(Integer, nullable=True)
    task = Column(String(320), nullable=False, index=True)
    owner = Column(String(160), default="")
    deadline = Column(String(20), default="", index=True)
    action_status = Column(String(80), default="")
    source_quote = Column(Text, default="")
    evidence_url = Column(Text, default="")
    priority = Column(String(8), default="P1", index=True)
    phase = Column(String(160), default="4. Tracking & Reporting")
    review_status = Column(String(24), default="pending", index=True)
    todo_item_id = Column(String(180), default="", index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
