import json
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.memo import MemoNoteRecord
from app.models.note import NoteKind, UniversalNoteRecord
from app.schemas.memo import MemoNoteCreate, MemoNoteRead, MemoNoteUpdate
from app.services.note_projection import (
    safe_backup_memo_record,
    safe_project_memo_note,
    safe_remove_memo_record,
    safe_remove_projection,
)

router = APIRouter()

MAX_IMAGES_JSON_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "text/csv": ".csv",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/html": ".html",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
}
ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
    ".pdf", ".xlsx", ".xls", ".docx", ".doc", ".pptx",
    ".csv", ".txt", ".md", ".html", ".htm", ".zip"
}
MAX_MEMO_IMAGE_BYTES = 32 * 1024 * 1024


def memo_image_dir(*parts: str) -> Path:
    path = Path(settings.base_dir) / settings.memo_folder / "images"
    for part in parts:
        path = path / safe_filename(part)
    path.mkdir(parents=True, exist_ok=True)
    return path


def memo_image_path(filename: str) -> Path:
    parts = [safe_filename(part) for part in Path(filename).parts if part not in {"", ".", ".."}]
    if not parts:
        raise HTTPException(status_code=404, detail="Memo image not found")
    return Path(settings.base_dir) / settings.memo_folder / "images" / Path(*parts)


def safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip(".-")
    return cleaned[:80] or "memo-image"


def serialize_memo(record: MemoNoteRecord) -> dict:
    try:
        images = json.loads(record.images or "[]")
    except json.JSONDecodeError:
        images = []
    return {
        "id": record.id,
        "title": record.title,
        "body": record.body or "",
        "tags": record.tags or "",
        "pinned": bool(record.pinned),
        "images": images if isinstance(images, list) else [],
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def encode_images(images: list[dict] | None) -> str:
    value = json.dumps(images or [], ensure_ascii=False)
    if len(value.encode("utf-8")) > MAX_IMAGES_JSON_BYTES:
        raise HTTPException(status_code=413, detail="Memo images are too large. Use fewer or smaller screenshots.")
    return value


@router.post("/images", status_code=201)
async def upload_memo_image(file: UploadFile = File(...)):
    suffix = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not suffix and file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext in ALLOWED_EXTENSIONS:
            suffix = ext
    if not suffix:
        # Anything outside the allow-list (executables, scripts, unknown/no extension) is refused.
        raise HTTPException(status_code=415, detail="Loại tệp này không được hỗ trợ.")

    content = await file.read()
    if len(content) > MAX_MEMO_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Tài liệu tải lên vượt quá giới hạn 32MB.")
    image_id = str(uuid.uuid4())
    original = safe_filename(file.filename or "document")
    filename = f"{image_id}{suffix}"
    now = datetime.now(UTC)
    year = f"{now.year:04d}"
    month = f"{now.month:02d}"
    path = memo_image_dir(year, month) / filename
    path.write_bytes(content)
    return {
        "id": image_id,
        "name": original,
        "url": f"/memos/images/{year}/{month}/{filename}",
        "created_at": now.isoformat(),
    }


@router.get("/images/{filename:path}")
def get_memo_image(filename: str):
    path = memo_image_path(filename)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")

    ext = path.suffix.lower()
    media_type = "application/octet-stream"

    if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}:
        media_type = f"image/{ext.lstrip('.')}"
        if ext in {".jpg", ".jpeg"}:
            media_type = "image/jpeg"
        elif ext == ".svg":
            media_type = "image/svg+xml"
    elif ext == ".pdf":
        # Auto-detect if file is an HTML document disguised as PDF
        try:
            sample = path.read_bytes()[:120].lower()
            if b"<!doctype html" in sample or b"<html" in sample:
                media_type = "text/html; charset=utf-8"
            else:
                media_type = "application/pdf"
        except Exception:
            media_type = "application/pdf"
    elif ext == ".xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif ext == ".xls":
        media_type = "application/vnd.ms-excel"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".doc":
        media_type = "application/msword"
    elif ext == ".pptx":
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    elif ext == ".csv":
        media_type = "text/csv; charset=utf-8"
    elif ext in {".txt", ".md"}:
        media_type = "text/plain; charset=utf-8"
    elif ext in {".html", ".htm"}:
        media_type = "text/html; charset=utf-8"

    headers = {
        "Content-Disposition": f"inline; filename=\"{path.name}\"",
        # Never let the browser guess a more dangerous type than the one we declared.
        "X-Content-Type-Options": "nosniff",
    }
    if media_type.startswith(("text/html", "image/svg+xml")):
        # Active content stays viewable but runs in a sandbox: no scripts, unique origin, so an
        # uploaded page cannot read the app's data or call its API (stored-XSS hardening).
        headers["Content-Security-Policy"] = "sandbox"

    return FileResponse(path, media_type=media_type, headers=headers)


