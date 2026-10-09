import os
import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.meeting import MeetingRecord
from app.models.meeting_task_status import MeetingTaskStatusRecord
from app.services.meeting_artifacts import read_meta_file, status_meta_path, update_status_meta
from app.services.meeting_status import merge_task_status_meta


client = TestClient(app)


def cleanup_job(job_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).delete()
        db.query(MeetingRecord).filter(MeetingRecord.id == job_id).delete()
        db.commit()
    finally:
        db.close()
    path = status_meta_path(job_id)
    if os.path.exists(path):
        os.remove(path)


def create_meeting(job_id: str, status: str = "processing", transcript_path: str | None = None) -> None:
    db = SessionLocal()
    try:
        db.add(
            MeetingRecord(
                id=job_id,
                title=f"pytest meeting {job_id[:8]}",
                status=status,
                filename="pytest.txt",
                transcript_path=transcript_path,
                language="vi",
                template="meeting",
                created_at=datetime.now(UTC),
            )
        )
        db.commit()
    finally:
        db.close()


def test_update_status_meta_persists_meeting_task_status() -> None:
    job_id = str(uuid.uuid4())
    try:
        update_status_meta(
            job_id,
            current_step="summarizing",
            progress_percent=63,
            status_message="Summarizing chunk 3.",
            summary_chunks_done=3,
            summary_chunks_total=8,
            summary_checkpoint_chunks_done=3,
            summary_checkpoint_chunks_total=8,
        )

        db = SessionLocal()
        try:
            record = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
            assert record is not None
            assert record.phase == "summarizing"
            assert record.progress_percent == 63
            assert record.chunk_index == 3
            assert record.status_message == "Summarizing chunk 3."
            assert record.checkpoint_path.endswith(f"{job_id}.summary-checkpoint.json")
        finally:
            db.close()
    finally:
        cleanup_job(job_id)


def test_meeting_detail_and_history_fall_back_to_db_task_status_without_meta_file(tmp_path) -> None:
    job_id = str(uuid.uuid4())
    transcript_path = tmp_path / f"{job_id}.txt"
    transcript_path.write_text("pytest transcript", encoding="utf-8")
    try:
        create_meeting(job_id, transcript_path=str(transcript_path))
        update_status_meta(
            job_id,
            current_step="transcribing",
            progress_percent=42,
            status_message="Transcribing segment 5.",
            segment_count=5,
        )
        os.remove(status_meta_path(job_id))

        detail_response = client.get(f"/api/meetings/{job_id}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["current_step"] == "transcribing"
        assert detail["progress_percent"] == 42
        assert detail["status_message"] == "Transcribing segment 5."
        assert detail["chunk_index"] == 5

        history_response = client.get("/api/meetings/history")
        assert history_response.status_code == 200
        target = next(item for item in history_response.json() if item["id"] == job_id)
        assert target["current_step"] == "transcribing"
        assert target["progress_percent"] == 42
    finally:
        cleanup_job(job_id)


def test_failed_status_meta_persists_task_error() -> None:
    job_id = str(uuid.uuid4())
    try:
        update_status_meta(
            job_id,
            current_step="failed",
            progress_percent=100,
            status_message="Whisper failed during local processing.",
        )

        db = SessionLocal()
        try:
            record = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
            assert record is not None
            assert record.phase == "failed"
            assert record.error == "Whisper failed during local processing."
        finally:
            db.close()
    finally:
        cleanup_job(job_id)


def test_status_meta_persists_additive_job_record_fields() -> None:
    job_id = str(uuid.uuid4())
    try:
        update_status_meta(
            job_id,
            status="failed",
            current_step="failed",
            progress_percent=100,
            status_message="Retryable AI summary failure.",
            failure_reason="ollama timeout",
            retry_count=2,
            recovery_metadata={"source": "transcript", "resume_from": "summarize"},
        )

        db = SessionLocal()
        try:
            record = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
            assert record is not None
            assert record.meeting_id == job_id
            assert record.status == "failed"
            assert record.failure_reason == "ollama timeout"
            assert record.retry_count == 2
            assert '"resume_from": "summarize"' in record.recovery_metadata_json
            assert record.failed_at is not None
        finally:
            db.close()
    finally:
        cleanup_job(job_id)


def test_merge_task_status_meta_prefers_newer_db_status() -> None:
    merged = merge_task_status_meta(
        {
            "current_step": "queued",
            "progress_percent": 12,
            "status_message": "Old JSON status.",
            "updated_at": "2026-05-20T01:00:00",
        },
        {
            "current_step": "summarizing",
            "progress_percent": 72,
            "status_message": "New DB status.",
            "updated_at": "2026-05-20T02:00:00",
        },
    )

    assert merged["current_step"] == "summarizing"
    assert merged["progress_percent"] == 72
    assert merged["status_message"] == "New DB status."


def test_recovery_syncs_db_task_status_to_failed() -> None:
    # An interrupted (active) job must mark the DB mirror failed on startup, not
    # just the file — mark_interrupted_meeting_jobs now routes through update_status_meta.
    from app.main import mark_interrupted_meeting_jobs

    job_id = str(uuid.uuid4())
    try:
        create_meeting(job_id, status="processing")
        update_status_meta(job_id, current_step="transcribing", progress_percent=40)

        mark_interrupted_meeting_jobs()

        db = SessionLocal()
        try:
            record = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
            assert record is not None
            assert record.status == "failed"
            assert record.phase == "interrupted"
        finally:
            db.close()
    finally:
        cleanup_job(job_id)


def test_update_status_meta_survives_db_failure(monkeypatch, caplog) -> None:
    # DB mirror failure must never break the file write (file-first), and must be
    # logged instead of silently swallowed.
    import app.services.meeting_artifacts as artifacts

    job_id = str(uuid.uuid4())
    try:
        def _boom(*_args, **_kwargs):
            raise RuntimeError("simulated DB outage")

        monkeypatch.setattr(artifacts, "SessionLocal", _boom)
        with caplog.at_level("WARNING"):
            payload = update_status_meta(job_id, current_step="summarizing", progress_percent=50)

        assert payload["current_step"] == "summarizing"
        assert read_meta_file(status_meta_path(job_id))["progress_percent"] == 50
        assert any("MeetingTaskStatusRecord" in record.message for record in caplog.records)
    finally:
        cleanup_job(job_id)
