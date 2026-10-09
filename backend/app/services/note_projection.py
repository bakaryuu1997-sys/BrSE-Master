"""Read-through projection of legacy note tables into ``UniversalNoteRecord``.

This is step 1 of the data-model consolidation contract in
``docs/PROJECT_SOURCE_OF_TRUTH.md`` section 5: keep the legacy tables
(``MemoNoteRecord``, ``MeetingMinutesRecord``) as the canonical write path and
mirror every write into ``UniversalNoteRecord`` as a **non-destructive** index.

Rules honoured here:
- Projection never owns the data; it only mirrors. Legacy rows stay canonical.
- Projection failures must never break the legacy write — callers use the
  ``safe_*`` wrappers which swallow and log errors and roll back only the
  projection's own uncommitted changes.
- Upserts are keyed by the legacy record id so projecting twice is idempotent.
"""

import json
import logging
from datetime import date

from sqlalchemy.orm import Session

from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.memo import MemoNoteRecord
from app.models.note import NoteKind, UniversalNoteRecord

logger = logging.getLogger(__name__)


def _memo_defaults(memo: MemoNoteRecord) -> dict:
    return {
        "title": memo.title or "Untitled memo",
        "kind": NoteKind.PERSONAL_MEMO,
        "status": "completed",
        "body_markdown": memo.body or "",
        "metadata_json": {"tags": memo.tags, "pinned": memo.pinned, "images": memo.images},
        "created_at": memo.created_at,
        "updated_at": memo.updated_at,
    }


def _minutes_defaults(minutes: MeetingMinutesRecord) -> dict:
    return {
        "project_id": minutes.project_id or "default",
        "title": minutes.title or "Untitled minutes",
        "kind": NoteKind.MEETING_MINUTES,
        "status": minutes.status or "draft",
        "body_markdown": minutes.body_markdown or "",
        "metadata_json": {
            "meeting_date": minutes.meeting_date.isoformat() if minutes.meeting_date else None,
            "location": minutes.location,
            "attendees": minutes.attendees,
            "agenda_items": minutes.agenda_items,
            "action_items": minutes.action_items,
            "template": minutes.template,
        },
        "language": minutes.language or "vi",
        "source_file_path": minutes.source_meeting_id,
        "created_at": minutes.created_at,
        "updated_at": minutes.updated_at,
    }


def _upsert(db: Session, note_id: str, defaults: dict) -> None:
    record = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note_id).first()
    if record is None:
        db.add(UniversalNoteRecord(id=note_id, **defaults))
    else:
        for key, value in defaults.items():
            setattr(record, key, value)


def project_memo_note(db: Session, memo: MemoNoteRecord) -> None:
    _upsert(db, memo.id, _memo_defaults(memo))
    db.commit()


def project_meeting_minutes(db: Session, minutes: MeetingMinutesRecord) -> None:
    _upsert(db, minutes.id, _minutes_defaults(minutes))
    db.commit()


def remove_projection(db: Session, note_id: str) -> None:
    record = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note_id).first()
    if record is not None:
        db.delete(record)
        db.commit()


def backfill_all(db: Session) -> int:
    """Re-sync every legacy memo and minutes row into UniversalNoteRecord."""
    count = 0
    for memo in db.query(MemoNoteRecord).all():
        _upsert(db, memo.id, _memo_defaults(memo))
        count += 1
    for minutes in db.query(MeetingMinutesRecord).all():
        _upsert(db, minutes.id, _minutes_defaults(minutes))
        count += 1
    db.commit()
    return count


# --- Safe wrappers: projection must never break a legacy write -------------

def safe_project_memo_note(db: Session, memo: MemoNoteRecord) -> None:
    try:
        project_memo_note(db, memo)
    except Exception:  # pragma: no cover - defensive, legacy write already committed
        logger.exception("UniversalNote projection failed for memo %s", getattr(memo, "id", "?"))
        db.rollback()


