import os
import re
import threading
import time
import logging
import uuid
from datetime import datetime, UTC
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.meeting import MeetingRecord
from app.models.glossary import GlossaryTerm
from app.services.stt_engines import transcribe_with_engine
from app.services.summarizer import SummarizerService
from app.services.url_processor import URLProcessor
from app.services.meeting_artifacts import (
    save_analysis_meta,
    status_meta_path,
    update_status_meta,
    read_meta_file,
)
from app.services.meeting_status import (
    MeetingJobCancelled, 
    ensure_not_cancelled, 
)
from app.services.meeting_todo_sync import create_meeting_action_drafts
from app.services.stt_metrics import aggregate_confidence, build_stt_benchmark
from app.services.transcript_quality import assess_transcript_quality
from app.services.meeting_transcription import (
    extract_audio_for_transcription,
    save_corrected_transcript_text,
    save_transcript_text,
    save_transcript_srt,
    transcription_progress_percent,
)
from app.services.meeting_summary_pipeline import (
    build_summarize_progress_meta,
    complete_meeting_processing,
    save_generated_memo,
)
from app.services.meeting_utils import (
    utc_now_iso,
    read_summary_checkpoint,
    persist_summary_checkpoint,
    get_upload_size_state,
    mark_upload_incomplete,
)

logger = logging.getLogger(__name__)

MEETING_PROCESSING_SEMAPHORE = threading.BoundedSemaphore(max(1, settings.meeting_processing_workers))
GLOSSARY_SECTION_MARKERS = ("Glossary", "用語集")


def glossary_terms_for_transcript_correction(db_session: Session) -> list[dict[str, str]]:
    terms = db_session.query(GlossaryTerm).limit(500).all()
    return [
        {
            "english": term.english or "",
            "japanese": term.japanese or "",
            "vietnamese": term.vietnamese or "",
        }
        for term in terms
    ]


def cleanup_source_media_after_processing(
    db_session: Session,
    record: MeetingRecord,
    job_id: str,
    transcription_input: str | None = None,
) -> list[str]:
    """Delete heavy uploaded/source media after transcript/memo artifacts are persisted."""
    status_meta = read_meta_file(status_meta_path(job_id))
    if bool(status_meta.get("keep_source_media")):
        update_status_meta(job_id, keep_source_media=True, source_media_retained=True)
        return []

    protected_paths = {path for path in (record.transcript_path, record.memo_path) if path}
    candidates: list[str] = []
    for path in (record.file_path, transcription_input):
        if path and path not in protected_paths and path not in candidates:
            candidates.append(path)

    deleted: list[str] = []
    for path in candidates:
        if os.path.exists(path):
            try:
                os.remove(path)
                deleted.append(path)
            except OSError as exc:
                logger.warning("Could not delete Meeting Note source media %s: %s", path, exc)

    if record.file_path in deleted:
        record.file_path = None
        db_session.commit()

    update_status_meta(
        job_id,
        keep_source_media=False,
        source_media_retained=False,
        source_media_deleted=True,
        source_media_deleted_files=[os.path.basename(path) for path in deleted],
    )
    return deleted


def process_meeting_task(job_id: str, file_path: str, language: str, template: str, model_name: Optional[str], transcript_only: bool = False):
    if read_meta_file(status_meta_path(job_id)).get("cancel_requested"):
        return
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=14,
        status_message="Waiting for the local Meeting Note processing lane.",
    )
    with MEETING_PROCESSING_SEMAPHORE:
        if read_meta_file(status_meta_path(job_id)).get("cancel_requested"):
            return
        return _process_meeting_task_locked(job_id, file_path, language, template, model_name, transcript_only)


