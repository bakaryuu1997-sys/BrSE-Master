import os
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.meeting import MeetingRecord
from app.models.meeting_task_status import MeetingTaskStatusRecord
from app.services.meeting_artifacts import read_meta_file, status_meta_path, write_meta_file
from app.services.meeting_job_runner import MeetingJob, run_meeting_job
from app.services.meeting_recovery import (
    clean_meeting_display_name,
    recover_meeting_records_from_storage,
    repair_meeting_records_from_storage_state,
)


client = TestClient(app)


def cleanup_record(job_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).delete()
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
        db.commit()
    finally:
        db.close()
    path = status_meta_path(job_id)
    if os.path.exists(path):
        os.remove(path)


def configure_storage(tmp_path: Path) -> tuple[str, str, str]:
    original_upload_folder = settings.upload_folder
    original_transcript_folder = settings.transcript_folder
    original_memo_folder = settings.memo_folder
    settings.upload_folder = str(tmp_path / "uploads")
    settings.transcript_folder = str(tmp_path / "transcripts")
    settings.memo_folder = str(tmp_path / "memos")
    os.makedirs(settings.upload_folder, exist_ok=True)
    os.makedirs(settings.transcript_folder, exist_ok=True)
    os.makedirs(settings.memo_folder, exist_ok=True)
    return original_upload_folder, original_transcript_folder, original_memo_folder


def restore_storage(originals: tuple[str, str, str]) -> None:
    settings.upload_folder, settings.transcript_folder, settings.memo_folder = originals


def test_clean_meeting_display_name_removes_uuid_and_extension() -> None:
    value = "123e4567-e89b-12d3-a456-426614174000_customer-sync.mp4"

    assert clean_meeting_display_name(value) == "customer-sync"


def test_recover_meeting_records_from_storage_creates_completed_record_from_memo(tmp_path: Path) -> None:
    originals = configure_storage(tmp_path)
    job_id = "123e4567-e89b-12d3-a456-426614174001"
    cleanup_record(job_id)
    memo_path = Path(settings.memo_folder) / f"{job_id}.md"
    memo_path.write_text("# Memo", encoding="utf-8")
    write_meta_file(
        status_meta_path(job_id),
        {
            "display_title": "Customer weekly sync",
            "original_filename": "customer-weekly-sync.mp4",
            "language": "ja",
            "template": "weekly",
        },
    )
    db = SessionLocal()
    try:
        recovered = recover_meeting_records_from_storage(db)
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()

        assert recovered == 1
        assert record is not None
        assert record.status == "completed"
        assert record.title == "Customer weekly sync"
        assert record.filename == "customer-weekly-sync.mp4"
        assert record.memo_path == str(memo_path)
        assert record.language == "ja"
        assert record.template == "weekly"
    finally:
        db.close()
        cleanup_record(job_id)
        restore_storage(originals)


def test_repair_meeting_records_from_storage_state_links_memo_and_repairs_title(tmp_path: Path) -> None:
    originals = configure_storage(tmp_path)
    job_id = "123e4567-e89b-12d3-a456-426614174002"
    cleanup_record(job_id)
    memo_path = Path(settings.memo_folder) / f"{job_id}.md"
    memo_path.write_text("# Memo", encoding="utf-8")
    write_meta_file(status_meta_path(job_id), {"display_title": "Recovered customer demo", "original_filename": "demo.mp4"})
    db = SessionLocal()
    try:
        record = MeetingRecord(id=job_id, title="Recovered meeting 123e4567", status="failed", filename="", language="vi", template="meeting")
        db.add(record)
        db.commit()

        repaired = repair_meeting_records_from_storage_state(db)
        db.refresh(record)

        assert repaired == 1
        assert record.status == "completed"
        assert record.title == "Recovered customer demo"
        assert record.filename == "demo.mp4"
        assert record.memo_path == str(memo_path)
    finally:
        db.close()
        cleanup_record(job_id)
        restore_storage(originals)


def test_interrupted_job_marks_retryable_then_retry_recovers_from_transcript(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    originals = configure_storage(tmp_path)
    job_id = str(uuid.uuid4())
    cleanup_record(job_id)
    transcript_path = Path(settings.transcript_folder) / f"{job_id}.txt"
    transcript_path.write_text("Recovered transcript", encoding="utf-8")
    db = SessionLocal()
    try:
        record = MeetingRecord(
            id=job_id,
            title="Interrupted meeting",
            status="processing",
            filename=f"{job_id}.txt",
            transcript_path=str(transcript_path),
            language="vi",
            template="meeting",
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    def fail_after_interrupt() -> None:
        raise RuntimeError("worker interrupted")

    try:
        with pytest.raises(RuntimeError, match="worker interrupted"):
            run_meeting_job(MeetingJob(job_id=job_id, kind="meeting_transcript_process", target=fail_after_interrupt))

        failed_meta = read_meta_file(status_meta_path(job_id))
        assert failed_meta["status"] == "failed"
        assert failed_meta["failure_reason"] == "worker interrupted"
        assert failed_meta["recovery_metadata"]["retryable"] is True

        calls = []

        def fake_process_transcript_task(*args) -> None:  # noqa: ANN001
            calls.append(args)

        from app.api.routes import meetings_process

        monkeypatch.setattr(meetings_process, "process_transcript_task", fake_process_transcript_task)

        retry_response = client.post(f"/api/meetings/{job_id}/retry")

        assert retry_response.status_code == 200
        payload = retry_response.json()
        assert payload["id"] == job_id
        assert payload["status"] == "processing"
        assert payload["current_step"] == "queued"
        assert payload["status_message"] == "Queued to rebuild memo from existing transcript."
        assert calls == [(job_id, "Recovered transcript", "vi", "meeting", None)]

        recovered_meta = read_meta_file(status_meta_path(job_id))
        assert recovered_meta["current_step"] in {"queued", "running"}
        assert recovered_meta["progress_percent"] == 18
        assert recovered_meta["recovery_metadata"]["job_kind"] == "meeting_transcript_process"
    finally:
        cleanup_record(job_id)
        restore_storage(originals)
