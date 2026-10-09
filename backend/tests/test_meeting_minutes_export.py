from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.meeting_minutes import MeetingMinutesRecord
from app.core.config import settings

client = TestClient(app)

def test_export_meeting_minutes_flow(tmp_path) -> None:
    minutes_id = "pytest-minutes-export-test"
    original_memo_folder = settings.memo_folder
    settings.memo_folder = str(tmp_path)

    # 1. Create a dummy MeetingMinutesRecord in the db
    db = SessionLocal()
    try:
        existing = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingMinutesRecord(
            id=minutes_id,
            project_id="default",
            title="Pytest Meeting Minutes",
            meeting_date=date(2026, 5, 26),
            location="FastAPI Test Client",
            status="completed",
            body_markdown="# Pytest Minutes\n\n- Discussed premium features.\n- Approved implementation plan.",
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    try:
        # 2. Test export as markdown (md)
        response_md = client.get(f"/api/meeting-minutes/{minutes_id}/export/md")
        assert response_md.status_code == 200
        assert "# Pytest Minutes" in response_md.content.decode("utf-8")

        # 3. Test export as word (docx)
        response_docx = client.get(f"/api/meeting-minutes/{minutes_id}/export/docx")
        assert response_docx.status_code == 200
        # Ensure the docx file was created in memo_folder
        docx_file = tmp_path / f"minutes_{minutes_id}.docx"
        assert docx_file.exists()
        assert docx_file.stat().st_size > 0

        # 4. Test export unsupported format
        response_unsupported = client.get(f"/api/meeting-minutes/{minutes_id}/export/invalid")
        assert response_unsupported.status_code == 400

    finally:
        # 5. Clean up the database record
        db = SessionLocal()
        try:
            record = db.query(MeetingMinutesRecord).filter(MeetingMinutesRecord.id == minutes_id).first()
            if record:
                db.delete(record)
                db.commit()
        finally:
            db.close()
            settings.memo_folder = original_memo_folder