def _process_meeting_task_locked(job_id: str, file_path: str, language: str, template: str, model_name: Optional[str], transcript_only: bool = False):
    db_session = SessionLocal()
    try:
        ensure_not_cancelled(job_id)
        # 1. Update status to transcribing
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if not record:
            return
        if not file_path or not os.path.exists(file_path):
            record.status = "failed"
            db_session.commit()
            update_status_meta(
                job_id,
                current_step="missing_source",
                progress_percent=100,
                status_message="Source media file is missing. Please re-upload the original file.",
            )
            return
        _, _, upload_incomplete = get_upload_size_state(job_id, file_path)
        if upload_incomplete:
            mark_upload_incomplete(job_id, record, db_session, file_path)
            return
        record.status = "transcribing"
        db_session.commit()
        ai_processing_started_at = utc_now_iso()
        update_status_meta(
            job_id,
            current_step="transcribing",
            progress_percent=28,
            status_message="Transcribing audio/video with Whisper.",
            ai_processing_started_at=ai_processing_started_at,
            ai_processing_mode=("transcript_only" if transcript_only else "whisper"),
            transcript_only=transcript_only,
        )

        # 2. Transcribe
        transcription_input = extract_audio_for_transcription(file_path, job_id)
        ensure_not_cancelled(job_id)
        status_meta = read_meta_file(status_meta_path(job_id))
        whisper_model = status_meta.get("whisper_model") or settings.whisper_model
        def handle_transcribe_progress(segment_count: int, segment_end: float, duration: float) -> None:
            ensure_not_cancelled(job_id)
            update_status_meta(
                job_id,
                current_step="transcribing",
                progress_percent=transcription_progress_percent(segment_count, segment_end, duration),
                status_message=f"Transcribing segment {segment_count}.",
                segment_count=segment_count,
            )

        # Dispatch to the configured engine (settings.stt_engine); heavy engines
        # fall back to local faster-whisper on error so a job is never lost.
        transcribe_started = time.perf_counter()
        transcript, lang, segments = transcribe_with_engine(
            settings.stt_engine,
            transcription_input,
            model_name=whisper_model,
            language=None,
            progress_callback=handle_transcribe_progress,
            job_id=job_id,
        )
        transcribe_seconds = time.perf_counter() - transcribe_started
        ensure_not_cancelled(job_id)

        transcript_path = save_transcript_text(job_id, transcript)
        quality = assess_transcript_quality(transcript, segments)
        audio_seconds = max((float(seg.get("end") or 0) for seg in segments), default=0.0)
        benchmark = build_stt_benchmark(
            engine=settings.stt_engine,
            model=whisper_model,
            device=settings.whisper_device,
            transcribe_seconds=transcribe_seconds,
            audio_seconds=audio_seconds,
        )
        update_status_meta(
            job_id,
            transcript_quality_warnings=quality["warnings"],
            transcript_quality_stats=quality["stats"],
            transcript_confidence=aggregate_confidence(segments),
            transcript_benchmark=benchmark,
            transcript_engine=settings.stt_engine,
            transcript_model=whisper_model,
            transcript_device=settings.whisper_device,
            detected_language=lang,
            transcript_created_at=utc_now_iso(),
        )
        # Real diarized speaker count (only when an engine like WhisperX provides
        # speaker labels); never overwrites with 0 so signal-based counts stand.
        diarized_speakers = len({seg.get("speaker") for seg in segments if seg.get("speaker")})
        if diarized_speakers:
            update_status_meta(job_id, speaker_count=diarized_speakers)
        glossary_terms = glossary_terms_for_transcript_correction(db_session)
        srt_path = save_transcript_srt(job_id, segments, glossary_terms)
        corrected_path = save_corrected_transcript_text(
            job_id, transcript, glossary_terms
        )
            
        record.transcript_path = transcript_path
        if transcript_only:
            record.status = "completed"
            record.completed_at = datetime.now(UTC)
            db_session.commit()
            update_status_meta(
                job_id,
                current_step="completed",
                progress_percent=100,
                status="completed",
                status_message="Transcript is ready. Memo generation was skipped by Transcript only mode.",
                transcript_word_count=len(transcript.split()),
                segment_count=len(segments),
                transcript_srt_available=bool(srt_path),
                corrected_transcript_available=bool(corrected_path),
                transcript_only=True,
                ai_processing_completed_at=utc_now_iso(),
            )
            cleanup_source_media_after_processing(db_session, record, job_id, transcription_input)
            return
        record.status = "summarizing"
        db_session.commit()
        update_status_meta(
            job_id,
            current_step="summarizing",
            progress_percent=55,
            status_message="Transcript ready. Building meeting memo.",
            transcript_word_count=len(transcript.split()),
            segment_count=len(segments),
            transcript_srt_available=bool(srt_path),
            corrected_transcript_available=bool(corrected_path),
        )

        # 3. Summarize
        summarizer = SummarizerService(model=model_name)
        def handle_summarize_progress(step: str, percent: int, details: dict[str, Any]) -> None:
            ensure_not_cancelled(job_id)
            update_status_meta(job_id, **build_summarize_progress_meta(step, percent, details, "media"))

        memo = summarizer.summarize(
            transcript,
            language=language,
            template=template,
            segments=segments,
            progress_callback=handle_summarize_progress,
            checkpoint=read_summary_checkpoint(job_id),
            checkpoint_callback=lambda payload: persist_summary_checkpoint(job_id, payload),
        )
        ensure_not_cancelled(job_id)
        memo_path = save_generated_memo(job_id, memo)
        record.memo_path = memo_path
        db_session.commit()
        update_status_meta(
            job_id,
            current_step="analyzing",
            progress_percent=94,
            status_message="Extracting speaker, decision, and action highlights.",
        )
        analysis = summarizer.extract_structured_signals(transcript, memo, language=language, segments=segments)
        save_analysis_meta(job_id, analysis)
        todo_drafts = create_meeting_action_drafts(db_session, record, analysis)
        ensure_not_cancelled(job_id)
        
        complete_meeting_processing(db_session, record, job_id, todo_drafts)
        cleanup_source_media_after_processing(db_session, record, job_id, transcription_input)

        # 5. Ecosystem Link: Extract Glossary
        extract_and_save_glossary(db_session, record.title, memo)
        
    except MeetingJobCancelled as e:
        logger.info(f"🛑 Meeting job cancelled {job_id}: {e}")
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            record.status = "failed"
            db_session.commit()
        update_status_meta(
            job_id,
            current_step="cancelled",
            progress_percent=100,
            status_message=str(e),
        )
    except Exception as e:
        logger.error(f"❌ Error processing job {job_id}: {e}", exc_info=True)
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            record.status = "failed"
            db_session.commit()
        update_status_meta(
            job_id,
            current_step="failed",
            progress_percent=100,
            status_message=str(e),
        )
    finally:
        db_session.close()


