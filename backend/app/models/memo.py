import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.db.base_class import Base


class MemoNoteRecord(Base):
    __tablename__ = "memo_note_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String(240), nullable=False, index=True)
    body = Column(Text, default="")
    tags = Column(Text, default="")
    pinned = Column(Boolean, default=False, index=True)
    images = Column(Text, default="[]")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
