import json
import os
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.meeting import MeetingRecord
from app.models.meeting_task_status import MeetingTaskStatusRecord
from app.models.todo import BrseTodoItemRecord, MeetingTodoDraftRecord
from app.services.meeting_artifacts import read_analysis_meta, read_meta_file, status_meta_path, update_status_meta
from app.services.meeting_transcription import corrected_transcript_path, transcript_srt_path
from app.services.meeting_translation import (
    translated_srt_path,
    translated_transcript_path,
    translation_artifact_languages,
)

ACTIVE_MEETING_STATUSES = {"pending", "processing", "recording", "transcribing", "summarizing"}


class MeetingJobCancelled(Exception):
    pass


def request_job_cancel(job_id: str, reason: str = "User cancelled the meeting job.") -> None:
    update_status_meta(
        job_id,
        cancel_requested=True,
        current_step="cancel_requested",
        status_message=reason,
    )


def ensure_not_cancelled(job_id: str) -> None:
    meta = read_meta_file(status_meta_path(job_id))
    if meta.get("cancel_requested"):
        raise MeetingJobCancelled(meta.get("status_message") or "Meeting job was cancelled.")


def parse_status_updated_at(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        # Normalize to UTC and ensure offset-aware
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except ValueError:
        return None


def read_meeting_task_status(job_id: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        record = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
        if not record:
            return {}
        recovery_metadata = {}
        if record.recovery_metadata_json:
            try:
                parsed = json.loads(record.recovery_metadata_json)
                if isinstance(parsed, dict):
                    recovery_metadata = parsed
            except json.JSONDecodeError:
                recovery_metadata = {}
        return {
            "meeting_id": record.meeting_id,
            "task_status": record.status,
            "current_step": record.phase,
            "progress_percent": record.progress_percent,
            "status_message": record.status_message,
            "error": record.error,
            "failure_reason": record.failure_reason,
            "retry_count": record.retry_count,
            "recovery_metadata": recovery_metadata,
            "checkpoint_path": record.checkpoint_path,
            "chunk_index": record.chunk_index,
            "task_started_at": record.started_at.isoformat() if record.started_at else None,
            "task_completed_at": record.completed_at.isoformat() if record.completed_at else None,
            "task_failed_at": record.failed_at.isoformat() if record.failed_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        }
    finally:
        db.close()


def merge_task_status_meta(status_meta: dict[str, Any], task_status: dict[str, Any]) -> dict[str, Any]:
    if not task_status:
        return status_meta
    merged = dict(status_meta)
    db_updated_at = parse_status_updated_at(task_status.get("updated_at"))
    meta_updated_at = parse_status_updated_at(status_meta.get("updated_at"))
    db_is_newer = bool(db_updated_at and (not meta_updated_at or db_updated_at > meta_updated_at))
    for target_key in [
        "task_status",
        "current_step",
        "progress_percent",
        "status_message",
        "error",
        "failure_reason",
        "retry_count",
        "recovery_metadata",
        "checkpoint_path",
        "chunk_index",
        "task_started_at",
        "task_completed_at",
        "task_failed_at",
    ]:
        value = task_status.get(target_key)
        if value is None or value == "":
            continue
        current_value = merged.get(target_key)
        if db_is_newer or current_value is None or current_value == "":
            merged[target_key] = value
    return merged


def meeting_action_sync_summary(db: Session, meeting_id: str) -> dict[str, Any]:
    pending_count = (
        db.query(MeetingTodoDraftRecord)
        .filter(MeetingTodoDraftRecord.meeting_id == meeting_id, MeetingTodoDraftRecord.review_status == "pending")
        .count()
    )
    approved_count = (
        db.query(MeetingTodoDraftRecord)
        .filter(MeetingTodoDraftRecord.meeting_id == meeting_id, MeetingTodoDraftRecord.review_status == "approved")
        .count()
    )
    rejected_count = (
        db.query(MeetingTodoDraftRecord)
        .filter(MeetingTodoDraftRecord.meeting_id == meeting_id, MeetingTodoDraftRecord.review_status == "rejected")
        .count()
    )
    todo_count = db.query(BrseTodoItemRecord).filter(BrseTodoItemRecord.meeting_id == meeting_id).count()
    synced_count = max(approved_count, todo_count)
    return {
        "meeting_action_pending_count": pending_count,
        "meeting_action_synced_count": synced_count,
        "meeting_action_rejected_count": rejected_count,
        "meeting_actions_synced": synced_count > 0 and pending_count == 0,
    }


def serialize_meeting_record(record: MeetingRecord, db: Session | None = None) -> dict[str, Any]:
    payload = record.to_dict()
    status_meta = merge_task_status_meta(read_meta_file(status_meta_path(record.id)), read_meeting_task_status(record.id))
    analysis = read_analysis_meta(record.id)
    source_available = bool(record.file_path and os.path.exists(record.file_path))
    transcript_available = bool(record.transcript_path and os.path.exists(record.transcript_path))
    corrected_transcript_available = os.path.exists(corrected_transcript_path(record.id))
    transcript_srt_available = os.path.exists(transcript_srt_path(record.id))
    translation_languages = translation_artifact_languages(record.id)
    translated_transcript_available = any(os.path.exists(translated_transcript_path(record.id, lang)) for lang in translation_languages)
    translated_srt_available = any(os.path.exists(translated_srt_path(record.id, lang)) for lang in translation_languages)
    memo_available = bool(record.memo_path and os.path.exists(record.memo_path))
    recovery_metadata = status_meta.get("recovery_metadata") if isinstance(status_meta.get("recovery_metadata"), dict) else {}
    transcript_only = bool(status_meta.get("transcript_only"))
    awaiting_external_source = bool(recovery_metadata.get("source_url")) and status_meta.get("current_step") in {
        "queued",
        "downloading",
    }
    if record.status in ACTIVE_MEETING_STATUSES and not source_available and not transcript_available and not awaiting_external_source:
        status_meta = {
            **status_meta,
            "current_step": "missing_source",
            "progress_percent": 100,
            "status_message": "Source media/transcript is missing. Re-upload the file or retry after restoring storage.",
        }
        payload["status"] = "failed"
    elif record.status == "completed" and not memo_available and not transcript_only:
        status_meta = {
            **status_meta,
            "current_step": "missing_memo",
            "status_message": "Memo file is missing. If transcript/source media exists, run retry to rebuild it.",
        }
    elif record.status == "completed" and (memo_available or transcript_only):
        status_meta = {
            **status_meta,
            "current_step": "completed",
            "progress_percent": 100,
            "status_message": status_meta.get("status_message") or ("Transcript is ready." if transcript_only else "Meeting memo is ready."),
        }
    payload.update(
        {
            "progress_percent": status_meta.get("progress_percent"),
            "current_step": status_meta.get("current_step"),
            "status_message": status_meta.get("status_message"),
            "transcript_word_count": status_meta.get("transcript_word_count"),
            "segment_count": status_meta.get("segment_count"),
            "detected_language": status_meta.get("detected_language"),
            "speaker_count": len(analysis.get("speakers", [])) if isinstance(analysis.get("speakers"), list) else 0,
            "summary_chunks_done": status_meta.get("summary_chunks_done"),
            "summary_chunks_total": status_meta.get("summary_chunks_total"),
            "reduce_batches_done": status_meta.get("reduce_batches_done"),
            "reduce_batches_total": status_meta.get("reduce_batches_total"),
            "ai_processing_started_at": status_meta.get("ai_processing_started_at"),
            "ai_processing_completed_at": status_meta.get("ai_processing_completed_at"),
            "ai_processing_seconds": status_meta.get("ai_processing_seconds"),
            "ai_processing_mode": status_meta.get("ai_processing_mode"),
            "error": status_meta.get("error"),
            "task_status": status_meta.get("task_status"),
            "retry_count": status_meta.get("retry_count"),
            "failure_reason": status_meta.get("failure_reason"),
            "recovery_metadata": status_meta.get("recovery_metadata"),
            "task_started_at": status_meta.get("task_started_at"),
            "task_completed_at": status_meta.get("task_completed_at"),
            "task_failed_at": status_meta.get("task_failed_at"),
            "checkpoint_path": status_meta.get("checkpoint_path"),
            "chunk_index": status_meta.get("chunk_index"),
            "transcript_only": transcript_only,
            "upload_received_bytes": status_meta.get("upload_received_bytes") or status_meta.get("uploaded_bytes"),
            "upload_file_size": status_meta.get("upload_file_size") or status_meta.get("file_size_bytes"),
            "upload_remaining_bytes": status_meta.get("upload_remaining_bytes") if status_meta.get("upload_remaining_bytes") is not None else max(0, int(status_meta.get("file_size_bytes") or 0) - int(status_meta.get("upload_received_bytes") or status_meta.get("uploaded_bytes") or 0)),
            "upload_chunk_size": status_meta.get("upload_chunk_size"),
            "upload_chunks_done": status_meta.get("upload_chunks_done"),
            "upload_chunks_total": status_meta.get("upload_chunks_total"),
            "source_available": source_available,
            "transcript_available": transcript_available,
            "corrected_transcript_available": corrected_transcript_available,
            "transcript_srt_available": transcript_srt_available,
            "translated_transcript_available": translated_transcript_available,
            "translated_srt_available": translated_srt_available,
            "translation_available_languages": translation_languages,
            "memo_available": memo_available,
        }
    )
    if db:
        payload.update(meeting_action_sync_summary(db, record.id))
    return payload
