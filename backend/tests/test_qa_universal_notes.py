from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.note import UniversalNoteRecord, NoteKind
from app.models.memo import MemoNoteRecord
from app.models.meeting_minutes import MeetingMinutesRecord
from datetime import date

client = TestClient(app)

def test_note_migration_logic():
    db = SessionLocal()
    # 1. Setup dummy old records
    memo_id = "old-memo-1"
    minutes_id = "old-minutes-1"
    
    # Cleanup if exists
    db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id.in_([memo_id, minutes_id])).delete()
    db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).delete()
    db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).delete()
    db.commit()
    
    db.add(MemoNoteRecord(id=memo_id, title="Old Memo", body="Old content", tags="test"))
    db.add(MeetingMinutesRecord(id=minutes_id, title="Old Minutes", meeting_date=date.today()))
    db.commit()
    
    # 2. Trigger migration
    response = client.post("/api/universal-notes/migrate")
    assert response.status_code == 202
    
    # 3. Verify migration
    memo_note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == memo_id).first()
    assert memo_note is not None
    assert memo_note.kind == NoteKind.PERSONAL_MEMO
    assert memo_note.body_markdown == "Old content"
    
    min_note = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == minutes_id).first()
    assert min_note is not None
    assert min_note.kind == NoteKind.MEETING_MINUTES
    
    # 4. Verify list API
    list_response = client.get("/api/universal-notes/")
    assert list_response.status_code == 200
    ids = [n["id"] for n in list_response.json()]
    assert memo_id in ids
    assert minutes_id in ids

    # Cleanup
    db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id.in_([memo_id, minutes_id])).delete()
    db.query(MemoNoteRecord).filter(MemoNoteRecord.id == memo_id).delete()
    db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).delete()
    db.commit()
    db.close()

def test_get_universal_note_not_found():
    response = client.get("/api/universal-notes/non-existent")
    assert response.status_code == 404


def test_link_universal_notes():
    db = SessionLocal()
    note1_id = "test-note-1"
    note2_id = "test-note-2"
    
    # Cleanup if exists
    db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id.in_([note1_id, note2_id])).delete()
    db.commit()
    
    # Setup two notes
    db.add(UniversalNoteRecord(id=note1_id, title="Note One", kind=NoteKind.PERSONAL_MEMO, body_markdown="Body 1", metadata_json={}))
    db.add(UniversalNoteRecord(id=note2_id, title="Note Two", kind=NoteKind.MEETING_MINUTES, body_markdown="Body 2", metadata_json={}))
    db.commit()
    
    # Trigger mutual linking
    response = client.post(f"/api/universal-notes/{note1_id}/link", json={"target_note_id": note2_id})
    assert response.status_code == 200
    assert response.json()["message"] == "Notes linked successfully"
    
    # Verify linking in database
    note1 = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note1_id).first()
    note2 = db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id == note2_id).first()
    
    assert note1.metadata_json.get("cross_links")[0]["id"] == note2_id
    assert note2.metadata_json.get("cross_links")[0]["id"] == note1_id
    
    # Cleanup
    db.query(UniversalNoteRecord).filter(UniversalNoteRecord.id.in_([note1_id, note2_id])).delete()
    db.commit()
    db.close()
