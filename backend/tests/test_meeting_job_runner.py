import os
import uuid
from collections.abc import Callable
from typing import Any

import pytest

from app.db.session import SessionLocal
from app.models.meeting_task_status import MeetingTaskStatusRecord
from app.services.meeting_artifacts import status_meta_path
from app.services.meeting_job_runner import enqueue_meeting_job, run_meeting_job


class InlineScheduler:
    def __init__(self) -> None:
        self.tasks = []

    def add_task(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
        self.tasks.append((func, args, kwargs))


def cleanup_job(job_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).delete()
        db.commit()
    finally:
        db.close()
    path = status_meta_path(job_id)
    if os.path.exists(path):
        os.remove(path)


def read_status_record(job_id: str) -> MeetingTaskStatusRecord | None:
    db = SessionLocal()
    try:
        return db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
    finally:
        db.close()


def test_enqueue_meeting_job_records_queued_status_and_scheduler_task() -> None:
    job_id = str(uuid.uuid4())
    scheduler = InlineScheduler()
    try:
        job = enqueue_meeting_job(
            scheduler,
            job_id=job_id,
            kind="meeting_media_process",
            target=lambda: None,
        )

        assert job.job_id == job_id
        assert len(scheduler.tasks) == 1
        scheduled_func, scheduled_args, _ = scheduler.tasks[0]
        assert scheduled_func is run_meeting_job
        assert scheduled_args[0] == job
        record = read_status_record(job_id)
        assert record is not None
        assert record.status == "queued"
        assert record.phase == "queued"
        assert "meeting_media_process" in record.recovery_metadata_json
    finally:
        cleanup_job(job_id)


def test_run_meeting_job_marks_failure_retryable() -> None:
    job_id = str(uuid.uuid4())

    def fail() -> None:
        raise RuntimeError("pytest runner failure")

    scheduler = InlineScheduler()
    try:
        job = enqueue_meeting_job(scheduler, job_id=job_id, kind="meeting_transcript_process", target=fail)

        with pytest.raises(RuntimeError, match="pytest runner failure"):
            run_meeting_job(job)

        record = read_status_record(job_id)
        assert record is not None
        assert record.status == "failed"
        assert record.failure_reason == "pytest runner failure"
        assert record.failed_at is not None
        assert '"retryable": true' in record.recovery_metadata_json
    finally:
        cleanup_job(job_id)


def test_enqueue_meeting_job_preserves_action_specific_queued_status() -> None:
    job_id = str(uuid.uuid4())
    scheduler = InlineScheduler()
    try:
        enqueue_meeting_job(
            scheduler,
            job_id=job_id,
            kind="meeting_url_process",
            target=lambda: None,
            status_message="Downloading audio from URL.",
            progress_percent=8,
            metadata={"source_url": "https://example.test/video"},
        )

        record = read_status_record(job_id)
        assert record is not None
        assert record.status == "queued"
        assert record.phase == "queued"
        assert record.status_message == "Downloading audio from URL."
        assert record.progress_percent == 8
        assert "meeting_url_process" in record.recovery_metadata_json
        assert "https://example.test/video" in record.recovery_metadata_json
    finally:
        cleanup_job(job_id)