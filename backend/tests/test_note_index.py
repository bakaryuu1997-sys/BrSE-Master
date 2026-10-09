from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.meeting import MeetingRecord
from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.memo import MemoNoteRecord


client = TestClient(app)


def test_note_index_search_covers_all_note_surfaces() -> None:
    token = f"noteindex-{uuid4().hex[:10]}"
    meeting_id = f"mt-{uuid4().hex[:30]}"
    memo_path = Path(settings.memo_folder) / f"{meeting_id}.md"
    memo_path.parent.mkdir(parents=True, exist_ok=True)
    memo_path.write_text(f"# Meeting memo\n\nDecision includes {token}", encoding="utf-8")

    db = SessionLocal()
    try:
        db.add(
            MemoNoteRecord(
                title=f"Memo note {token}",
                body=f"Internal memo body with {token}",
                tags="pytest,note-index",
            )
        )
        db.add(
            MeetingMinutesRecord(
                project_id="pytest-note-index",
                title=f"Minutes {token}",
                meeting_date=datetime.now(UTC).date(),
                status="completed",
                template="customer",
                language="ja-vi",
                body_markdown=f"Formal minutes body with {token}",
            )
        )
        db.add(
            MeetingRecord(
                id=meeting_id,
                title=f"Meeting memo {token}",
                status="completed",
                filename="source.mp4",
                memo_path=str(memo_path),
                language="vi",
                template="meeting",
                created_at=datetime.now(UTC),
                completed_at=datetime.now(UTC),
            )
        )
        db.commit()
    finally:
        db.close()

    try:
        response = client.get("/api/note-index/search", params={"q": token, "limit": 10})
        assert response.status_code == 200
        sources = {item["source"] for item in response.json()}
        assert {"memo_note", "meeting_minutes", "meeting_memo"}.issubset(sources)

        by_source = {item["source"]: item for item in response.json()}
        assert by_source["memo_note"]["href"].startswith("/app/notes?noteId=")
        assert by_source["meeting_minutes"]["href"].startswith("/app/minutes/new?minutesId=")
        assert by_source["meeting_memo"]["href"].startswith("/app/meeting-note?search=")
    finally:
        db = SessionLocal()
        try:
            db.query(MemoNoteRecord).filter(MemoNoteRecord.title == f"Memo note {token}").delete()
            db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.title == f"Minutes {token}").delete()
            db.query(MeetingRecord).filter(MeetingRecord.id == meeting_id).delete()
            db.commit()
        finally:
            db.close()
        if memo_path.exists():
            memo_path.unlink()
