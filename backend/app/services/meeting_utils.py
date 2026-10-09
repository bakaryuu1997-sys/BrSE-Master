import os
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.meeting import MeetingRecord
from app.services.meeting_artifacts import (
    analysis_meta_path,
    clear_status_meta_fields,
    read_meta_file,
    status_meta_path,
    summary_checkpoint_path,
    update_status_meta,
    write_meta_file,
)

# Constants moved from meetings.py
ALLOWED_MEETING_EXTENSIONS = {"mp3", "mp4", "wav", "m4a", "ogg", "webm", "mkv"}
UPLOAD_CHUNK_BYTES = 1024 * 1024

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def seconds_between_iso(start_value: Any, end_value: Any) -> int | None:
    if not isinstance(start_value, str) or not isinstance(end_value, str):
        return None
    try:
        start = datetime.fromisoformat(start_value.replace("Z", ""))
        end = datetime.fromisoformat(end_value.replace("Z", ""))
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return max(0, int((end - start).total_seconds()))
    except ValueError:
        return None


def read_summary_checkpoint(job_id: str) -> dict[str, Any]:
    return read_meta_file(summary_checkpoint_path(job_id))


def persist_summary_checkpoint(job_id: str, payload: dict[str, Any]) -> None:
    write_meta_file(summary_checkpoint_path(job_id), payload)
    chunks = payload.get("chunks") if isinstance(payload.get("chunks"), dict) else {}
    update_status_meta(
        job_id,
        summary_checkpoint_chunks_done=len(chunks),
        summary_checkpoint_chunks_total=payload.get("total_chunks"),
        summary_checkpoint_final=bool(payload.get("final_memo")),
        checkpoint_path=summary_checkpoint_path(job_id),
    )


def get_upload_size_state(job_id: str, file_path: str | None = None) -> tuple[int, int, bool]:
    status_meta = read_meta_file(status_meta_path(job_id))
    expected_size = int(status_meta.get("file_size_bytes") or 0)
    actual_size = 0
    if file_path and os.path.exists(file_path):
        actual_size = os.path.getsize(file_path)
    elif status_meta.get("uploaded_bytes"):
        actual_size = int(status_meta.get("uploaded_bytes") or 0)
    return expected_size, actual_size, bool(expected_size and actual_size < expected_size)


def mark_upload_incomplete(job_id: str, record: MeetingRecord, db: Session, file_path: str | None) -> None:
    expected_size, actual_size, _ = get_upload_size_state(job_id, file_path)
    stale_artifacts = [
        record.transcript_path,
        record.memo_path,
        os.path.join(settings.transcript_folder, f"{job_id}.txt"),
        os.path.join(settings.memo_folder, f"{job_id}.md"),
        analysis_meta_path(job_id),
    ]
    for artifact_path in stale_artifacts:
        if artifact_path and os.path.exists(artifact_path):
            try:
                os.remove(artifact_path)
            except OSError:
                pass
    record.status = "pending"
    record.completed_at = None
    record.transcript_path = None
    record.memo_path = None
    db.commit()
    progress = int((actual_size / max(expected_size, 1)) * 100) if expected_size else 1
    clear_status_meta_fields(job_id)
    update_status_meta(job_id, current_step="uploading", progress_percent=progress, status_message="Upload incomplete, waiting for more chunks.")


def safe_extension(filename: str) -> str:
    if "." not in filename:
        raise HTTPException(status_code=400, detail="File must have an extension.")
    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_MEETING_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported meeting file type.")
    return ext


async def save_upload_file(file: UploadFile, destination: str) -> int:
    total_size = 0
    max_upload_bytes = settings.max_meeting_upload_mb * 1024 * 1024
    with open(destination, "wb") as buffer:
        while True:
            chunk = await file.read(UPLOAD_CHUNK_BYTES)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > max_upload_bytes:
                buffer.close()
                try:
                    os.remove(destination)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=413,
                    detail=f"Meeting file is too large. Limit is {settings.max_meeting_upload_mb}MB.",
                )
            buffer.write(chunk)
    return total_size


def resumable_upload_received_bytes(job_id: str, db: Session) -> int:
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record or not record.file_path or not os.path.exists(record.file_path):
        return 0
    return os.path.getsize(record.file_path)


def assert_resumable_upload_size(next_size: int) -> None:
    max_upload_bytes = settings.max_meeting_upload_mb * 1024 * 1024
    if next_size > max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Meeting file is too large. Limit is {settings.max_meeting_upload_mb}MB.",
        )
