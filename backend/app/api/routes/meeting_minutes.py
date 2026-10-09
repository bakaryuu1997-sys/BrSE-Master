import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.note import NoteKind, UniversalNoteRecord
from app.schemas.meeting_minutes import MeetingMinutesCreate, MeetingMinutesRead, MeetingMinutesUpdate
from app.services.note_projection import (
    safe_backup_minutes_record,
    safe_project_meeting_minutes,
    safe_remove_minutes_record,
    safe_remove_projection,
)

router = APIRouter()


def serialize_minutes_from_universal(note: UniversalNoteRecord) -> dict:
    """Build the MeetingMinutesRead shape from a UniversalNoteRecord.

    Mirrors note_projection._minutes_defaults: meeting_date is an isoformat string
    and attendees/agenda_items/action_items are JSON strings in metadata_json.
    """
    meta = note.metadata_json or {}
    meeting_date = None
    raw_date = meta.get("meeting_date")
    if isinstance(raw_date, str) and raw_date:
        try:
            meeting_date = date.fromisoformat(raw_date[:10])
        except ValueError:
            meeting_date = None
    return {
        "id": note.id,
        "project_id": note.project_id or "default",
        "title": note.title,
        "meeting_date": meeting_date,
        "location": meta.get("location") or "",
        "status": note.status or "draft",
        "template": meta.get("template") or "standard",
        "language": note.language or "vi",
        "source_meeting_id": note.source_file_path or "",
        "attendees": MeetingMinutesRecord.decode_json(meta.get("attendees")),
        "agenda_items": MeetingMinutesRecord.decode_json(meta.get("agenda_items")),
        "action_items": MeetingMinutesRecord.decode_json(meta.get("action_items")),
        "body_markdown": note.body_markdown or "",
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


def _minutes_date_key(value) -> int:
    return value.toordinal() if isinstance(value, date) else 0


def _minutes_ts(value) -> float:
    try:
        return value.timestamp()
    except (AttributeError, OSError, ValueError):
        return 0.0


def serialize_minutes(record: MeetingMinutesRecord) -> dict:
    return {
        "id": record.id,
        "project_id": record.project_id,
        "title": record.title,
        "meeting_date": record.meeting_date,
        "location": record.location or "",
        "status": record.status or "draft",
        "template": record.template or "standard",
        "language": record.language or "vi",
        "source_meeting_id": record.source_meeting_id or "",
        "attendees": MeetingMinutesRecord.decode_json(record.attendees),
        "agenda_items": MeetingMinutesRecord.decode_json(record.agenda_items),
        "action_items": MeetingMinutesRecord.decode_json(record.action_items),
        "body_markdown": record.body_markdown or "",
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


@router.get("", response_model=list[MeetingMinutesRead])
def list_meeting_minutes(
    project_id: str = "default",
    q: str = "",
    status: str = "",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[dict]:
    if settings.minutes_canonical_read == "universal":
        notes = (
            db.query(UniversalNoteRecord)
            .filter(
                UniversalNoteRecord.kind == NoteKind.MEETING_MINUTES,
                UniversalNoteRecord.project_id == project_id,
            )
            .all()
        )
        items = [serialize_minutes_from_universal(note) for note in notes]
        if status.strip():
            items = [m for m in items if m["status"] == status.strip()]
        if q.strip():
            needle = q.strip().lower()
            items = [
                m
                for m in items
                if needle in (m["title"] or "").lower()
                or needle in (m["location"] or "").lower()
                or needle in (m["body_markdown"] or "").lower()
            ]
        items.sort(key=lambda m: (_minutes_date_key(m["meeting_date"]), _minutes_ts(m["updated_at"])), reverse=True)
        return items[offset:offset + limit]
    query = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.project_id == project_id)
    if status.strip():
        query = query.filter(MeetingMinutesRecord.status == status.strip())
    if q.strip():
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                MeetingMinutesRecord.title.ilike(pattern),
                MeetingMinutesRecord.location.ilike(pattern),
                MeetingMinutesRecord.body_markdown.ilike(pattern),
            )
        )
    records = query.order_by(MeetingMinutesRecord.meeting_date.desc(), MeetingMinutesRecord.updated_at.desc()).offset(offset).limit(limit).all()
    return [serialize_minutes(record) for record in records]


