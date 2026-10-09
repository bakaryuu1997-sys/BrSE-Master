from datetime import date, datetime
from pydantic import BaseModel, Field


class MeetingMinutesCreate(BaseModel):
    project_id: str | None = None
    title: str
    meeting_date: date
    location: str = ""
    status: str = "draft"
    template: str = "standard"
    language: str = "vi"
    source_meeting_id: str = ""
    attendees: list[str] = Field(default_factory=list)
    agenda_items: list[dict] = Field(default_factory=list)
    action_items: list[dict] = Field(default_factory=list)
    body_markdown: str = ""


class MeetingMinutesUpdate(BaseModel):
    project_id: str | None = None
    title: str | None = None
    meeting_date: date | None = None
    location: str | None = None
    status: str | None = None
    template: str | None = None
    language: str | None = None
    source_meeting_id: str | None = None
    attendees: list[str] | None = None
    agenda_items: list[dict] | None = None
    action_items: list[dict] | None = None
    body_markdown: str | None = None


class MeetingMinutesRead(MeetingMinutesCreate):
    id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