def serialize_memo_from_universal(note: UniversalNoteRecord) -> dict:
    """Build the MemoNoteRead shape from a UniversalNoteRecord (kind=personal_memo).

    Mirrors the mapping in note_projection._memo_defaults: body<-body_markdown and
    tags/pinned/images live in metadata_json (images is a JSON string there).
    """
    meta = note.metadata_json or {}
    images_raw = meta.get("images")
    if isinstance(images_raw, str):
        try:
            images = json.loads(images_raw or "[]")
        except json.JSONDecodeError:
            images = []
    elif isinstance(images_raw, list):
        images = images_raw
    else:
        images = []
    return {
        "id": note.id,
        "title": note.title,
        "body": note.body_markdown or "",
        "tags": meta.get("tags") or "",
        "pinned": bool(meta.get("pinned")),
        "images": images if isinstance(images, list) else [],
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


def _memo_sort_timestamp(value) -> float:
    try:
        return value.timestamp()
    except (AttributeError, OSError, ValueError):
        return 0.0


@router.get("", response_model=list[MemoNoteRead])
def list_memos(db: Session = Depends(get_db)):
    # G4 step 3a: optionally serve memos from the consolidated UniversalNote store.
    # Default ("legacy") is unchanged; writes stay dual so this is reversible.
    if settings.memo_canonical_read == "universal":
        notes = (
            db.query(UniversalNoteRecord)
            .filter(UniversalNoteRecord.kind == NoteKind.PERSONAL_MEMO)
            .all()
        )
        memos = [serialize_memo_from_universal(note) for note in notes]
        # UniversalNote has no pinned column: pinned-first, then newest first.
        memos.sort(key=lambda memo: (0 if memo["pinned"] else 1, -_memo_sort_timestamp(memo["updated_at"])))
        return memos
    records = (
        db.query(MemoNoteRecord)
        .order_by(MemoNoteRecord.pinned.desc(), MemoNoteRecord.updated_at.desc())
        .all()
    )
    return [serialize_memo(record) for record in records]


@router.post("", response_model=MemoNoteRead, status_code=201)
def create_memo(payload: MemoNoteCreate, db: Session = Depends(get_db)):
    if settings.memo_canonical_read == "universal":
        # G4 step 3b: UniversalNote is the canonical store; MemoNoteRecord is a
        # best-effort synced backup so rollback (flag -> legacy) loses nothing.
        note = UniversalNoteRecord(
            id=str(uuid.uuid4()),
            kind=NoteKind.PERSONAL_MEMO,
            status="completed",
            title=payload.title.strip() or "Untitled memo",
            body_markdown=payload.body,
            metadata_json={
                "tags": payload.tags,
                "pinned": payload.pinned,
                "images": encode_images(payload.images),
            },
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        result = serialize_memo_from_universal(note)
        safe_backup_memo_record(db, note)
        return result
    record = MemoNoteRecord(
        title=payload.title.strip() or "Untitled memo",
        body=payload.body,
        tags=payload.tags,
        pinned=payload.pinned,
        images=encode_images(payload.images),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    result = serialize_memo(record)
    safe_project_memo_note(db, record)
    return result


@router.put("/{memo_id}", response_model=MemoNoteRead)
def update_memo(memo_id: str, payload: MemoNoteUpdate, db: Session = Depends(get_db)):
    if settings.memo_canonical_read == "universal":
        note = (
            db.query(UniversalNoteRecord)
            .filter(UniversalNoteRecord.id == memo_id, UniversalNoteRecord.kind == NoteKind.PERSONAL_MEMO)
            .first()
        )
        if not note:
            raise HTTPException(status_code=404, detail="Memo not found")
        update_data = payload.model_dump(exclude_unset=True)
        meta = dict(note.metadata_json or {})
        if "title" in update_data:
            note.title = (update_data["title"] or "").strip() or "Untitled memo"
        if "body" in update_data:
            note.body_markdown = update_data["body"] or ""
        if "tags" in update_data:
            meta["tags"] = update_data["tags"] or ""
        if "pinned" in update_data:
            meta["pinned"] = bool(update_data["pinned"])
        if "images" in update_data:
            meta["images"] = encode_images(update_data["images"])
        note.metadata_json = meta  # reassign so SQLAlchemy tracks the JSON change
        db.commit()
        db.refresh(note)
        result = serialize_memo_from_universal(note)
        safe_backup_memo_record(db, note)
        return result
    record = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Memo not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "title" in update_data:
        record.title = (update_data["title"] or "").strip() or "Untitled memo"
    if "body" in update_data:
        record.body = update_data["body"] or ""
    if "tags" in update_data:
        record.tags = update_data["tags"] or ""
    if "pinned" in update_data:
        record.pinned = bool(update_data["pinned"])
    if "images" in update_data:
        record.images = encode_images(update_data["images"])
    db.commit()
    db.refresh(record)
    result = serialize_memo(record)
    safe_project_memo_note(db, record)
    return result


@router.delete("/{memo_id}")
def delete_memo(memo_id: str, db: Session = Depends(get_db)):
    if settings.memo_canonical_read == "universal":
        note = (
            db.query(UniversalNoteRecord)
            .filter(UniversalNoteRecord.id == memo_id, UniversalNoteRecord.kind == NoteKind.PERSONAL_MEMO)
            .first()
        )
        if not note:
            raise HTTPException(status_code=404, detail="Memo not found")
        db.delete(note)
        db.commit()
        safe_remove_memo_record(db, memo_id)
        return {"message": "Memo deleted"}
    record = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Memo not found")
    db.delete(record)
    db.commit()
    safe_remove_projection(db, memo_id)
    return {"message": "Memo deleted"}
