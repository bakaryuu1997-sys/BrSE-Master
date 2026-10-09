import io
import zipfile
import json
from fastapi.testclient import TestClient
from app.main import app

def test_backup_restore_full_roundtrip() -> None:
    client = TestClient(app)
    
    # 1. Insert seed data via client-state API
    key = "brse.backupTest.v1"
    put_response = client.put(
        f"/api/client-state/entry/{key}", 
        json={"key": key, "value": "backup-restore-pass"}
    )
    assert put_response.status_code == 200
    
    # 2. Trigger the system backup
    backup_response = client.post("/api/settings/backup")
    assert backup_response.status_code == 200
    assert backup_response.headers["content-type"] == "application/zip"
    
    # Check that backup content has database_dump.json and our key
    backup_bytes = backup_response.content
    zip_buffer = io.BytesIO(backup_bytes)
    with zipfile.ZipFile(zip_buffer, "r") as zip_file:
        file_list = zip_file.namelist()
        assert "database_dump.json" in file_list
        
        db_dump_raw = zip_file.read("database_dump.json").decode("utf-8")
        db_dump = json.loads(db_dump_raw)
        assert "ClientStateRecord" in db_dump
        
        # Verify our seed key is preserved inside the json dump
        seed_records = [
            r for r in db_dump["ClientStateRecord"] 
            if r["key"] == key
        ]
        assert len(seed_records) == 1
        assert seed_records[0]["value"] == "backup-restore-pass"
        
    # 3. Simulate data loss or edit
    edit_response = client.put(
        f"/api/client-state/entry/{key}", 
        json={"key": key, "value": "deleted-corrupted"}
    )
    assert edit_response.status_code == 200
    
    get_corrupt = client.get(f"/api/client-state/entry/{key}")
    assert get_corrupt.status_code == 200
    assert get_corrupt.json()["value"] == "deleted-corrupted"
    
    # 4. Trigger restore from backup ZIP
    restore_files = {
        "file": ("backup.brsebackup", backup_bytes, "application/zip")
    }
    restore_response = client.post("/api/settings/restore", files=restore_files)
    if restore_response.status_code != 200:
        print("RESTORE FAILED:", restore_response.json())
    assert restore_response.status_code == 200
    assert restore_response.json()["status"] == "success"
    
    # 5. Verify data is perfectly restored
    get_restored = client.get(f"/api/client-state/entry/{key}")
    assert get_restored.status_code == 200
    assert get_restored.json()["value"] == "backup-restore-pass"


def test_backup_covers_legacy_note_tables() -> None:
    # G4 contract step 2: legacy note tables must have export coverage BEFORE any
    # UniversalNote-backed write switch. The full-DB /settings/backup already
    # serializes them; this test locks that in so it can't silently regress.
    client = TestClient(app)

    memo = client.post(
        "/api/memos",
        json={"title": "Backup memo", "body": "b", "tags": "", "pinned": False, "images": []},
    )
    assert memo.status_code == 201
    memo_id = memo.json()["id"]

    minutes = client.post(
        "/api/meeting-minutes",
        json={"title": "Backup minutes", "meeting_date": "2026-06-12", "body_markdown": "m"},
    )
    assert minutes.status_code == 201
    minutes_id = minutes.json()["id"]

    backup_response = client.post("/api/settings/backup")
    assert backup_response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(backup_response.content), "r") as zip_file:
        db_dump = json.loads(zip_file.read("database_dump.json").decode("utf-8"))

    assert any(row["id"] == memo_id for row in db_dump.get("MemoNoteRecord", []))
    assert any(row["id"] == minutes_id for row in db_dump.get("MeetingMinutesRecord", []))
    # The consolidation projection table is covered by the same export.
    assert "UniversalNoteRecord" in db_dump
