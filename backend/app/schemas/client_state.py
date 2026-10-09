from datetime import datetime
from typing import Dict

from pydantic import BaseModel, ConfigDict


class ClientStateEntry(BaseModel):
    key: str
    value: str


class ClientStateRead(ClientStateEntry):
    model_config = ConfigDict(from_attributes=True)

    updated_at: datetime


class ClientStateSnapshot(BaseModel):
    version: int = 1
    exported_at: str
    items: Dict[str, str]


class ClientStateSnapshotRead(ClientStateSnapshot):
    saved_at: datetime | None = None
