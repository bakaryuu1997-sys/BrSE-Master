import os
from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.meeting import MeetingRecord
from app.services.meeting_artifacts import read_meta_file, status_meta_path, update_status_meta
from app.services.meeting_utils import seconds_between_iso

SummarySource = Literal["media", "pasted"]


def summarize_status_message(step: str, source: SummarySource) -> str:
    if step == "reducing":
        return "Reducing long transcript into memo."
    return "Summarizing pasted transcript." if source == "pasted" else "Summarizing transcript into meeting memo."


def build_summarize_progress_meta(step: str, percent: int, details: dict[str, Any], source: SummarySource) -> dict[str, Any]:
    return {
        "current_step": step,
        "progress_percent": percent,
        "status_message": summarize_status_message(step, source),
        "summary_chunks_done": details.get("completed") if step == "summarizing" else None,
        "summary_chunks_total": details.get("total") if step == "summarizing" else None,
        "reduce_batches_done": details.get("completed") if step == "reducing" else None,
        "reduce_batches_total": details.get("total") if step == "reducing" else None,
    }


def save_generated_memo(job_id: str, memo: str) -> str:
    os.makedirs(settings.memo_folder, exist_ok=True)
    memo_path = os.path.join(settings.memo_folder, f"{job_id}.md")
    with open(memo_path, "w", encoding="utf-8") as handle:
        handle.write(memo)
    return memo_path


def complete_meeting_processing(db: Session, record: MeetingRecord, job_id: str, todo_drafts: int) -> None:
    completed_at = datetime.now(timezone.utc)
    record.status = "completed"
    record.completed_at = completed_at
    db.commit()
    ai_processing_completed_at = completed_at.isoformat()
    status_meta = read_meta_file(status_meta_path(job_id))
    update_status_meta(
        job_id,
        current_step="completed",
        progress_percent=100,
        status_message=f"Meeting memo is ready. Created {todo_drafts} Todo draft(s) for review.",
        auto_created_todos=0,
        todo_drafts=todo_drafts,
        ai_processing_completed_at=ai_processing_completed_at,
        ai_processing_seconds=seconds_between_iso(status_meta.get("ai_processing_started_at"), ai_processing_completed_at),
    )
