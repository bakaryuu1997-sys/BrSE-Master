import os
from typing import Any

from fastapi import HTTPException

from app.core.config import settings
from app.models.meeting import MeetingRecord
from app.services.export_service import ExportService
from app.services.meeting_artifacts import read_analysis_meta
from app.services.meeting_memo_repair import build_analysis_backed_memo, memo_needs_analysis_repair

MAX_MEMO_UPDATE_BYTES = 1 * 1024 * 1024


def read_meeting_memo(record: MeetingRecord) -> dict[str, Any]:
    analysis = read_analysis_meta(record.id)
    if not record.memo_path or not os.path.exists(record.memo_path):
        transcript_path = record.transcript_path or os.path.join(settings.transcript_folder, f"{record.id}.txt")
        if transcript_path and os.path.exists(transcript_path):
            with open(transcript_path, "r", encoding="utf-8") as handle:
                transcript_excerpt = handle.read()[:4000]
            return {
                "content": (
                    "# Memo recovery\n\n"
                    "Memo file is missing, but the transcript still exists. Run retry/re-summarize to rebuild the full memo.\n\n"
                    "## Transcript excerpt\n\n"
                    f"{transcript_excerpt}"
                ),
                "analysis": analysis,
            }

        return {
            "content": (
                "# Memo file is missing\n\n"
                "The database record still exists, but the memo file is no longer available on disk. "
                "This can happen if the backend container was recreated before Meeting Note storage was mounted to the host.\n\n"
                "Please re-upload the original media file, then run the Meeting Note pipeline again. Future memo/media files are protected by persistent Docker volumes."
            ),
            "analysis": analysis,
        }

    with open(record.memo_path, "r", encoding="utf-8") as handle:
        content = handle.read()

    if memo_needs_analysis_repair(content, analysis):
        repaired_content = build_analysis_backed_memo(record.title, content, analysis)
        try:
            with open(record.memo_path, "w", encoding="utf-8") as handle:
                handle.write(repaired_content)
            content = repaired_content
        except OSError:
            content = repaired_content

    return {"content": content, "analysis": analysis}


def save_meeting_memo(record: MeetingRecord, content: str) -> dict[str, Any]:
    if not record.memo_path:
        raise HTTPException(status_code=404, detail="Memo not found")

    encoded_size = len(content.encode("utf-8"))
    if encoded_size > MAX_MEMO_UPDATE_BYTES:
        raise HTTPException(status_code=413, detail="Memo content is too large.")

    memo_dir = os.path.dirname(record.memo_path)
    if memo_dir:
        os.makedirs(memo_dir, exist_ok=True)

    with open(record.memo_path, "w", encoding="utf-8") as handle:
        handle.write(content)

    return {"message": "Memo saved", "size": encoded_size}


def prepare_meeting_export(record: MeetingRecord, export_format: str) -> tuple[str, str]:
    if not record.memo_path or not os.path.exists(record.memo_path):
        raise HTTPException(status_code=404, detail="Memo not found")

    with open(record.memo_path, "r", encoding="utf-8") as handle:
        content = handle.read()

    if export_format == "md":
        return record.memo_path, f"Meeting_Note_{record.id}.md"

    output_path = os.path.join(settings.memo_folder, f"{record.id}.{export_format}")
    if export_format == "pdf":
        ExportService.to_pdf(content, output_path)
    elif export_format == "docx":
        ExportService.to_word(content, output_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

    return output_path, f"Meeting_Note_{record.id}.{export_format}"
