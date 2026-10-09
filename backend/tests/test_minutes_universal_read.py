from fastapi.testclient import TestClient

from app.api.routes.meeting_minutes import serialize_minutes, serialize_minutes_from_universal
from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.meeting_minutes import MeetingMinutesRecord
from app.models.note import UniversalNoteRecord

client = TestClient(app)


def _make_minutes(title: str, **overrides) -> str:
    payload = {
        "title": title,
        "meeting_date": "2026-06-12",
        "location": "Room A",
        "status": "draft",
        "template": "standard",
        "language": "vi",
        "attendees": ["Aki", "Bao"],
        "agenda_items": [{"topic": "scope"}],
        "action_items": [{"task": "follow up"}],
        "body_markdown": "notes body",
    }
    payload.update(overrides)
    resp = client.post("/api/meeting-minutes", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


def _cleanup(*ids: str) -> None:
    db = SessionLocal()
    try:
        for note_id in ids:
            db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note_id).delete()
            db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == note_id).delete()
        db.commit()
    finally:
        db.close()


def test_universal_read_matches_legacy_read():
    minutes_id = _make_minutes("Kickoff minutes")
    try:
        db = SessionLocal()
        try:
            legacy = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
            note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == minutes_id).first()
            assert legacy is not None and note is not None
            legacy_view = serialize_minutes(legacy)
            universal_view = serialize_minutes_from_universal(note)
        finally:
            db.close()

        for field in (
            "id",
            "project_id",
            "title",
            "meeting_date",
            "location",
            "status",
            "template",
            "language",
            "source_meeting_id",
            "attendees",
            "agenda_items",
            "action_items",
            "body_markdown",
        ):
            assert legacy_view[field] == universal_view[field], f"mismatch on {field}"
    finally:
        _cleanup(minutes_id)


def test_universal_mode_lists_and_gets_minutes(monkeypatch):
    minutes_id = _make_minutes("Universal listed minutes")
    try:
        monkeypatch.setattr(settings, "minutes_canonical_read", "universal")

        listed = client.get("/api/meeting-minutes?project_id=default")
        assert listed.status_code == 200
        assert any(item["id"] == minutes_id for item in listed.json())

        got = client.get(f"/api/meeting-minutes/{minutes_id}")
        assert got.status_code == 200
        body = got.json()
        assert body["title"] == "Universal listed minutes"
        assert body["attendees"] == ["Aki", "Bao"]
        assert body["meeting_date"] == "2026-06-12"
    finally:
        _cleanup(minutes_id)


def test_universal_mode_crud_keeps_both_tables_in_sync(monkeypatch):
    # G4 step 4b: UniversalNote is the canonical write store for minutes;
    # MeetingMinutesRecord is a synced backup. CRUD must keep both consistent.
    monkeypatch.setattr(settings, "minutes_canonical_read", "universal")

    created = client.post(
        "/api/meeting-minutes",
        json={
            "title": "U minutes",
            "meeting_date": "2026-06-13",
            "location": "Zoom",
            "status": "draft",
            "attendees": ["X"],
            "agenda_items": [],
            "action_items": [],
            "body_markdown": "b",
        },
    )
    assert created.status_code == 201
    minutes_id = created.json()["id"]
    try:
        db = SessionLocal()
        try:
            note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == minutes_id).first()
            legacy = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
            assert note is not None and legacy is not None
            assert note.title == legacy.title == "U minutes"
            assert legacy.location == "Zoom"
        finally:
            db.close()

        updated = client.put(f"/api/meeting-minutes/{minutes_id}", json={"title": "U minutes 2", "location": "Room B"})
        assert updated.status_code == 200
        assert updated.json()["title"] == "U minutes 2"
        assert updated.json()["location"] == "Room B"
        db = SessionLocal()
        try:
            note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == minutes_id).first()
            legacy = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
            assert note.title == legacy.title == "U minutes 2"
            assert legacy.location == "Room B"
            assert (note.metadata_json or {}).get("location") == "Room B"
        finally:
            db.close()

        deleted = client.delete(f"/api/meeting-minutes/{minutes_id}")
        assert deleted.status_code == 200
        db = SessionLocal()
        try:
            assert db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == minutes_id).first() is None
            assert db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first() is None
        finally:
            db.close()
    finally:
        _cleanup(minutes_id)
