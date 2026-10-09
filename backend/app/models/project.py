import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db.base_class import Base


class ProjectSettingRecord(Base):
    __tablename__ = "project_setting_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(160), nullable=False, index=True)
    customer_name = Column(String(160), default="")
    customer_email = Column(String(240), default="")
    brse_name = Column(String(120), default="")
    pm_name = Column(String(120), default="")
    timezone = Column(String(80), default="Asia/Tokyo")
    language = Column(String(10), default="vi")
    customer_style = Column(Text, default="")
    report_rule = Column(Text, default="")
    timezone_rule = Column(Text, default="")
    communication_notes = Column(Text, default="")
    current_phase = Column(String(40), default="")
    health_status = Column(String(20), default="Green")
    next_milestone_date = Column(String(20), default="")
    stakeholders_json = Column(Text, default="[]")
    integrations_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
