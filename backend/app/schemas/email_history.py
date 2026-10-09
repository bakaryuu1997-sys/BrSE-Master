from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EmailHistoryCreate(BaseModel):
    project_id: str = "default"
    template_id: str = ""
    template_title: str = ""
    category: str = ""
    subject: str = ""
    body: str = ""
    variables: dict[str, Any] = Field(default_factory=dict)


class EmailHistoryRead(EmailHistoryCreate):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
