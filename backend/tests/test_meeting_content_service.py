from pathlib import Path

import pytest
from fastapi import HTTPException

from app.models.meeting import MeetingRecord
from app.services.meeting_content import prepare_meeting_export, read_meeting_memo, save_meeting_memo


def test_read_meeting_memo_returns_recovery_content_when_transcript_exists(tmp_path: Path) -> None:
    transcript_path = tmp_path / "meeting.txt"
    transcript_path.write_text("Discussed release risk and next milestone.", encoding="utf-8")
    record = MeetingRecord(
        id="memo-recovery",
        title="Release sync",
        memo_path=str(tmp_path / "missing.md"),
        transcript_path=str(transcript_path),
    )

    payload = read_meeting_memo(record)

    assert payload["content"].startswith("# Memo recovery")
    assert "Discussed release risk" in payload["content"]
    assert payload["analysis"] == {}


def test_save_meeting_memo_rejects_records_without_memo_path() -> None:
    record = MeetingRecord(id="missing-memo", title="Missing memo")

    with pytest.raises(HTTPException) as exc_info:
        save_meeting_memo(record, "# Memo")

    assert exc_info.value.status_code == 404


def test_prepare_meeting_export_returns_existing_markdown_file(tmp_path: Path) -> None:
    memo_path = tmp_path / "memo.md"
    memo_path.write_text("# Memo", encoding="utf-8")
    record = MeetingRecord(id="export-md", title="Export", memo_path=str(memo_path))

    output_path, filename = prepare_meeting_export(record, "md")

    assert output_path == str(memo_path)
    assert filename == "Meeting_Note_export-md.md"
