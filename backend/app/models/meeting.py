from sqlalchemy import Column, String, DateTime
from datetime import UTC, datetime
from app.db.base_class import Base

class MeetingRecord(Base):
    __tablename__ = "meeting_record"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default='pending') # processing, transcribing, summarizing, completed, failed
    filename = Column(String(255))
    file_path = Column(String(512))
    transcript_path = Column(String(512))
    memo_path = Column(String(512))
    language = Column(String(10), default='vi')
    template = Column(String(50), default='meeting')
    model = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "filename": self.filename,
            "language": self.language,
            "template": self.template,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
