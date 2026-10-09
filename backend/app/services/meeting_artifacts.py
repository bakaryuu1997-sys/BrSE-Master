import json
import logging
import os
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.meeting_task_status import MeetingTaskStatusRecord

logger = logging.getLogger(__name__)

MEETING_META_FOLDER = "_meta"


def meta_folder_path() -> str:
    path = os.path.join(settings.memo_folder, MEETING_META_FOLDER)
    os.makedirs(path, exist_ok=True)
    return path


def status_meta_path(job_id: str) -> str:
    return os.path.join(meta_folder_path(), f"{job_id}.status.json")


def analysis_meta_path(job_id: str) -> str:
    return os.path.join(meta_folder_path(), f"{job_id}.analysis.json")


def summary_checkpoint_path(job_id: str) -> str:
    return os.path.join(meta_folder_path(), f"{job_id}.summary-checkpoint.json")


def read_meta_file(path: str) -> dict[str, Any]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def write_meta_file(path: str, payload: dict[str, Any]) -> None:
    folder = os.path.dirname(path)
    if folder:
        os.makedirs(folder, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def update_status_meta(job_id: str, **fields: Any) -> dict[str, Any]:
    payload = read_meta_file(status_meta_path(job_id))
    for key, value in fields.items():
        if value is not None:
            payload[key] = value
    payload["updated_at"] = datetime.now(UTC).isoformat()
    write_meta_file(status_meta_path(job_id), payload)
    upsert_meeting_task_status(job_id, payload, fields)
    return payload


def clear_status_meta_fields(job_id: str, *keys: str) -> dict[str, Any]:
    payload = read_meta_file(status_meta_path(job_id))
    for key in keys:
        payload.pop(key, None)
    payload["updated_at"] = datetime.now(UTC).isoformat()
    write_meta_file(status_meta_path(job_id), payload)
    # Keep the DB mirror in step with the file (single write path).
    upsert_meeting_task_status(job_id, payload, {})
    return payload


def upsert_meeting_task_status(job_id: str, payload: dict[str, Any], fields: dict[str, Any]) -> None:
    phase = str(payload.get("current_step") or payload.get("phase") or "")
    status = str(payload.get("status") or "")
    if not status:
        if phase in {"completed"}:
            status = "completed"
        elif phase in {"failed", "cancelled", "missing_source", "missing_memo"}:
            status = "failed"
        elif phase in {"queued", "pending", "cancel_requested"}:
            status = phase
        elif phase:
            status = "processing"
        else:
            status = "queued"
    meeting_id = str(payload.get("meeting_id") or job_id)
    progress_percent = payload.get("progress_percent")
    chunk_index = payload.get("chunk_index")
    if chunk_index is None:
        chunk_index = payload.get("summary_chunks_done") or payload.get("reduce_batches_done") or payload.get("segment_count")
    status_message = str(payload.get("status_message") or "")
    error_value = str(payload.get("error") or "")
    if not error_value and phase in {"failed", "cancelled", "missing_source", "missing_memo"}:
        error_value = status_message
    failure_reason = str(payload.get("failure_reason") or error_value or "")
    retry_count = payload.get("retry_count")
    recovery_metadata = payload.get("recovery_metadata")
    recovery_metadata_json = ""
    if isinstance(recovery_metadata, dict):
        recovery_metadata_json = json.dumps(recovery_metadata, ensure_ascii=False)
    checkpoint_path = str(payload.get("checkpoint_path") or "")
    if not checkpoint_path and (
        fields.get("summary_checkpoint_chunks_done") is not None
        or fields.get("summary_checkpoint_chunks_total") is not None
        or fields.get("summary_checkpoint_final") is not None
    ):
        checkpoint_path = summary_checkpoint_path(job_id)

    db = None
    try:
        db = SessionLocal()
        record = db.query(MeetingTaskStatusRecord).filter(MeetingTaskStatusRecord.job_id == job_id).first()
        if not record:
            record = MeetingTaskStatusRecord(job_id=job_id)
            db.add(record)
        record.meeting_id = meeting_id
        record.status = status
        if phase:
            record.phase = phase
        if isinstance(progress_percent, int):
            record.progress_percent = progress_percent
        if isinstance(chunk_index, int):
            record.chunk_index = chunk_index
        if status_message:
            record.status_message = status_message
        if error_value:
            record.error = error_value
        if failure_reason:
            record.failure_reason = failure_reason
        if isinstance(retry_count, int):
            record.retry_count = retry_count
        if recovery_metadata_json:
            record.recovery_metadata_json = recovery_metadata_json
        if checkpoint_path:
            record.checkpoint_path = checkpoint_path
        if status == "processing" and not record.started_at:
            record.started_at = datetime.now(UTC)
        if status == "completed":
            record.completed_at = datetime.now(UTC)
        if status == "failed":
            record.failed_at = datetime.now(UTC)
        db.commit()
    except Exception:
        logger.warning(
            "Failed to upsert MeetingTaskStatusRecord for %s; status file and DB mirror may diverge.",
            job_id,
            exc_info=True,
        )
        if db is not None:
            db.rollback()
    finally:
        if db is not None:
            db.close()


def save_analysis_meta(job_id: str, analysis: dict[str, Any]) -> None:
    write_meta_file(analysis_meta_path(job_id), analysis)


def read_analysis_meta(job_id: str) -> dict[str, Any]:
    return read_meta_file(analysis_meta_path(job_id))
