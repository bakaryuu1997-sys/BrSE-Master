from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReportRecordBase(BaseModel):
    report_date: str  # YYYY-MM-DD
    project_name: Optional[str] = None
    owner: Optional[str] = None
    tasks_done: Optional[str] = None
    tasks_in_progress: Optional[str] = None
    tasks_tomorrow: Optional[str] = None
    blockers: Optional[str] = None
    progress_percent: Optional[str] = None
    generated_jp: Optional[str] = None


class ReportRecordCreate(ReportRecordBase):
    pass


class ReportRecordUpdate(ReportRecordBase):
    pass


class ReportRecordResponse(ReportRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
