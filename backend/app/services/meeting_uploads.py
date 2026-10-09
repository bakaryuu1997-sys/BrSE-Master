import os
import uuid
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.meeting import MeetingRecord
from app.services.meeting_artifacts import read_meta_file, status_meta_path, update_status_meta
from app.services.meeting_utils import assert_resumable_upload_size, resumable_upload_received_bytes, safe_extension


def prepare_upload_target(original_filename: str, job_id: str) -> tuple[str, str]:
    file_ext = safe_extension(original_filename)
    stored_filename = f"{job_id}.{file_ext}"
    os.makedirs(settings.upload_folder, exist_ok=True)
    return stored_filename, os.path.join(settings.upload_folder, stored_filename)


def create_uploaded_meeting_record(
    db: Session,
    *,
    job_id: str,
    original_filename: str,
    stored_filename: str,
    file_path: str,
    file_size: int,
    language: str,
    template: str,
    model: Optional[str],
) -> MeetingRecord:
    record = MeetingRecord(
        id=job_id,
        title=original_filename,
        status="processing",
        filename=original_filename,
        file_path=file_path,
        language=language,
        template=template,
        model=model,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=12,
        status_message="Upload completed. Waiting to start transcription.",
        display_title=original_filename,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_size_bytes=file_size,
    )
    return record


def initialize_resumable_upload_record(
    db: Session,
    *,
    original_filename: str,
    file_size: int,
    language: str,
    template: str,
    model: Optional[str],
    job_id: str | None = None,
) -> MeetingRecord:
    assert_resumable_upload_size(file_size)
    next_job_id = job_id or str(uuid.uuid4())
    stored_filename, file_path = prepare_upload_target(original_filename, next_job_id)
    open(file_path, "ab").close()

    record = MeetingRecord(
        id=next_job_id,
        title=original_filename,
        status="pending",
        filename=original_filename,
        file_path=file_path,
        language=language,
        template=template,
        model=model,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    update_status_meta(
        next_job_id,
        current_step="uploading",
        progress_percent=1,
        status_message="Resumable upload initialized. Send chunks to continue.",
        display_title=original_filename,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_size_bytes=file_size,
        uploaded_bytes=0,
    )
    return record


def resumable_upload_status(record: MeetingRecord, db: Session) -> tuple[int, int, bool]:
    status_meta = read_meta_file(status_meta_path(record.id))
    file_size = int(status_meta.get("file_size_bytes") or 0)
    received = resumable_upload_received_bytes(record.id, db)
    return received, file_size, bool(file_size and received >= file_size)


def append_resumable_chunk(record: MeetingRecord, chunk: bytes, offset: int, db: Session) -> tuple[int, int, int, bool]:
    if record.status not in {"pending", "failed"}:
        raise HTTPException(status_code=409, detail=f"Upload cannot continue while status is {record.status}.")

    received, file_size, _ = resumable_upload_status(record, db)
    if offset != received:
        raise HTTPException(
            status_code=409,
            detail={"expected_offset": received, "received_offset": offset},
        )

    if not chunk:
        raise HTTPException(status_code=400, detail="Empty upload chunk.")

    next_size = received + len(chunk)
    assert_resumable_upload_size(next_size)
    if file_size and next_size > file_size:
        raise HTTPException(status_code=413, detail="Chunk exceeds declared file size.")

    os.makedirs(os.path.dirname(record.file_path), exist_ok=True)
    with open(record.file_path, "ab") as handle:
        handle.write(chunk)

    progress_percent = 1
    if file_size:
        progress_percent = min(99, max(1, round((next_size / file_size) * 100)))

    return next_size, file_size, progress_percent, bool(file_size and next_size >= file_size)
