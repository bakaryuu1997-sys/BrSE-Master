import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import Column, DateTime, String, Text, JSON, Enum as SqlEnum

from app.db.base_class import Base

class NoteKind(str, Enum):
    MEETING_RECORDING = "meeting_recording"
    MEETING_MINUTES = "meeting_minutes"
    PERSONAL_MEMO = "personal_memo"

class UniversalNoteRecord(Base):
    __tablename__ = "universal_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(String(120), default="default", index=True)
    title = Column(String(255), nullable=False, index=True)
    kind = Column(SqlEnum(NoteKind), nullable=False, index=True)
    status = Column(String(50), default='pending', index=True)
    
    # Content
    body_markdown = Column(Text, default="")
    
    # Metadata for specific kinds (Signal extraction, attendees, agenda, etc.)
    metadata_json = Column(JSON, default={})
    
    # Processing artifacts (mostly for meeting_recording)
    source_file_path = Column(String(512))
    transcript_path = Column(String(512))
    memo_file_path = Column(String(512)) # Path to MD file if stored externally
    
    # Standard fields
    language = Column(String(16), default="vi")
    template = Column(String(80), default="standard")
    ai_model = Column(String(100))
    
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), index=True)
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "title": self.title,
            "kind": self.kind,
            "status": self.status,
            "body_markdown": self.body_markdown,
            "metadata": self.metadata_json,
            "language": self.language,
            "template": self.template,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
