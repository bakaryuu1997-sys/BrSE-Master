from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BrseTodoProjectCreate(BaseModel):
    id: Optional[str] = Field(default=None, max_length=80)
    name: str = Field(default="Personal project", max_length=180)
    preset: str = "standard"
    active_phase: str = "1. Kick-off & Requirement"
    archived_at: str = ""


class BrseTodoProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=180)
    preset: Optional[str] = None
    active_phase: Optional[str] = None
    archived_at: Optional[str] = None


class BrseTodoProjectRead(BrseTodoProjectCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class BrseTodoItemCreate(BaseModel):
    id: str = Field(max_length=160)
    phase: str = Field(max_length=160)
    title: str = Field(max_length=320)
    detail: str = ""
    priority: str = "P1"
    presets: list[str] = []
    done: bool = False
    note: str = ""
    deadline: str = ""
    evidence_url: str = ""
    evidences: Optional[list[dict]] = None
    operation_id: str = ""
    source: str = "workflow"
    meeting_id: str = ""
    meeting_title: str = ""
    action_index: Optional[int] = None
    updated_at_client: str = ""


class BrseTodoItemUpdate(BaseModel):
    phase: Optional[str] = None
    title: Optional[str] = None
    detail: Optional[str] = None
    priority: Optional[str] = None
    presets: Optional[list[str]] = None
    done: Optional[bool] = None
    note: Optional[str] = None
    deadline: Optional[str] = None
    evidence_url: Optional[str] = None
    evidences: Optional[list[dict]] = None
    operation_id: Optional[str] = None
    source: Optional[str] = None
    meeting_id: Optional[str] = None
    meeting_title: Optional[str] = None
    action_index: Optional[int] = None
    updated_at_client: Optional[str] = None


class BrseTodoItemRead(BrseTodoItemCreate):
    model_config = ConfigDict(from_attributes=True)

    project_id: str
    created_at: datetime
    updated_at: datetime


class BrseTodoStateRead(BaseModel):
    project: BrseTodoProjectRead
    items: list[BrseTodoItemRead]


class BrseTodoStateWrite(BaseModel):
    project: BrseTodoProjectCreate
    items: list[BrseTodoItemCreate]


class BrseTodoRuleEvaluationRequest(BaseModel):
    today: Optional[str] = None
    items: list[BrseTodoItemCreate]
