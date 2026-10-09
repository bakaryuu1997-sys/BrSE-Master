from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReleaseDateCheckRequest(BaseModel):
    release_date: date


class ReleaseDateCheckResponse(BaseModel):
    release_date: date
    has_warning: bool
    warnings: list[str]


class TimezoneConvertRequest(BaseModel):
    date: date
    time: time
    source_timezone: str = "Asia/Tokyo"
    target_timezone: str = "Asia/Ho_Chi_Minh"


class TimezoneConvertResponse(BaseModel):
    source_datetime: str
    target_datetime: str
    source_timezone: str
    target_timezone: str


class PersonalScheduleCreate(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    title: str = Field(min_length=1, max_length=240)
    note: str = ""
    start_time: str = ""
    end_time: str = ""
    timezone: str = "Asia/Tokyo"


class PersonalScheduleUpdate(BaseModel):
    date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    title: Optional[str] = Field(default=None, min_length=1, max_length=240)
    note: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = None


class PersonalScheduleRead(PersonalScheduleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
