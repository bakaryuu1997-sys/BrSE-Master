import os
from pathlib import Path

from app.core.config import settings
from app.services import meeting_translation
from app.services.meeting_transcription import (
    correct_transcript_terms,
    extract_audio_for_transcription,
    save_corrected_transcript_text,
    save_transcript_srt,
    save_transcript_text,
    transcription_progress_percent,
)


def test_transcription_progress_percent_caps_duration_based_progress() -> None:
    assert transcription_progress_percent(segment_count=2, segment_end=5, duration=10) == 40
    assert transcription_progress_percent(segment_count=99, segment_end=100, duration=100) == 52


def test_transcription_progress_percent_falls_back_to_segment_count_without_duration() -> None:
    assert transcription_progress_percent(segment_count=3, segment_end=0, duration=0) == 31
    assert transcription_progress_percent(segment_count=99, segment_end=0, duration=0) == 52


def test_save_transcript_text_writes_to_transcript_folder(tmp_path: Path) -> None:
    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(tmp_path / "transcripts")
    try:
        path = save_transcript_text("transcription-save", "hello transcript")

        assert path == os.path.join(settings.transcript_folder, "transcription-save.txt")
        assert Path(path).read_text(encoding="utf-8") == "hello transcript"
    finally:
        settings.transcript_folder = original_transcript_folder


def test_extract_audio_for_transcription_leaves_audio_files_unchanged(tmp_path: Path) -> None:
    source = tmp_path / "meeting.wav"
    source.write_bytes(b"audio")

    assert extract_audio_for_transcription(str(source), "audio-job") == str(source)



def test_save_transcript_srt_writes_timestamped_segments(tmp_path: Path) -> None:
    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(tmp_path / "transcripts")
    try:
        path = save_transcript_srt(
            "srt-save",
            [
                {"start": 1.25, "end": 3.5, "text": "Xin chào"},
                {"start": 65.0, "end": 66.125, "text": "đi dài nốt cần íp bọt"},
            ],
        )

        assert path == os.path.join(settings.transcript_folder, "srt-save.srt")
        assert Path(path).read_text(encoding="utf-8") == (
            "1\n00:00:01,250 --> 00:00:03,500\nXin chào\n\n"
            "2\n00:01:05,000 --> 00:01:06,125\ndesign note cần import\n"
        )
    finally:
        settings.transcript_folder = original_transcript_folder


def test_save_transcript_srt_skips_empty_segments(tmp_path: Path) -> None:
    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(tmp_path / "transcripts")
    try:
        path = save_transcript_srt("empty-srt", [])

        assert path == ""
        assert not (Path(settings.transcript_folder) / "empty-srt.srt").exists()
    finally:
        settings.transcript_folder = original_transcript_folder


def test_correct_transcript_terms_keeps_raw_separate_and_uses_dictionary(tmp_path: Path) -> None:
    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(tmp_path / "transcripts")
    try:
        raw = "đi dài nốt cần íp bọt rồi mít tinh nốt"
        path = save_corrected_transcript_text(
            "corrected-save",
            raw,
            [{"english": "Design Note", "japanese": "", "vietnamese": ""}],
        )

        assert correct_transcript_terms(raw) == "design note cần import rồi meeting note"
        assert Path(path).read_text(encoding="utf-8") == "Design Note cần import rồi meeting note"
        assert not (Path(settings.transcript_folder) / "corrected-save.txt").exists()
    finally:
        settings.transcript_folder = original_transcript_folder



def test_reclean_srt_terms_preserves_srt_structure() -> None:
    srt = """1
00:00:00,000 --> 00:00:02,000
đi dài nốt cần íp bọt
"""

    assert meeting_translation.reclean_srt_terms(srt) == """1
00:00:00,000 --> 00:00:02,000
design note cần import
"""


def test_save_translated_artifacts_writes_transcript_and_srt(monkeypatch, tmp_path: Path) -> None:
    original_transcript_folder = settings.transcript_folder
    settings.transcript_folder = str(tmp_path / "transcripts")

    async def fake_create_chat_completion(messages, **kwargs):  # noqa: ANN001
        content = messages[-1]["content"]
        if "SRT chunk" in content:
            return """1
00:00:00,000 --> 00:00:02,000
Translated subtitle
"""
        return "Translated transcript"

    monkeypatch.setattr(meeting_translation, "create_chat_completion", fake_create_chat_completion)
    try:
        transcript_path, srt_path, char_count = __import__("asyncio").run(
            meeting_translation.save_translated_artifacts(
                "translate-save",
                "đi dài nốt cần íp bọt",
                "en",
                srt_text="""1
00:00:00,000 --> 00:00:02,000
đi dài nốt
""",
            )
        )

        assert Path(transcript_path).name == "translate-save.translated.en.txt"
        assert Path(transcript_path).read_text(encoding="utf-8") == "Translated transcript\n"
        assert srt_path is not None
        assert Path(srt_path).name == "translate-save.translated.en.srt"
        assert Path(srt_path).read_text(encoding="utf-8") == """1
00:00:00,000 --> 00:00:02,000
Translated subtitle
"""
        assert char_count == len("Translated transcript")
    finally:
        settings.transcript_folder = original_transcript_folder
