from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class GlossaryTermBase(BaseModel):
    english: str
    japanese: str
    kana: Optional[str] = None
    vietnamese: str
    roles: List[str]
    category: str
    note: Optional[str] = None
    example: Optional[str] = None

class GlossaryTermCreate(GlossaryTermBase):
    id: str

class GlossaryTermUpdate(GlossaryTermBase):
    english: Optional[str] = None
    japanese: Optional[str] = None
    vietnamese: Optional[str] = None
    roles: Optional[List[str]] = None
    category: Optional[str] = None

class GlossaryTerm(GlossaryTermBase):
    model_config = ConfigDict(from_attributes=True)

    id: str

class GlossaryPagination(BaseModel):
    items: List[GlossaryTerm]
    total: int
    page: int
    size: int
    pages: int
