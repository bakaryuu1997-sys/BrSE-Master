import os
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.meeting import MeetingRecord
from app.schemas.meeting import MeetingRecordRead, ResumableUploadInitRequest, ResumableUploadStatus
from app.services.meeting_job_runner import enqueue_background_meeting_job
from app.services.meeting_artifacts import read_meta_file, status_meta_path, update_status_meta
from app.services.meeting_status import serialize_meeting_record
from app.services.meeting_processor import process_meeting_task
from app.services.meeting_utils import save_upload_file
from app.services.meeting_uploads import (
    append_resumable_chunk,
    create_uploaded_meeting_record,
    initialize_resumable_upload_record,
    prepare_upload_target,
    resumable_upload_status,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=MeetingRecordRead)
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form("vi"),
    template: str = Form("meeting"),
    model: Optional[str] = Form(None),
    transcript_only: bool = Form(False),
    keep_source_media: bool = Form(False),
    whisper_model: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    original_filename = file.filename or ""
    filename, file_path = prepare_upload_target(original_filename, job_id)
    
    logger.info(f"Starting simple upload for job {job_id}: {original_filename}")
    total_size = await save_upload_file(file, file_path)
        
    new_record = create_uploaded_meeting_record(
        db,
        job_id=job_id,
        original_filename=original_filename,
        stored_filename=filename,
        file_path=file_path,
        file_size=total_size,
        language=language,
        template=template,
        model=model,
    )
    
    update_status_meta(
        job_id,
        transcript_only=transcript_only,
        keep_source_media=keep_source_media,
        source_media_retained=keep_source_media,
        auto_resume=True,
        whisper_model=whisper_model,
    )

    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_media_process",
        target=process_meeting_task,
        args=(job_id, file_path, language, template, model, transcript_only),
    )
    
    return serialize_meeting_record(new_record)


@router.post("/uploads/init", response_model=ResumableUploadStatus)
def init_resumable_upload(
    request: ResumableUploadInitRequest,
    db: Session = Depends(get_db),
):
    original_filename = request.filename or "meeting-upload.webm"
    record = initialize_resumable_upload_record(
        db,
        original_filename=original_filename,
        file_size=request.file_size,
        language=request.language,
        template=request.template,
        model=request.model,
    )
    update_status_meta(
        record.id,
        transcript_only=request.transcript_only,
        keep_source_media=request.keep_source_media,
        source_media_retained=request.keep_source_media,
        auto_resume=True,
        upload_file_size=request.file_size,
        upload_received_bytes=0,
        upload_remaining_bytes=request.file_size,
        upload_chunk_size=5 * 1024 * 1024,
        upload_chunks_done=0,
        upload_chunks_total=max(1, (request.file_size + (5 * 1024 * 1024) - 1) // (5 * 1024 * 1024)),
        status_message=("Transcript-only upload initialized." if request.transcript_only else "Resumable upload initialized."),
        whisper_model=request.whisper_model,
    )
    logger.info(f"Initializing resumable upload for job {record.id}: {original_filename} ({request.file_size} bytes)")
    return ResumableUploadStatus(
        job_id=record.id,
        received_bytes=0,
        file_size=request.file_size,
        complete=False,
        status=record.status,
    )


@router.get("/{job_id}/status", response_model=ResumableUploadStatus)
@router.get("/uploads/{job_id}/status", response_model=ResumableUploadStatus)
def get_resumable_upload_status(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload session not found")
    received, file_size, complete = resumable_upload_status(record, db)
    return ResumableUploadStatus(
        job_id=job_id,
        received_bytes=received,
        file_size=file_size,
        complete=complete,
        status=record.status,
    )


@router.put("/{job_id}/chunk", response_model=ResumableUploadStatus)
@router.put("/uploads/{job_id}/chunk", response_model=ResumableUploadStatus)
async def upload_resumable_chunk(
    job_id: str,
    request: Request,
    offset: int = Query(..., ge=0),
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record or not record.file_path:
        raise HTTPException(status_code=404, detail="Upload session not found")
    chunk = await request.body()
    next_size, file_size, percent, complete = append_resumable_chunk(record, chunk, offset, db)
    update_status_meta(
        job_id,
        current_step="uploading",
        progress_percent=percent,
        status_message=f"Uploaded {next_size}/{file_size or '?'} bytes. This upload can resume after network interruption.",
        uploaded_bytes=next_size,
        upload_received_bytes=next_size,
        upload_file_size=file_size,
        upload_remaining_bytes=max(0, (file_size or 0) - next_size),
        upload_chunk_size=5 * 1024 * 1024,
        upload_chunks_done=max(0, (next_size + (5 * 1024 * 1024) - 1) // (5 * 1024 * 1024)),
        upload_chunks_total=max(1, ((file_size or next_size) + (5 * 1024 * 1024) - 1) // (5 * 1024 * 1024)),
    )
    return ResumableUploadStatus(
        job_id=job_id,
        received_bytes=next_size,
        file_size=file_size,
        complete=complete,
        status=record.status,
    )


@router.post("/{job_id}/complete", response_model=MeetingRecordRead)
@router.post("/uploads/{job_id}/complete", response_model=MeetingRecordRead)
def complete_resumable_upload(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record or not record.file_path:
        raise HTTPException(status_code=404, detail="Upload session not found")
    received, file_size, _ = resumable_upload_status(record, db)
    if file_size and received < file_size:
        raise HTTPException(status_code=409, detail=f"Upload incomplete. Received {received}/{file_size} bytes.")
    if not os.path.exists(record.file_path) or os.path.getsize(record.file_path) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    logger.info(f"Completing resumable upload for job {job_id}")
    record.status = "processing"
    record.completed_at = None
    db.commit()
    db.refresh(record)
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=12,
        status_message=("Upload completed. Extracting transcript only." if read_meta_file(status_meta_path(job_id)).get("transcript_only") else "Resumable upload completed. Waiting to start transcription."),
        display_title=record.title,
        original_filename=record.filename,
        uploaded_bytes=received,
    )
    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_media_process",
        target=process_meeting_task,
        args=(job_id, record.file_path, record.language, record.template, record.model, bool(read_meta_file(status_meta_path(job_id)).get("transcript_only"))),
    )
    return serialize_meeting_record(record)
