from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db.base_class import Base


class ClientStateRecord(Base):
    __tablename__ = "client_state_records"

    key = Column(String(160), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
