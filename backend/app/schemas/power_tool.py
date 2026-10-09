from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PowerToolsStateRead(BaseModel):
    project_id: str
    payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class PowerToolsStateWrite(BaseModel):
    project_id: str = Field(max_length=120)
    payload: dict[str, Any]
