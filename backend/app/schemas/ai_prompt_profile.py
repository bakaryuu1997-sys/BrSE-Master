from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AiPromptProfileBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    use_case: str = Field(min_length=1, max_length=40)
    system_prompt: str = Field(min_length=20)
    project_id: str = ""
    customer_name: str = ""
    notes: str = ""
    is_default: bool = False


class AiPromptProfileCreate(AiPromptProfileBase):
    pass


class AiPromptProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    use_case: Optional[str] = Field(default=None, min_length=1, max_length=40)
    system_prompt: Optional[str] = Field(default=None, min_length=20)
    project_id: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    is_default: Optional[bool] = None


class AiPromptProfileRead(AiPromptProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
