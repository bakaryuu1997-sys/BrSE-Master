import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.db.base_class import Base


class AiPromptProfileRecord(Base):
    __tablename__ = "ai_prompt_profile_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(160), nullable=False)
    use_case = Column(String(40), nullable=False, index=True)
    system_prompt = Column(Text, nullable=False)
    project_id = Column(String(36), default="", index=True)
    customer_name = Column(String(160), default="")
    notes = Column(Text, default="")
    is_default = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
