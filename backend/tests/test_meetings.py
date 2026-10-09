import json
from datetime import UTC, datetime

from docx import Document
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.meeting import MeetingRecord
from app.services.export_service import ExportService


client = TestClient(app)


def test_docx_export_does_not_duplicate_markdown_blocks(tmp_path) -> None:
    md_content = """# Meeting Note

## Summary

- Confirm API scope
- Send follow-up

| Item | Owner |
| --- | --- |
| Q&A | BrSE |
"""
    output_path = tmp_path / "meeting.docx"

    ExportService.to_word(md_content, str(output_path))

    document = Document(str(output_path))
    paragraph_text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    table_text = "\n".join(cell.text for table in document.tables for row in table.rows for cell in row.cells)
    combined_text = f"{paragraph_text}\n{table_text}"

    assert combined_text.count("Confirm API scope") == 1
    assert combined_text.count("Send follow-up") == 1
    assert combined_text.count("Q&A") == 1


def test_meeting_upload_rejects_unsupported_file_type() -> None:
    response = client.post(
        "/api/meetings/upload",
        files={"file": ("notes.exe", b"not-a-meeting", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported meeting file type."


def test_meeting_memo_read_and_save_flow(tmp_path) -> None:
    job_id = "pytest-meeting-memo"
    memo_path = tmp_path / "memo.md"
    meta_dir = tmp_path / "_meta"
    meta_dir.mkdir(exist_ok=True)
    analysis_path = meta_dir / f"{job_id}.analysis.json"
    analysis_path.write_text(
        json.dumps(
            {
                "summary": "Short summary",
                "decisions": ["Confirm API scope"],
                "actions": [{"task": "Send follow-up", "owner": "BrSE", "deadline": "2026-05-09", "status": "open"}],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    memo_path.write_text("# Initial memo", encoding="utf-8")

    original_memo_folder = settings.memo_folder
    settings.memo_folder = str(tmp_path)

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingRecord(
            id=job_id,
            title="Pytest meeting",
            status="completed",
            filename="pytest.txt",
            memo_path=str(memo_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    read_response = client.get(f"/api/meetings/{job_id}/memo")
    assert read_response.status_code == 200
    assert read_response.json()["content"] == "# Initial memo"
    assert read_response.json()["analysis"]["decisions"] == ["Confirm API scope"]

    export_response = client.get(f"/api/meetings/{job_id}/export/md")
    assert export_response.status_code == 200
    assert export_response.content.decode("utf-8") == "# Initial memo"

    save_response = client.put(
        f"/api/meetings/{job_id}/memo",
        json={"content": "# Updated memo\n\n- Action item"},
    )
    assert save_response.status_code == 200
    assert save_response.json()["message"] == "Memo saved"
    assert memo_path.read_text(encoding="utf-8") == "# Updated memo\n\n- Action item"

    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()
        settings.memo_folder = original_memo_folder


def test_meeting_transcript_download_returns_text_file(tmp_path) -> None:
    job_id = "pytest-transcript-download"
    transcript_path = tmp_path / "transcript.txt"
    transcript_path.write_text("hello transcript\\n仕様確認", encoding="utf-8")

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingRecord(
            id=job_id,
            title="Day 1 requirement session",
            status="completed",
            filename="day1.mp4",
            transcript_path=str(transcript_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    response = client.get(f"/api/meetings/{job_id}/transcript/download")
    assert response.status_code == 200
    assert response.content.decode("utf-8") == "hello transcript\\n仕様確認"
    assert "day1_transcript.txt" in response.headers["content-disposition"]

    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()


def test_meeting_memo_repairs_prompt_leak_from_analysis(tmp_path) -> None:
    job_id = "pytest-meeting-repair"
    memo_path = tmp_path / "memo.md"
    meta_dir = tmp_path / "_meta"
    meta_dir.mkdir(exist_ok=True)
    analysis_path = meta_dir / f"{job_id}.analysis.json"
    analysis_path.write_text(
        json.dumps(
            {
                "summary": "Requirement study session.",
                "short_summary": "- Learned requirement definition\n- Confirmed BrSE follow-up points",
                "detailed_summary": "- BrSE must clarify scope and business rules\n- Open questions should become Q&A items\n- Requirement changes must be tracked across versions",
                "decisions": ["Use practical requirement examples."],
                "actions": [{"task": "Create Q&A for unclear scope", "owner": "BrSE", "deadline": "", "status": "open"}],
                "risks": ["Scope ambiguity can cause rework."],
                "open_questions": ["Which items are out of scope?"],
                "keywords": ["要件定義", "scope"],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    memo_path.write_text(
        "# Meeting Note\n\n"
        "## Short Summary\n"
        "- Meeting note was generated with local structured fallback from transcript and memo.\n\n"
        "## Source Excerpt\n"
        "Below are consolidated summaries of a long meeting. Synthesize them into one complete Meeting Note.",
        encoding="utf-8",
    )

    original_memo_folder = settings.memo_folder
    settings.memo_folder = str(tmp_path)

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingRecord(
            id=job_id,
            title="Pytest repaired meeting",
            status="completed",
            filename="pytest.mp4",
            memo_path=str(memo_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    response = client.get(f"/api/meetings/{job_id}/memo")
    assert response.status_code == 200
    content = response.json()["content"]
    assert "# Pytest repaired meeting" in content
    assert "BrSE must clarify scope" in content
    assert "Synthesize them into one complete Meeting Note" not in content
    assert memo_path.read_text(encoding="utf-8") == content

    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()
        settings.memo_folder = original_memo_folder


def test_meeting_resummarize_requires_transcript(tmp_path) -> None:
    job_id = "pytest-meeting-no-transcript"
    memo_path = tmp_path / "memo.md"
    memo_path.write_text("# Memo", encoding="utf-8")

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingRecord(
            id=job_id,
            title="Pytest no transcript",
            status="completed",
            filename="pytest.txt",
            memo_path=str(memo_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    response = client.post(f"/api/meetings/{job_id}/resummarize")
    assert response.status_code == 404
    assert response.json()["detail"] == "Transcript not found"

    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()


def test_process_url_returns_job_id_and_queued_status_quickly(monkeypatch) -> None:
    from app.api.routes import meetings_process

    calls = []

    def fake_download_and_process_task(*args) -> None:  # noqa: ANN001
        calls.append(args)

    monkeypatch.setattr(meetings_process, "download_and_process_task", fake_download_and_process_task)

    response = client.post(
        "/api/meetings/process-url",
        json={"url": "https://example.test/watch?v=brse", "language": "vi", "template": "meeting", "model": None},
    )

    assert response.status_code == 200
    payload = response.json()
    job_id = payload["id"]
    assert job_id
    assert payload["status"] == "processing"
    assert payload["current_step"] == "queued"
    assert payload["progress_percent"] == 8
    assert payload["status_message"] == "Downloading audio from URL."
    assert payload["recovery_metadata"]["source_url"] == "https://example.test/watch?v=brse"
    assert payload["source_available"] is False
    assert payload["transcript_available"] is False
    assert calls == [(job_id, "https://example.test/watch?v=brse", "vi", "meeting", None, False)]


def test_process_url_transcript_only_queues_transcript_mode(monkeypatch) -> None:
    from app.api.routes import meetings_process

    calls = []

    def fake_download_and_process_task(*args) -> None:  # noqa: ANN001
        calls.append(args)

    monkeypatch.setattr(meetings_process, "download_and_process_task", fake_download_and_process_task)

    response = client.post(
        "/api/meetings/process-url",
        json={
            "url": "https://example.test/day1",
            "language": "vi",
            "template": "meeting",
            "model": None,
            "transcript_only": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["transcript_only"] is True
    assert payload["status_message"] == "Downloading audio from URL for transcript only."
    assert calls == [(payload["id"], "https://example.test/day1", "vi", "meeting", None, True)]



def test_retranscribe_queues_source_media_even_when_transcript_exists(monkeypatch, tmp_path) -> None:
    from app.api.routes import meetings_process

    job_id = "pytest-meeting-retranscribe"
    media_path = tmp_path / "day13.mp4"
    media_path.write_bytes(b"fake-media")
    transcript_path = tmp_path / "short.txt"
    transcript_path.write_text("short transcript", encoding="utf-8")
    calls = []

    def fake_enqueue(*args, **kwargs) -> None:  # noqa: ANN001
        calls.append(kwargs)

    monkeypatch.setattr(meetings_process, "enqueue_background_meeting_job", fake_enqueue)

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingRecord(
            id=job_id,
            title="Pytest retranscribe source",
            status="completed",
            filename="day13.mp4",
            file_path=str(media_path),
            transcript_path=str(transcript_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    response = client.post(f"/api/meetings/{job_id}/retranscribe")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "processing"
    assert calls
    assert calls[0]["kind"] == "meeting_media_retranscribe"
    assert calls[0]["args"][:5] == (job_id, str(media_path), "vi", "meeting", None)

    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()



def test_meeting_transcript_artifact_downloads_return_corrected_and_srt(tmp_path) -> None:
    job_id = "pytest-transcript-artifacts"
    transcript_path = tmp_path / "raw.txt"
    transcript_path.write_text("đi dài nốt cần íp bọt", encoding="utf-8")
    transcript_folder = tmp_path / "transcripts"
    transcript_folder.mkdir()
    srt_path = transcript_folder / f"{job_id}.srt"
    srt_path.write_text("1\n00:00:00,000 --> 00:00:01,000\nhello\n", encoding="utf-8")

    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(transcript_folder)

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        record = MeetingRecord(
            id=job_id,
            title="Artifact meeting",
            status="completed",
            filename="artifact.mp4",
            transcript_path=str(transcript_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    corrected_response = client.get(f"/api/meetings/{job_id}/transcript/corrected/download")
    assert corrected_response.status_code == 200
    assert corrected_response.content.decode("utf-8") == "design note cần import"
    assert "artifact_transcript_corrected.txt" in corrected_response.headers["content-disposition"]

    srt_response = client.get(f"/api/meetings/{job_id}/transcript/srt")
    assert srt_response.status_code == 200
    assert srt_response.content.decode("utf-8") == "1\n00:00:00,000 --> 00:00:01,000\nhello\n"
    assert "artifact_transcript.srt" in srt_response.headers["content-disposition"]

    db = SessionLocal()
    try:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()
        settings.transcript_folder = original_transcript_folder



def test_meeting_status_merge_accepts_dict_recovery_metadata() -> None:
    from app.services.meeting_status import merge_task_status_meta

    merged = merge_task_status_meta(
        {"current_step": "queued", "updated_at": "2026-06-07T00:00:00+00:00"},
        {
            "updated_at": "2026-06-07T00:00:01+00:00",
            "recovery_metadata": {"source_url": "https://example.test/video"},
            "task_status": "processing",
        },
    )

    assert merged["recovery_metadata"] == {"source_url": "https://example.test/video"}
    assert merged["task_status"] == "processing"



def test_auto_resume_meeting_job_reuses_available_source_media(monkeypatch, tmp_path) -> None:
    from app import main as app_main
    from app.services import meeting_job_runner

    media_path = tmp_path / "day1.mp4"
    media_path.write_bytes(b"fake-media")
    record = MeetingRecord(
        id="pytest-auto-resume-source",
        title="day1.mp4",
        status="processing",
        filename="day1.mp4",
        file_path=str(media_path),
        language="vi",
        template="meeting",
    )
    calls = []

    def fake_start_meeting_job_thread(**kwargs) -> None:  # noqa: ANN001
        calls.append(kwargs)

    monkeypatch.setattr(meeting_job_runner, "start_meeting_job_thread", fake_start_meeting_job_thread)

    payload = {"auto_resume": True, "transcript_only": True}
    assert app_main._auto_resume_meeting_job(record, payload) is True
    assert record.status == "processing"
    assert calls[0]["kind"] == "meeting_auto_resume_media"
    assert calls[0]["args"] == (record.id, str(media_path), "vi", "meeting", None, True)



def test_meeting_transcript_translation_artifacts_can_be_generated_and_downloaded(monkeypatch, tmp_path) -> None:
    from app.api.routes import meetings_content
    from app.services.meeting_translation import translated_srt_path, translated_transcript_path

    job_id = "pytest-transcript-translation"
    transcript_folder = tmp_path / "transcripts"
    transcript_folder.mkdir()
    transcript_path = transcript_folder / f"{job_id}.txt"
    transcript_path.write_text("design note cần import", encoding="utf-8")
    srt_path = transcript_folder / f"{job_id}.srt"
    srt_path.write_text("""1
00:00:00,000 --> 00:00:01,000
design note
""", encoding="utf-8")

    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(transcript_folder)

    async def fake_save(job_id_arg, transcript, target_language, glossary_terms, *, srt_text=None, model=None):  # noqa: ANN001
        translated_path = translated_transcript_path(job_id_arg, target_language)
        translated_srt = translated_srt_path(job_id_arg, target_language)
        with open(translated_path, "w", encoding="utf-8") as handle:
            handle.write("translated transcript\n")
        with open(translated_srt, "w", encoding="utf-8") as handle:
            handle.write("""1
00:00:00,000 --> 00:00:01,000
translated subtitle
""")
        return translated_path, translated_srt, len("translated transcript")

    monkeypatch.setattr(meetings_content, "save_translated_artifacts", fake_save)

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()
        record = MeetingRecord(
            id=job_id,
            title="Translate artifact meeting",
            status="completed",
            filename="translation.mp4",
            transcript_path=str(transcript_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    try:
        response = client.post(
            f"/api/meetings/{job_id}/transcript/translate",
            json={"target_language": "ja", "model": "gemma4:12b"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["target_language"] == "ja"
        assert payload["srt_available"] is True

        transcript_response = client.get(f"/api/meetings/{job_id}/transcript/translated/download?target_language=ja")
        assert transcript_response.status_code == 200
        assert transcript_response.content.decode("utf-8") == "translated transcript\n"

        srt_response = client.get(f"/api/meetings/{job_id}/transcript/translated/srt?target_language=ja")
        assert srt_response.status_code == 200
        assert srt_response.content.decode("utf-8") == """1
00:00:00,000 --> 00:00:01,000
translated subtitle
"""
    finally:
        db = SessionLocal()
        try:
            record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
            if record:
                db.delete(record)
                db.commit()
        finally:
            db.close()
            settings.transcript_folder = original_transcript_folder


def test_reclean_meeting_transcripts_refreshes_corrected_artifacts(tmp_path) -> None:
    job_id = "pytest-reclean-transcript"
    transcript_folder = tmp_path / "transcripts"
    transcript_folder.mkdir()
    transcript_path = transcript_folder / f"{job_id}.txt"
    transcript_path.write_text("đi dài nốt cần íp bọt", encoding="utf-8")
    srt_path = transcript_folder / f"{job_id}.srt"
    srt_path.write_text("""1
00:00:00,000 --> 00:00:01,000
đi dài nốt
""", encoding="utf-8")

    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(transcript_folder)

    db = SessionLocal()
    try:
        existing = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if existing:
            db.delete(existing)
            db.commit()
        record = MeetingRecord(
            id=job_id,
            title="Reclean transcript meeting",
            status="completed",
            filename="reclean.mp4",
            transcript_path=str(transcript_path),
            language="vi",
            template="meeting",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    try:
        response = client.post("/api/meetings/transcripts/reclean", json={"meeting_ids": [job_id]})
        assert response.status_code == 200
        payload = response.json()
        assert payload["updated_count"] == 1
        assert payload["meeting_ids"] == [job_id]
        assert (transcript_folder / f"{job_id}.corrected.txt").read_text(encoding="utf-8") == "design note cần import"
        assert srt_path.read_text(encoding="utf-8") == """1
00:00:00,000 --> 00:00:01,000
design note
"""
    finally:
        db = SessionLocal()
        try:
            record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
            if record:
                db.delete(record)
                db.commit()
        finally:
            db.close()
            settings.transcript_folder = original_transcript_folder