def _extract_glossary_lines(memo_content: str) -> list[str]:
    section_marker = next((marker for marker in GLOSSARY_SECTION_MARKERS if marker in memo_content), "")
    if not section_marker:
        return []

    parts = memo_content.split(section_marker, 1)
    if len(parts) <= 1:
        return []

    glossary_lines = []
    for line in parts[1].splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("##"):
            break
        glossary_lines.append(line)
    return glossary_lines


def _parse_glossary_line(line: str) -> Optional[tuple[str, str, str]]:
    cleaned = line.strip("-* ").strip()
    if ":" not in cleaned and "：" not in cleaned:
        return None

    separator = ":" if ":" in cleaned else "："
    term_part, meaning = cleaned.split(separator, 1)
    term_part = term_part.replace("**", "").replace("*", "").strip()
    meaning = meaning.strip()
    if not term_part or not meaning:
        return None

    english = term_part
    japanese = ""
    if "/" in term_part:
        english, japanese = [part.strip() for part in term_part.split("/", 1)]
    elif "(" in term_part and ")" in term_part:
        match = re.search(r"^(.*?)\((.*?)\)$", term_part)
        if match:
            english = match.group(1).strip()
            japanese = match.group(2).strip()

    if not english and not japanese:
        return None
    return english, japanese, meaning


def is_valid_glossary_term(english: str, japanese: str, meaning: str) -> bool:
    """Reject low-quality auto-extracted glossary rows before they reach the
    canonical (extension-shared) GlossaryTerm store.

    Keep auto-write, but drop junk: placeholder-only terms, missing/overlong
    meanings, and term parts that are really sentences rather than terms.
    """
    english = (english or "").strip()
    japanese = (japanese or "").strip()
    meaning = (meaning or "").strip()
    has_real_term = (bool(english) and english != "N/A") or (bool(japanese) and japanese != "N/A")
    if not has_real_term:
        return False
    if not (2 <= len(meaning) <= 200):
        return False
    if len(english) > 60 or len(japanese) > 60:
        return False
    if len(english.split()) > 6:
        return False
    return True


