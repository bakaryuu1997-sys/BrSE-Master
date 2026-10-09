from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    customer_name: str = Field(default="", max_length=160)
    customer_email: str = Field(default="", max_length=240)
    brse_name: str = Field(default="", max_length=120)
    pm_name: str = Field(default="", max_length=120)
    timezone: str = "Asia/Tokyo"
    language: str = "vi"
    customer_style: str = ""
    report_rule: str = ""
    timezone_rule: str = ""
    communication_notes: str = ""
    current_phase: str = Field(default="", max_length=40)
    health_status: str = Field(default="Green", max_length=20)
    next_milestone_date: str = Field(default="", max_length=20)
    stakeholders_json: str = "[]"
    integrations_json: str = "{}"


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    customer_name: Optional[str] = Field(default=None, max_length=160)
    customer_email: Optional[str] = Field(default=None, max_length=240)
    brse_name: Optional[str] = Field(default=None, max_length=120)
    pm_name: Optional[str] = Field(default=None, max_length=120)
    timezone: Optional[str] = None
    language: Optional[str] = None
    customer_style: Optional[str] = None
    report_rule: Optional[str] = None
    timezone_rule: Optional[str] = None
    communication_notes: Optional[str] = None
    current_phase: Optional[str] = Field(default=None, max_length=40)
    health_status: Optional[str] = Field(default=None, max_length=20)
    next_milestone_date: Optional[str] = Field(default=None, max_length=20)
    stakeholders_json: Optional[str] = None
    integrations_json: Optional[str] = None


class ProjectRead(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
