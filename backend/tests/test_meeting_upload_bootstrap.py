import os
from pathlib import Path

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.meeting import MeetingRecord
from app.services.meeting_artifacts import read_meta_file, status_meta_path
from app.services.meeting_uploads import (
    create_uploaded_meeting_record,
    initialize_resumable_upload_record,
    prepare_upload_target,
)


def cleanup_record(job_id: str) -> None:
    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()


def test_prepare_upload_target_creates_upload_folder_and_safe_filename(tmp_path: Path) -> None:
    original_upload_folder = settings.upload_folder
    settings.upload_folder = str(tmp_path / "uploads")
    try:
        stored_filename, file_path = prepare_upload_target("demo meeting.MP4", "job-123")

        assert stored_filename == "job-123.mp4"
        assert file_path == os.path.join(settings.upload_folder, "job-123.mp4")
        assert os.path.isdir(settings.upload_folder)
    finally:
        settings.upload_folder = original_upload_folder


def test_create_uploaded_meeting_record_persists_status_meta(tmp_path: Path) -> None:
    original_memo_folder = settings.memo_folder
    settings.memo_folder = str(tmp_path / "memos")
    job_id = "upload-bootstrap-simple"
    cleanup_record(job_id)
    db = SessionLocal()
    try:
        record = create_uploaded_meeting_record(
            db,
            job_id=job_id,
            original_filename="demo.mp4",
            stored_filename="upload-bootstrap-simple.mp4",
            file_path=str(tmp_path / "demo.mp4"),
            file_size=42,
            language="vi",
            template="meeting",
            model=None,
        )
        meta = read_meta_file(status_meta_path(job_id))

        assert record.status == "processing"
        assert record.filename == "demo.mp4"
        assert meta["current_step"] == "queued"
        assert meta["stored_filename"] == "upload-bootstrap-simple.mp4"
        assert meta["file_size_bytes"] == 42
    finally:
        db.close()
        cleanup_record(job_id)
        settings.memo_folder = original_memo_folder


def test_initialize_resumable_upload_record_creates_empty_file_and_meta(tmp_path: Path) -> None:
    original_upload_folder = settings.upload_folder
    original_memo_folder = settings.memo_folder
    settings.upload_folder = str(tmp_path / "uploads")
    settings.memo_folder = str(tmp_path / "memos")
    job_id = "upload-bootstrap-resumable"
    cleanup_record(job_id)
    db = SessionLocal()
    try:
        record = initialize_resumable_upload_record(
            db,
            original_filename="screen.webm",
            file_size=128,
            language="ja",
            template="weekly",
            model="local",
            job_id=job_id,
        )
        meta = read_meta_file(status_meta_path(job_id))

        assert record.status == "pending"
        assert record.file_path.endswith("upload-bootstrap-resumable.webm")
        assert os.path.exists(record.file_path)
        assert os.path.getsize(record.file_path) == 0
        assert meta["current_step"] == "uploading"
        assert meta["uploaded_bytes"] == 0
        assert meta["file_size_bytes"] == 128
    finally:
        db.close()
        cleanup_record(job_id)
        settings.upload_folder = original_upload_folder
        settings.memo_folder = original_memo_folder
