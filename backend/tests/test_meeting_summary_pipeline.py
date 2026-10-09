from pathlib import Path

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.meeting import MeetingRecord
from app.services.meeting_artifacts import read_meta_file, status_meta_path, update_status_meta
from app.services.meeting_utils import seconds_between_iso
from app.services.meeting_summary_pipeline import (
    build_summarize_progress_meta,
    complete_meeting_processing,
    save_generated_memo,
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


def test_build_summarize_progress_meta_maps_summary_and_reduce_fields() -> None:
    summary = build_summarize_progress_meta("summarizing", 60, {"completed": 2, "total": 5}, "media")
    reducing = build_summarize_progress_meta("reducing", 74, {"completed": 1, "total": 3}, "pasted")

    assert summary["status_message"] == "Summarizing transcript into meeting memo."
    assert summary["summary_chunks_done"] == 2
    assert summary["summary_chunks_total"] == 5
    assert summary["reduce_batches_done"] is None
    assert reducing["status_message"] == "Reducing long transcript into memo."
    assert reducing["reduce_batches_done"] == 1
    assert reducing["reduce_batches_total"] == 3


def test_seconds_between_iso_handles_naive_and_aware_values() -> None:
    assert seconds_between_iso("2026-05-24T00:00:00", "2026-05-24T00:00:05+00:00") == 5


def test_save_generated_memo_writes_markdown_to_memo_folder(tmp_path: Path) -> None:
    original_memo_folder = settings.memo_folder
    settings.memo_folder = str(tmp_path / "memos")
    try:
        path = save_generated_memo("summary-save", "# Memo")

        assert path == str(Path(settings.memo_folder) / "summary-save.md")
        assert Path(path).read_text(encoding="utf-8") == "# Memo"
    finally:
        settings.memo_folder = original_memo_folder


def test_complete_meeting_processing_sets_record_and_status_meta(tmp_path: Path) -> None:
    original_memo_folder = settings.memo_folder
    settings.memo_folder = str(tmp_path / "memos")
    job_id = "summary-complete"
    cleanup_record(job_id)
    db = SessionLocal()
    try:
        record = MeetingRecord(id=job_id, title="Summary complete", status="summarizing", filename="source.mp4", language="vi", template="meeting")
        db.add(record)
        db.commit()
        update_status_meta(job_id, ai_processing_started_at="2026-05-24T00:00:00")

        complete_meeting_processing(db, record, job_id, todo_drafts=2)

        meta = read_meta_file(status_meta_path(job_id))

        assert record.status == "completed"
        assert record.completed_at is not None
        assert meta["current_step"] == "completed"
        assert meta["todo_drafts"] == 2

        assert isinstance(meta["ai_processing_seconds"], int)
    finally:
        db.close()
        cleanup_record(job_id)
        settings.memo_folder = original_memo_folder