def _find_existing_glossary_term(db: Session, english: str, japanese: str) -> Optional[GlossaryTerm]:
    if english and japanese:
        return db.query(GlossaryTerm).filter(
            (GlossaryTerm.english.ilike(f"%{english}%"))
            | (GlossaryTerm.japanese.ilike(f"%{japanese}%"))
        ).first()
    if english:
        return db.query(GlossaryTerm).filter(GlossaryTerm.english.ilike(f"%{english}%")).first()
    if japanese:
        return db.query(GlossaryTerm).filter(GlossaryTerm.japanese.ilike(f"%{japanese}%")).first()
    return None


def _upsert_glossary_term(db: Session, title: str, english: str, japanese: str, meaning: str) -> None:
    existing_term = _find_existing_glossary_term(db, english, japanese)
    context_note = f"[{title}]: {meaning}"
    if existing_term:
        if not existing_term.example:
            existing_term.example = context_note
        elif context_note not in existing_term.example:
            existing_term.example += f"\n{context_note}"
        return

    db.add(
        GlossaryTerm(
            id=f"auto-{uuid.uuid4().hex[:8]}",
            english=english or "N/A",
            japanese=japanese or "N/A",
            vietnamese=meaning,
            category="System Design",
            roles=["BrSE"],
            note=f"Auto-extracted from meeting: {title}",
        )
    )


def extract_and_save_glossary(db: Session, title: str, memo_content: str):
    """
    Extracts the meeting Glossary section into canonical GlossaryTerm records.
    """
    glossary_lines = _extract_glossary_lines(memo_content)
    if not glossary_lines:
        return

    for line in glossary_lines:
        parsed = _parse_glossary_line(line)
        if not parsed:
            continue
        english, japanese, meaning = parsed
        if not is_valid_glossary_term(english, japanese, meaning):
            continue
        _upsert_glossary_term(db, title, english, japanese, meaning)

    db.commit()
    logger.info(f"🔗 Auto-extracted and synced glossary from {title}")


def normalize_topic_keyword(value: str) -> str:
    cleaned = " ".join(value.strip().lower().replace("_", " ").split())
    if len(cleaned) < 3:
        return ""
    stop_words = {"meeting", "memo", "note", "project", "review", "daily", "weekly", "brse", "cuộc họp", "họp"}
    if cleaned in stop_words:
        return ""
    return cleaned[:48]


def infer_meeting_topics(record: MeetingRecord) -> list[str]:
    from app.services.meeting_artifacts import read_analysis_meta
    analysis = read_analysis_meta(record.id)
    candidates: list[str] = []
    keywords = analysis.get("keywords") if isinstance(analysis, dict) else None
    if isinstance(keywords, list):
        candidates.extend(str(item) for item in keywords[:8])
    title_parts = (record.title or "").replace("-", " ").replace("_", " ").split()
    candidates.extend(part for part in title_parts if len(part) >= 4)
    topics = []
    for candidate in candidates:
        normalized = normalize_topic_keyword(candidate)
        if normalized and normalized not in topics:
            topics.append(normalized)
    return topics[:6] or ["uncategorized"]


def topic_tokens(record: MeetingRecord, topics: list[str]) -> set[str]:
    text = " ".join([record.title or "", *topics]).lower()
    tokens = {
        token
        for token in re.split(r"[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+", text)
        if len(token) >= 3 and normalize_topic_keyword(token)
    }
    for topic in topics:
        normalized = normalize_topic_keyword(topic)
        if normalized:
            tokens.add(normalized)
    return tokens


def topic_similarity(first: set[str], second: set[str]) -> float:
    if not first or not second:
        return 0.0
    intersection = len(first & second)
    if intersection == 0:
        return 0.0
    return intersection / max(1, min(len(first), len(second)))


def process_transcript_task(job_id: str, transcript: str, language: str, template: str, model_name: Optional[str]):
    if read_meta_file(status_meta_path(job_id)).get("cancel_requested"):
        return
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=18,
        status_message="Waiting for the local Meeting Note processing lane.",
    )
    with MEETING_PROCESSING_SEMAPHORE:
        if read_meta_file(status_meta_path(job_id)).get("cancel_requested"):
            return
        return _process_transcript_task_locked(job_id, transcript, language, template, model_name)


