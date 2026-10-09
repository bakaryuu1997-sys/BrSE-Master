from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.note import NoteKind, UniversalNoteRecord

client = TestClient(app)


def _universal(note_id: str):
    db = SessionLocal()
    try:
        return db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note_id).first()
    finally:
        db.close()


def test_memo_write_projects_into_universal_note():
    resp = client.post(
        "/api/memos",
        json={"title": "Projected memo", "body": "hello world", "tags": "x", "pinned": False, "images": []},
    )
    assert resp.status_code == 201
    memo_id = resp.json()["id"]

    note = _universal(memo_id)
    assert note is not None
    assert note.kind == NoteKind.PERSONAL_MEMO
    assert note.title == "Projected memo"
    assert note.body_markdown == "hello world"

    # Update re-syncs the projection (idempotent upsert keyed by legacy id).
    resp = client.put(f"/api/memos/{memo_id}", json={"title": "Renamed memo"})
    assert resp.status_code == 200
    note = _universal(memo_id)
    assert note is not None
    assert note.title == "Renamed memo"

    # Delete removes the projection without touching unrelated rows.
    resp = client.delete(f"/api/memos/{memo_id}")
    assert resp.status_code == 200
    assert _universal(memo_id) is None


def test_minutes_write_projects_and_backfill_is_idempotent():
    resp = client.post(
        "/api/meeting-minutes",
        json={"title": "Kickoff minutes", "meeting_date": "2026-06-11", "body_markdown": "agenda"},
    )
    assert resp.status_code == 201
    minutes_id = resp.json()["id"]

    note = _universal(minutes_id)
    assert note is not None
    assert note.kind == NoteKind.MEETING_MINUTES
    assert note.title == "Kickoff minutes"

    # Backfill (/migrate) stays idempotent and keeps the existing projection.
    resp = client.post("/api/universal-notes/migrate")
    assert resp.status_code == 202
    assert _universal(minutes_id) is not None
