from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db.base_class import Base


class MeetingTaskStatusRecord(Base):
    __tablename__ = "meeting_task_status_records"

    job_id = Column(String(36), primary_key=True, index=True)
    meeting_id = Column(String(36), nullable=True, index=True)
    status = Column(String(50), default="queued", index=True)
    phase = Column(String(80), default="", index=True)
    chunk_index = Column(Integer, nullable=True)
    progress_percent = Column(Integer, nullable=True)
    status_message = Column(Text, default="")
    error = Column(Text, default="")
    failure_reason = Column(Text, default="")
    retry_count = Column(Integer, default=0)
    recovery_metadata_json = Column(Text, default="{}")
    checkpoint_path = Column(String(512), default="")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