def _process_transcript_task_locked(job_id: str, transcript: str, language: str, template: str, model_name: Optional[str]):
    db_session = SessionLocal()
    try:
        ensure_not_cancelled(job_id)
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if not record:
            return

        record.status = "summarizing"
        db_session.commit()
        ai_processing_started_at = utc_now_iso()
        update_status_meta(
            job_id,
            current_step="summarizing",
            progress_percent=45,
            status_message="Summarizing pasted transcript.",
            ai_processing_started_at=ai_processing_started_at,
            ai_processing_mode="memo_from_transcript",
            transcript_word_count=len(transcript.split()),
            segment_count=0,
        )

        transcript_path = save_transcript_text(job_id, transcript)
        corrected_path = save_corrected_transcript_text(
            job_id, transcript, glossary_terms_for_transcript_correction(db_session)
        )
        update_status_meta(job_id, corrected_transcript_available=bool(corrected_path))

        summarizer = SummarizerService(model=model_name)
        def handle_summarize_progress(step: str, percent: int, details: dict[str, Any]) -> None:
            ensure_not_cancelled(job_id)
            update_status_meta(job_id, **build_summarize_progress_meta(step, percent, details, "pasted"))

        memo = summarizer.summarize(
            transcript,
            language=language,
            template=template,
            progress_callback=handle_summarize_progress,
            checkpoint=read_summary_checkpoint(job_id),
            checkpoint_callback=lambda payload: persist_summary_checkpoint(job_id, payload),
        )
        ensure_not_cancelled(job_id)
        update_status_meta(
            job_id,
            current_step="analyzing",
            progress_percent=94,
            status_message="Extracting speaker, decision, and action highlights.",
        )
        analysis = summarizer.extract_structured_signals(transcript, memo, language=language)
        save_analysis_meta(job_id, analysis)
        todo_drafts = create_meeting_action_drafts(db_session, record, analysis)
        ensure_not_cancelled(job_id)

        memo_path = save_generated_memo(job_id, memo)

        record.transcript_path = transcript_path
        record.memo_path = memo_path
        complete_meeting_processing(db_session, record, job_id, todo_drafts)

        extract_and_save_glossary(db_session, record.title, memo)
    except MeetingJobCancelled as e:
        logger.info(f"🛑 Meeting transcript job cancelled {job_id}: {e}")
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            record.status = "failed"
            db_session.commit()
        update_status_meta(
            job_id,
            current_step="cancelled",
            progress_percent=100,
            status_message=str(e),
        )
    except Exception as e:
        logger.error(f"❌ Error processing transcript {job_id}: {e}", exc_info=True)
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            record.status = "failed"
            db_session.commit()
        update_status_meta(
            job_id,
            current_step="failed",
            progress_percent=100,
            status_message=str(e),
        )
    finally:
        db_session.close()


def download_and_process_task(job_id: str, url: str, language: str, template: str, model_name: Optional[str], transcript_only: bool = False):
    db_session = SessionLocal()
    try:
        processor = URLProcessor()
        file_path, title = processor.download_audio(
            url,
            progress_callback=lambda progress_text: update_status_meta(
                job_id,
                current_step="downloading",
                progress_percent=max(8, min(24, int(float(str(progress_text).replace("%", "").strip() or "0") / 100 * 16) + 8)),
                status_message=f"Downloading audio from URL ({progress_text.strip()}).",
            ),
        )
        
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            record.title = title
            record.file_path = file_path
            record.filename = os.path.basename(file_path)
            db_session.commit()
        update_status_meta(
            job_id,
            current_step="transcribing",
            progress_percent=26,
            status_message=("Download completed. Extracting transcript only." if transcript_only else "Download completed. Starting transcription."),
            display_title=title,
            original_filename=os.path.basename(file_path),
        )
        
        process_meeting_task(job_id, file_path, language, template, model_name, transcript_only)
    except Exception as e:
        logger.error(f"❌ URL Processing Error {job_id}: {e}", exc_info=True)
        record = db_session.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
        if record:
            record.status = "failed"
            db_session.commit()
        update_status_meta(
            job_id,
            current_step="failed",
            progress_percent=100,
            status_message=str(e),
        )
    finally:
        db_session.close()
