from fastapi.testclient import TestClient

from app.api.routes.memos import serialize_memo, serialize_memo_from_universal
from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.memo import MemoNoteRecord
from app.models.note import UniversalNoteRecord

client = TestClient(app)


def _make_memo(title: str, *, body: str = "b", tags: str = "t", pinned: bool = False, images=None) -> str:
    resp = client.post(
        "/api/memos",
        json={"title": title, "body": body, "tags": tags, "pinned": pinned, "images": images or []},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _cleanup(*ids: str) -> None:
    db = SessionLocal()
    try:
        for memo_id in ids:
            db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == memo_id).delete()
            db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).delete()
        db.commit()
    finally:
        db.close()


def test_universal_read_matches_legacy_read():
    # G4 contract gate: old (legacy) and new (universal) reads must match.
    memo_id = _make_memo(
        "Equiv memo",
        body="hello",
        tags="x,y",
        pinned=True,
        images=[{"id": "i1", "url": "/memos/images/i1.png", "name": "shot"}],
    )
    client.put(f"/api/memos/{memo_id}", json={"body": "updated body"})
    try:
        db = SessionLocal()
        try:
            legacy = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).first()
            note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == memo_id).first()
            assert legacy is not None and note is not None
            legacy_view = serialize_memo(legacy)
            universal_view = serialize_memo_from_universal(note)
        finally:
            db.close()

        for field in ("id", "title", "body", "tags", "pinned", "images"):
            assert legacy_view[field] == universal_view[field], f"mismatch on {field}"
    finally:
        _cleanup(memo_id)


def test_universal_mode_lists_memos_pinned_first(monkeypatch):
    plain_id = _make_memo("Plain memo", pinned=False)
    pinned_id = _make_memo("Pinned memo", pinned=True)
    try:
        monkeypatch.setattr(settings, "memo_canonical_read", "universal")
        resp = client.get("/api/memos")
        assert resp.status_code == 200
        ids = [memo["id"] for memo in resp.json()]
        assert plain_id in ids and pinned_id in ids
        # pinned memo must sort before the unpinned one
        assert ids.index(pinned_id) < ids.index(plain_id)
    finally:
        _cleanup(plain_id, pinned_id)


def test_universal_mode_crud_keeps_both_tables_in_sync(monkeypatch):
    # G4 step 3b: UniversalNote is the canonical write store; MemoNoteRecord is a
    # synced backup. Every CRUD op must keep both tables consistent.
    monkeypatch.setattr(settings, "memo_canonical_read", "universal")

    created = client.post(
        "/api/memos",
        json={"title": "U memo", "body": "b1", "tags": "t1", "pinned": False, "images": []},
    )
    assert created.status_code == 201
    memo_id = created.json()["id"]
    try:
        db = SessionLocal()
        try:
            note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == memo_id).first()
            legacy = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).first()
            assert note is not None and legacy is not None
            assert note.title == legacy.title == "U memo"
            assert (note.body_markdown or "") == legacy.body == "b1"
        finally:
            db.close()

        updated = client.put(f"/api/memos/{memo_id}", json={"title": "U memo 2", "pinned": True})
        assert updated.status_code == 200
        assert updated.json()["title"] == "U memo 2"
        assert updated.json()["pinned"] is True
        db = SessionLocal()
        try:
            note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == memo_id).first()
            legacy = db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).first()
            assert note.title == legacy.title == "U memo 2"
            assert (note.metadata_json or {}).get("pinned") is True
            assert legacy.pinned is True
        finally:
            db.close()

        deleted = client.delete(f"/api/memos/{memo_id}")
        assert deleted.status_code == 200
        db = SessionLocal()
        try:
            assert db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == memo_id).first() is None
            assert db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).first() is None
        finally:
            db.close()
    finally:
        _cleanup(memo_id)
