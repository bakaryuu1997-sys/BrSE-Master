from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class MemoNoteCreate(BaseModel):
    title: str = Field(default="Untitled memo", max_length=240)
    body: str = ""
    tags: str = ""
    pinned: bool = False
    images: list[dict[str, Any]] = []


class MemoNoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=240)
    body: Optional[str] = None
    tags: Optional[str] = None
    pinned: Optional[bool] = None
    images: Optional[list[dict[str, Any]]] = None


class MemoNoteRead(MemoNoteCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
