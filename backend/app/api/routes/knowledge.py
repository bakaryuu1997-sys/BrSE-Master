from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.knowledge import KnowledgeItem
from pydantic import BaseModel, ConfigDict

router = APIRouter()

class KnowledgeBase(BaseModel):
    title: str
    content: str
    category: str = "other"
    project_id: str

class KnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    project_id: Optional[str] = None

class KnowledgeResponse(KnowledgeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Any

@router.post("/", response_model=KnowledgeResponse)
def create_knowledge(
    item: KnowledgeBase, 
    db: Session = Depends(get_db)
):
    db_item = KnowledgeItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[KnowledgeResponse])
def read_knowledges(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(KnowledgeItem)
    if project_id:
        query = query.filter(KnowledgeItem.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.get("/search")
def search_knowledge(
    q: str,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(KnowledgeItem).filter(
        or_(
            KnowledgeItem.title.contains(q),
            KnowledgeItem.content.contains(q),
            KnowledgeItem.category.contains(q),
        )
    )
    if project_id:
        query = query.filter(KnowledgeItem.project_id == project_id)
    return query.limit(5).all()

@router.get("/{item_id}", response_model=KnowledgeResponse)
def read_knowledge(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(KnowledgeItem).filter(KnowledgeItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.put("/{item_id}", response_model=KnowledgeResponse)
def update_knowledge(
    item_id: int,
    item: KnowledgeUpdate,
    db: Session = Depends(get_db),
):
    db_item = db.query(KnowledgeItem).filter(KnowledgeItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    for field, value in item.model_dump(exclude_unset=True).items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_knowledge(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(KnowledgeItem).filter(KnowledgeItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted"}
