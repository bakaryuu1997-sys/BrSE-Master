import os
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.meeting import MeetingRecord
from app.services.meeting_artifacts import (
    meta_folder_path,
    read_analysis_meta,
    read_meta_file,
    status_meta_path,
    update_status_meta,
)
from app.services.meeting_utils import get_upload_size_state, mark_upload_incomplete


def is_recovered_meeting_title(value: str | None) -> bool:
    if not value:
        return True
    return value.strip().lower().startswith("recovered meeting")


def clean_meeting_display_name(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    name = os.path.basename(value.strip())
    if not name:
        return ""
    name = re.sub(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]?", "", name)
    name = re.sub(r"^live_([0-9a-fA-F-]{36})[_-]?", "Live recording ", name)
    if name.endswith("_transcribe.wav"):
        name = name.removesuffix("_transcribe.wav")
    stem, ext = os.path.splitext(name)
    return (stem if ext else name).strip(" _-.") or name


def derive_recovered_meeting_identity(job_id: str, source_path: str, status_meta: dict[str, Any], analysis: dict[str, Any]) -> tuple[str, str]:
    original_filename = (
        status_meta.get("original_filename")
        or status_meta.get("filename")
        or status_meta.get("source_filename")
        or analysis.get("original_filename")
        or analysis.get("filename")
    )
    display_title = (
        status_meta.get("display_title")
        or status_meta.get("title")
        or analysis.get("title")
        or original_filename
    )
    source_name = os.path.basename(source_path) if source_path else f"{job_id}.txt"
    filename = str(original_filename or source_name)
    title = clean_meeting_display_name(display_title) or clean_meeting_display_name(filename)
    if not title:
        title = f"Recovered meeting {job_id[:8]}"
    return title[:255], filename[:255]


def recover_meeting_records_from_storage(db: Session) -> int:
    folders = [settings.upload_folder, settings.transcript_folder, settings.memo_folder, meta_folder_path()]
    job_ids: set[str] = set()
    uuid_pattern = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
    for folder in folders:
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            match = uuid_pattern.search(name)
            if match:
                job_ids.add(match.group(0))

    recovered = 0
    for job_id in sorted(job_ids):
        if db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first():
            continue
        source_path = ""
        if os.path.isdir(settings.upload_folder):
            for name in os.listdir(settings.upload_folder):
                if not name.startswith(job_id) and not name.startswith(f"live_{job_id}"):
                    continue
                if name.endswith("_transcribe.wav"):
                    continue
                candidate = os.path.join(settings.upload_folder, name)
                if os.path.isfile(candidate):
                    source_path = candidate
                    break

        transcript_path = os.path.join(settings.transcript_folder, f"{job_id}.txt")
        memo_path = os.path.join(settings.memo_folder, f"{job_id}.md")
        has_transcript = os.path.exists(transcript_path)
        has_memo = os.path.exists(memo_path)
        has_source = bool(source_path and os.path.exists(source_path))
        if not (has_source or has_transcript or has_memo):
            continue

        status_meta = read_meta_file(status_meta_path(job_id))
        analysis = read_analysis_meta(job_id)
        title, filename = derive_recovered_meeting_identity(job_id, source_path, status_meta, analysis)

        created_from = source_path or (transcript_path if has_transcript else memo_path)
        try:
            created_at = datetime.fromtimestamp(os.path.getmtime(created_from), timezone.utc)
        except OSError:
            created_at = datetime.now(timezone.utc)

        expected_upload_size = int(status_meta.get("file_size_bytes") or 0)
        actual_upload_size = int(status_meta.get("uploaded_bytes") or 0)
        if not actual_upload_size and has_source:
            actual_upload_size = os.path.getsize(source_path)
        is_partial_upload = status_meta.get("current_step") == "uploading" and expected_upload_size > actual_upload_size

        if has_memo:
            status = "completed"
            completed_at = created_at
        elif is_partial_upload:
            status = "pending"
            completed_at = None
        else:
            status = "failed"
            completed_at = None
            update_status_meta(
                job_id,
                current_step=status_meta.get("current_step") or "recovered",
                progress_percent=status_meta.get("progress_percent") or 100,
                status_message=(
                    status_meta.get("status_message")
                    or "Recovered source media/transcript from storage. Click retry to rebuild the memo."
                ),
            )

        db.add(
            MeetingRecord(
                id=job_id,
                title=title,
                status=status,
                filename=filename,
                file_path=source_path or None,
                transcript_path=transcript_path if has_transcript else None,
                memo_path=memo_path if has_memo else None,
                language=str(status_meta.get("language") or "vi"),
                template=str(status_meta.get("template") or "meeting"),
                model=status_meta.get("model"),
                created_at=created_at,
                completed_at=completed_at,
            )
        )
        recovered += 1
    if recovered:
        db.commit()
    return recovered


def repair_meeting_records_from_storage_state(db: Session) -> int:
    repaired = 0
    records = db.query(MeetingRecord).all()
    for record in records:
        status_meta = read_meta_file(status_meta_path(record.id))
        analysis = read_analysis_meta(record.id)
        changed = False

        transcript_path = os.path.join(settings.transcript_folder, f"{record.id}.txt")
        memo_path = os.path.join(settings.memo_folder, f"{record.id}.md")
        if os.path.exists(transcript_path) and record.transcript_path != transcript_path:
            record.transcript_path = transcript_path
            changed = True
        if os.path.exists(memo_path) and record.memo_path != memo_path:
            record.memo_path = memo_path
            changed = True
        _, _, upload_incomplete = get_upload_size_state(record.id, record.file_path)
        if upload_incomplete:
            mark_upload_incomplete(record.id, record, db, record.file_path)
            changed = True
        elif os.path.exists(memo_path) and record.status != "completed":
            record.status = "completed"
            try:
                record.completed_at = datetime.fromtimestamp(os.path.getmtime(memo_path), timezone.utc)
            except OSError:
                record.completed_at = record.completed_at or datetime.now(timezone.utc)
            changed = True

        if is_recovered_meeting_title(record.title):
            title, filename = derive_recovered_meeting_identity(record.id, record.file_path or "", status_meta, analysis)
            if not is_recovered_meeting_title(title):
                record.title = title
                record.filename = filename or record.filename
                changed = True

        if changed:
            repaired += 1
    if repaired:
        db.commit()
    return repaired
