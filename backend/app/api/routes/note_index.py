import os
import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.meeting import MeetingRecord
from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.memo import MemoNoteRecord

router = APIRouter()


def normalize_query(value: str) -> str:
    return " ".join(value.lower().strip().split())


def safe_read_text(path: str | None, max_chars: int = 16000) -> str:
    if not path or not os.path.exists(path) or not os.path.isfile(path):
        return ""
    try:
        with open(path, encoding="utf-8") as file:
            return file.read(max_chars)
    except OSError:
        return ""


def make_snippet(text: str, query: str, max_chars: int = 180) -> str:
    compact = re.sub(r"\s+", " ", text or "").strip()
    if not compact:
        return ""
    if not query:
        return compact[:max_chars]
    index = compact.lower().find(query)
    if index < 0:
        return compact[:max_chars]
    start = max(index - 50, 0)
    end = min(index + len(query) + max_chars - 50, len(compact))
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(compact) else ""
    return f"{prefix}{compact[start:end]}{suffix}"


def score_note(title: str, body: str, tags: str, query: str) -> int:
    if not query:
        return 1
    haystack_title = title.lower()
    haystack_tags = tags.lower()
    haystack_body = body.lower()
    score = 0
    if query in haystack_title:
        score += 80
    if query in haystack_tags:
        score += 45
    if query in haystack_body:
        score += 25
    for token in query.split():
        if token in haystack_title:
            score += 12
        if token in haystack_tags:
            score += 8
        if token in haystack_body:
            score += 4
    return score


def updated_value(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value or "")


@router.get("/search")
def search_note_index(
    q: str = "",
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    query = normalize_query(q)
    results: list[dict[str, Any]] = []

    memo_records = db.query(MemoNoteRecord).order_by(MemoNoteRecord.updated_at.desc()).limit(200).all()
    for record in memo_records:
        body = record.body or ""
        score = score_note(record.title or "", body, record.tags or "", query)
        if query and score <= 0:
            continue
        results.append(
            {
                "id": record.id,
                "source": "memo_note",
                "source_label": "Memo Note",
                "title": record.title or "Untitled memo",
                "snippet": make_snippet(body, query),
                "href": f"/app/notes?noteId={record.id}&q={q}",
                "updated_at": updated_value(record.updated_at),
                "score": score,
            }
        )

    minutes_records = db.query(MeetingMinutesRecord).order_by(MeetingMinutesRecord.updated_at.desc()).limit(200).all()
    for record in minutes_records:
        body = record.body_markdown or ""
        tags = " ".join([record.status or "", record.template or "", record.language or "", record.location or ""])
        score = score_note(record.title or "", body, tags, query)
        if query and score <= 0:
            continue
        results.append(
            {
                "id": record.id,
                "source": "meeting_minutes",
                "source_label": "Meeting Minutes",
                "title": record.title or "Untitled minutes",
                "snippet": make_snippet(body, query),
                "href": f"/app/minutes/new?minutesId={record.id}",
                "updated_at": updated_value(record.updated_at),
                "score": score,
            }
        )

    meeting_records = (
        db.query(MeetingRecord)
        .filter(MeetingRecord.status == "completed")
        .order_by(MeetingRecord.completed_at.desc().nullslast(), MeetingRecord.created_at.desc())
        .limit(120)
        .all()
    )
    for record in meeting_records:
        memo_path = record.memo_path or os.path.join(settings.memo_folder, f"{record.id}.md")
        body = safe_read_text(memo_path)
        tags = " ".join([record.language or "", record.template or "", record.filename or ""])
        score = score_note(record.title or "", body, tags, query)
        if query and score <= 0:
            continue
        results.append(
            {
                "id": record.id,
                "source": "meeting_memo",
                "source_label": "Meeting Memo",
                "title": record.title or "Meeting memo",
                "snippet": make_snippet(body, query),
                "href": f"/app/meeting-note?search={q}&meeting={record.id}",
                "updated_at": updated_value(record.completed_at or record.created_at),
                "score": score,
            }
        )

    results.sort(key=lambda item: (item["score"], item["updated_at"]), reverse=True)
    return results[:limit]