def safe_project_meeting_minutes(db: Session, minutes: MeetingMinutesRecord) -> None:
    try:
        project_meeting_minutes(db, minutes)
    except Exception:  # pragma: no cover - defensive
        logger.exception("UniversalNote projection failed for minutes %s", getattr(minutes, "id", "?"))
        db.rollback()


def safe_remove_projection(db: Session, note_id: str) -> None:
    try:
        remove_projection(db, note_id)
    except Exception:  # pragma: no cover - defensive
        logger.exception("UniversalNote projection removal failed for %s", note_id)
        db.rollback()


# --- Reverse backup: UniversalNote -> MemoNoteRecord (G4 step 3b) ----------
# When UniversalNote is the canonical memo store, MemoNoteRecord is kept as a
# best-effort synced backup so rollback (flip MEMO_CANONICAL_READ=legacy) never
# loses data. Failures here must never break the canonical UniversalNote write.

def backup_memo_record(db: Session, note: UniversalNoteRecord) -> None:
    meta = note.metadata_json or {}
    images = meta.get("images")
    if not isinstance(images, str):
        images = json.dumps(images or [], ensure_ascii=False)
    record = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == note.id).first()
    if record is None:
        record = MemoNoteRecord(id=note.id)
        db.add(record)
    record.title = note.title
    record.body = note.body_markdown or ""
    record.tags = meta.get("tags") or ""
    record.pinned = bool(meta.get("pinned"))
    record.images = images
    db.commit()


def safe_backup_memo_record(db: Session, note: UniversalNoteRecord) -> None:
    try:
        backup_memo_record(db, note)
    except Exception:  # pragma: no cover - defensive; canonical write already committed
        logger.exception("MemoNoteRecord backup failed for %s", getattr(note, "id", "?"))
        db.rollback()


def safe_remove_memo_record(db: Session, note_id: str) -> None:
    try:
        record = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == note_id).first()
        if record is not None:
            db.delete(record)
            db.commit()
    except Exception:  # pragma: no cover - defensive
        logger.exception("MemoNoteRecord backup removal failed for %s", note_id)
        db.rollback()


# --- Reverse backup: UniversalNote -> MeetingMinutesRecord (G4 step 4b) -----

def _as_json_str(value) -> str:
    return value if isinstance(value, str) else json.dumps(value or [], ensure_ascii=False)


def backup_minutes_record(db: Session, note: UniversalNoteRecord) -> None:
    meta = note.metadata_json or {}
    meeting_date = None
    raw_date = meta.get("meeting_date")
    if isinstance(raw_date, str) and raw_date:
        try:
            meeting_date = date.fromisoformat(raw_date[:10])
        except ValueError:
            meeting_date = None
    record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == note.id).first()
    if record is None:
        record = MeetingMinutesRecord(id=note.id)
        db.add(record)
    record.project_id = note.project_id or "default"
    record.title = note.title
    record.meeting_date = meeting_date
    record.location = meta.get("location") or ""
    record.status = note.status or "draft"
    record.template = meta.get("template") or "standard"
    record.language = note.language or "vi"
    record.source_meeting_id = note.source_file_path or ""
    record.attendees = _as_json_str(meta.get("attendees"))
    record.agenda_items = _as_json_str(meta.get("agenda_items"))
    record.action_items = _as_json_str(meta.get("action_items"))
    record.body_markdown = note.body_markdown or ""
    db.commit()


def safe_backup_minutes_record(db: Session, note: UniversalNoteRecord) -> None:
    try:
        backup_minutes_record(db, note)
    except Exception:  # pragma: no cover - defensive; canonical write already committed
        logger.exception("MeetingMinutesRecord backup failed for %s", getattr(note, "id", "?"))
        db.rollback()


def safe_remove_minutes_record(db: Session, note_id: str) -> None:
    try:
        record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == note_id).first()
        if record is not None:
            db.delete(record)
            db.commit()
    except Exception:  # pragma: no cover - defensive
        logger.exception("MeetingMinutesRecord backup removal failed for %s", note_id)
        db.rollback()
