import os
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.meeting import MeetingRecord

client = TestClient(app)

def test_resumable_upload_full_flow():
    # 1. Init upload
    filename = "test-video.mp4"
    file_size = 100
    init_payload = {
        "filename": filename,
        "file_size": file_size,
        "language": "vi",
        "template": "meeting"
    }
    response = client.post("/api/meetings/uploads/init", json=init_payload)
    assert response.status_code == 200
    data = response.json()
    job_id = data["job_id"]
    assert data["received_bytes"] == 0
    assert data["file_size"] == file_size

    # 2. Upload first chunk (40 bytes)
    chunk1 = b"a" * 40
    response = client.put(f"/api/meetings/{job_id}/chunk?offset=0", content=chunk1)
    assert response.status_code == 200
    assert response.json()["received_bytes"] == 40

    # 3. Test Wrong Offset (Negative test)
    response = client.put(f"/api/meetings/{job_id}/chunk?offset=10", content=b"error")
    assert response.status_code == 409
    assert response.json()["detail"]["expected_offset"] == 40

    # 4. Upload remaining chunk (60 bytes)
    chunk2 = b"b" * 60
    response = client.put(f"/api/meetings/{job_id}/chunk?offset=40", content=chunk2)
    assert response.status_code == 200
    assert response.json()["received_bytes"] == 100
    assert response.json()["complete"] is True

    # 5. Complete upload
    response = client.post(f"/api/meetings/{job_id}/complete")
    assert response.status_code == 200
    assert response.json()["status"] == "processing"

    # Cleanup
    db = SessionLocal()
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if record:
        if record.file_path and os.path.exists(record.file_path):
            os.remove(record.file_path)
        db.delete(record)
        db.commit()
    db.close()

def test_upload_init_rejects_large_file():
    # Max size is usually set in settings, let's try a very large number
    init_payload = {
        "filename": "huge.mp4",
        "file_size": 5 * 1024 * 1024 * 1024, # 5GB
        "language": "vi",
        "template": "meeting"
    }
    response = client.post("/api/meetings/uploads/init", json=init_payload)
    assert response.status_code == 413 # Payload Too Large

def test_resumable_status_non_existent():
    response = client.get(f"/api/meetings/{uuid.uuid4()}/status")
    assert response.status_code == 404



def test_resumable_upload_frontend_alias_routes():
    init_payload = {
        "filename": "alias-video.mp4",
        "file_size": 6,
        "language": "vi",
        "template": "meeting",
        "transcript_only": True,
    }
    init_response = client.post("/api/meetings/uploads/init", json=init_payload)
    assert init_response.status_code == 200
    job_id = init_response.json()["job_id"]

    status_response = client.get(f"/api/meetings/uploads/{job_id}/status")
    assert status_response.status_code == 200
    assert status_response.json()["received_bytes"] == 0

    chunk_response = client.put(
        f"/api/meetings/uploads/{job_id}/chunk?offset=0",
        content=b"abcdef",
        headers={"Content-Type": "application/octet-stream"},
    )
    assert chunk_response.status_code == 200
    assert chunk_response.json()["complete"] is True

    complete_response = client.post(f"/api/meetings/uploads/{job_id}/complete")
    assert complete_response.status_code == 200
    assert complete_response.json()["transcript_only"] is True