@router.post("", response_model=MeetingMinutesRead, status_code=201)
def create_meeting_minutes(payload: MeetingMinutesCreate, db: Session = Depends(get_db)) -> dict:
    if settings.minutes_canonical_read == "universal":
        # G4 step 4b: UniversalNote is canonical; MeetingMinutesRecord is a synced backup.
        note = UniversalNoteRecord(
            id=str(uuid.uuid4()),
            project_id=payload.project_id or "default",
            kind=NoteKind.MEETING_MINUTES,
            status=payload.status or "draft",
            title=payload.title.strip() or "Untitled minutes",
            body_markdown=payload.body_markdown,
            language=payload.language or "vi",
            source_file_path=payload.source_meeting_id or "",
            metadata_json={
                "meeting_date": payload.meeting_date.isoformat() if payload.meeting_date else None,
                "location": payload.location,
                "attendees": MeetingMinutesRecord.encode_json(payload.attendees),
                "agenda_items": MeetingMinutesRecord.encode_json(payload.agenda_items),
                "action_items": MeetingMinutesRecord.encode_json(payload.action_items),
                "template": payload.template or "standard",
            },
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        result = serialize_minutes_from_universal(note)
        safe_backup_minutes_record(db, note)
        return result
    record = MeetingMinutesRecord(
        project_id=payload.project_id or "default",
        title=payload.title.strip() or "Untitled minutes",
        meeting_date=payload.meeting_date,
        location=payload.location,
        status=payload.status or "draft",
        template=payload.template or "standard",
        language=payload.language or "vi",
        source_meeting_id=payload.source_meeting_id or "",
        attendees=MeetingMinutesRecord.encode_json(payload.attendees),
        agenda_items=MeetingMinutesRecord.encode_json(payload.agenda_items),
        action_items=MeetingMinutesRecord.encode_json(payload.action_items),
        body_markdown=payload.body_markdown,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    result = serialize_minutes(record)
    safe_project_meeting_minutes(db, record)
    return result


@router.get("/{minutes_id}", response_model=MeetingMinutesRead)
def get_meeting_minutes(minutes_id: str, db: Session = Depends(get_db)) -> dict:
    if settings.minutes_canonical_read == "universal":
        note = (
            db.query(UniversalNoteRecord)
            .filter(UniversalNoteRecord.id == minutes_id, UniversalNoteRecord.kind == NoteKind.MEETING_MINUTES)
            .first()
        )
        if not note:
            raise HTTPException(status_code=404, detail="Meeting minutes not found")
        return serialize_minutes_from_universal(note)
    record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting minutes not found")
    return serialize_minutes(record)


@router.put("/{minutes_id}", response_model=MeetingMinutesRead)
def update_meeting_minutes(minutes_id: str, payload: MeetingMinutesUpdate, db: Session = Depends(get_db)) -> dict:
    if settings.minutes_canonical_read == "universal":
        note = (
            db.query(UniversalNoteRecord)
            .filter(UniversalNoteRecord.id == minutes_id, UniversalNoteRecord.kind == NoteKind.MEETING_MINUTES)
            .first()
        )
        if not note:
            raise HTTPException(status_code=404, detail="Meeting minutes not found")
        update_data = payload.model_dump(exclude_unset=True)
        meta = dict(note.metadata_json or {})
        if "project_id" in update_data:
            note.project_id = update_data["project_id"] or "default"
        if "title" in update_data:
            note.title = (update_data["title"] or "").strip() or "Untitled minutes"
        if "status" in update_data:
            note.status = update_data["status"]
        if "language" in update_data:
            note.language = update_data["language"]
        if "source_meeting_id" in update_data:
            note.source_file_path = update_data["source_meeting_id"]
        if "body_markdown" in update_data:
            note.body_markdown = update_data["body_markdown"]
        if "meeting_date" in update_data:
            md = update_data["meeting_date"]
            meta["meeting_date"] = md.isoformat() if md else None
        if "location" in update_data:
            meta["location"] = update_data["location"]
        if "template" in update_data:
            meta["template"] = update_data["template"]
        for json_field in ("attendees", "agenda_items", "action_items"):
            if json_field in update_data:
                meta[json_field] = MeetingMinutesRecord.encode_json(update_data[json_field])
        note.metadata_json = meta  # reassign so SQLAlchemy tracks the JSON change
        db.commit()
        db.refresh(note)
        result = serialize_minutes_from_universal(note)
        safe_backup_minutes_record(db, note)
        return result
    record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting minutes not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field in ["project_id", "title", "meeting_date", "location", "status", "template", "language", "source_meeting_id", "body_markdown"]:
        if field in update_data:
            value = update_data[field]
            if field == "project_id":
                value = value or "default"
            if field == "title":
                value = (value or "").strip() or "Untitled minutes"
            setattr(record, field, value)
    if "attendees" in update_data:
        record.attendees = MeetingMinutesRecord.encode_json(update_data["attendees"])
    if "agenda_items" in update_data:
        record.agenda_items = MeetingMinutesRecord.encode_json(update_data["agenda_items"])
    if "action_items" in update_data:
        record.action_items = MeetingMinutesRecord.encode_json(update_data["action_items"])
    db.commit()
    db.refresh(record)
    result = serialize_minutes(record)
    safe_project_meeting_minutes(db, record)
    return result


@router.delete("/{minutes_id}")
def delete_meeting_minutes(minutes_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    if settings.minutes_canonical_read == "universal":
        note = (
            db.query(UniversalNoteRecord)
            .filter(UniversalNoteRecord.id == minutes_id, UniversalNoteRecord.kind == NoteKind.MEETING_MINUTES)
            .first()
        )
        if not note:
            raise HTTPException(status_code=404, detail="Meeting minutes not found")
        db.delete(note)
        db.commit()
        safe_remove_minutes_record(db, minutes_id)
        return {"message": "Meeting minutes deleted"}
    record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting minutes not found")
    db.delete(record)
    db.commit()
    safe_remove_projection(db, minutes_id)
    return {"message": "Meeting minutes deleted"}


@router.get("/{minutes_id}/export/{format}")
def export_meeting_minutes(
    minutes_id: str,
    format: str,
    db: Session = Depends(get_db)
):
    import os
    from fastapi.responses import FileResponse
    from app.services.export_service import ExportService
    from app.core.config import settings

    record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting minutes not found")

    content = record.body_markdown or ""
    if not content.strip():
        raise HTTPException(status_code=400, detail="Minutes content is empty")

    os.makedirs(settings.memo_folder, exist_ok=True)

    if format == "md":
        temp_md = os.path.join(settings.memo_folder, f"minutes_{minutes_id}.md")
        with open(temp_md, "w", encoding="utf-8") as f:
            f.write(content)
        return FileResponse(temp_md, filename=f"Meeting_Minutes_{minutes_id}.md")

    output_path = os.path.join(settings.memo_folder, f"minutes_{minutes_id}.{format}")
    if format == "pdf":
        ExportService.to_pdf(content, output_path)
    elif format == "docx":
        ExportService.to_word(content, output_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

    return FileResponse(output_path, filename=f"Meeting_Minutes_{minutes_id}.{format}")
