import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.note import UniversalNoteRecord, NoteKind
from app.services.note_projection import backfill_all

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("", response_model=List[dict], include_in_schema=False)
@router.get("/", response_model=List[dict])
def list_universal_notes(
    kind: Optional[NoteKind] = None,
    project_id: str = "default",
    db: Session = Depends(get_db)
):
    query = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.project_id == project_id)
    if kind:
        query = query.filter(UniversalNoteRecord.kind == kind)
    
    notes = query.order_by(UniversalNoteRecord.updated_at.desc()).all()
    return [note.to_dict() for note in notes]


@router.post("/migrate", status_code=202)
def trigger_migration(db: Session = Depends(get_db)):
    """Re-sync all legacy memo/minutes rows into the UniversalNote index.

    Non-destructive: legacy tables remain canonical; this only refreshes the
    projection (idempotent upsert keyed by legacy id).
    """
    count = backfill_all(db)
    return {"message": f"Projected {count} legacy records into the UniversalNote index."}


@router.get("/{note_id}")
def get_universal_note(note_id: str, db: Session = Depends(get_db)):
    note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note.to_dict()


class NoteLinkRequest(BaseModel):
    target_note_id: str


@router.post("/{note_id}/link")
def link_universal_note(note_id: str, payload: NoteLinkRequest, db: Session = Depends(get_db)):
    note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note_id).first()
    target = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == payload.target_note_id).first()
    
    if not note or not target:
        raise HTTPException(status_code=404, detail="One or both notes not found")
        
    # 1. Update note's metadata
    meta = dict(note.metadata_json or {})
    links = list(meta.get("cross_links", []))
    if not any(lnk.get("id") == target.id for lnk in links):
        links.append({
            "id": target.id,
            "title": target.title,
            "kind": target.kind
        })
    meta["cross_links"] = links
    note.metadata_json = meta
    
    # 2. Update target's metadata (mutual linking)
    t_meta = dict(target.metadata_json or {})
    t_links = list(t_meta.get("cross_links", []))
    if not any(lnk.get("id") == note.id for lnk in t_links):
        t_links.append({
            "id": note.id,
            "title": note.title,
            "kind": note.kind
        })
    t_meta["cross_links"] = t_links
    target.metadata_json = t_meta
    
    db.commit()
    return {"message": "Notes linked successfully", "cross_links": links}
