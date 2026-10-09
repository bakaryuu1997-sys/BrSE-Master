import os
import logging
from typing import List, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.glossary import GlossaryTerm
from app.models.meeting import MeetingRecord
from app.schemas.meeting import (
    MeetingRecordRead, 
    MeetingTopicCluster, 
    MeetingTopicItem, 
    TranscriptSearchResult,
    TranscriptSearchMatch,
    ChatResponse,
    ChatRequest,
    MemoUpdateRequest,
    TranscriptTranslateRequest,
    TranscriptTranslateResponse,
    TranscriptRecleanRequest,
    TranscriptRecleanResponse,
)
from app.services.meeting_status import (
    serialize_meeting_record, 
    request_job_cancel
)
from app.services.meeting_artifacts import status_meta_path, update_status_meta, analysis_meta_path
from app.services.meeting_recovery import (
    recover_meeting_records_from_storage, 
    repair_meeting_records_from_storage_state
)
from app.services.meeting_processor import (
    infer_meeting_topics, 
    topic_tokens, 
    topic_similarity
)
from app.services.summarizer import SummarizerService
from app.services.meeting_content import read_meeting_memo, save_meeting_memo, prepare_meeting_export
from app.core.config import settings
from app.services.meeting_transcription import (
    corrected_transcript_path,
    save_corrected_transcript_text,
    transcript_srt_path,
)
from app.services.meeting_translation import (
    TRANSLATION_LANGUAGES,
    normalize_translation_language,
    reclean_srt_terms,
    save_translated_artifacts,
    translated_srt_path,
    translated_transcript_path,
)

router = APIRouter()
logger = logging.getLogger(__name__)

ACTIVE_MEETING_STATUSES = {"pending", "transcribing", "summarizing", "analyzing", "recording", "processing"}


def safe_download_stem(value: str | None, fallback: str) -> str:
    raw = (value or fallback or "meeting-transcript").strip()
    stem = os.path.splitext(raw)[0] or fallback or "meeting-transcript"
    safe = "".join(ch if (ch.isalnum() or ch in "._ -") else "_" for ch in stem).strip(" ._-")
    return safe[:120] or "meeting-transcript"


def resolve_transcript_path(record: MeetingRecord) -> str:
    return record.transcript_path or os.path.join(settings.transcript_folder, f"{record.id}.txt")


def glossary_terms_for_download_correction(db: Session) -> list[dict[str, str]]:
    terms = db.query(GlossaryTerm).limit(500).all()
    return [
        {
            "english": term.english or "",
            "japanese": term.japanese or "",
            "vietnamese": term.vietnamese or "",
        }
        for term in terms
    ]


@router.get("/history", response_model=List[MeetingRecordRead])
def get_history(db: Session = Depends(get_db)):
    recover_meeting_records_from_storage(db)
    repair_meeting_records_from_storage_state(db)
    records = db.query(MeetingRecord).order_by(MeetingRecord.created_at.desc()).all()
    return [serialize_meeting_record(record, db) for record in records]


@router.post("/recover-storage", response_model=List[MeetingRecordRead])
def recover_storage_history(db: Session = Depends(get_db)):
    recover_meeting_records_from_storage(db)
    repair_meeting_records_from_storage_state(db)
    records = db.query(MeetingRecord).order_by(MeetingRecord.created_at.desc()).all()
    return [serialize_meeting_record(record, db) for record in records]


@router.get("/topics", response_model=List[MeetingTopicCluster])
def get_topic_clusters(db: Session = Depends(get_db)):
    records = (
        db.query(MeetingRecord)
        .filter(MeetingRecord.status == "completed")
        .order_by(MeetingRecord.created_at.desc())
        .all()
    )
    semantic_groups: List[dict[str, Any]] = []
    record_topics: dict[str, List[str]] = {}
    for record in records:
        topics = infer_meeting_topics(record)
        record_topics[record.id] = topics
        tokens = topic_tokens(record, topics)
        best_group: dict[str, Any] | None = None
        best_score = 0.0
        for group in semantic_groups:
            score = topic_similarity(tokens, group["tokens"])
            if score > best_score:
                best_score = score
                best_group = group
        if best_group and best_score >= 0.34:
            best_group["records"].append(record)
            best_group["tokens"].update(tokens)
        else:
            semantic_groups.append({"topic": topics[0], "tokens": set(tokens), "records": [record]})

    clusters: List[MeetingTopicCluster] = []
    for group in semantic_groups:
        topic_records = group["records"]
        keyword_counts: dict[str, int] = {}
        for record in topic_records:
            for keyword in record_topics.get(record.id, []):
                keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
        keywords = [
            keyword
            for keyword, _ in sorted(keyword_counts.items(), key=lambda item: (-item[1], item[0]))
            if keyword != "uncategorized"
        ][:8]
        topic = keywords[0] if keywords else group["topic"]
        clusters.append(
            MeetingTopicCluster(
                topic=topic,
                count=len(topic_records),
                keywords=keywords,
                meetings=[
                    MeetingTopicItem(
                        id=record.id,
                        title=record.title,
                        created_at=record.created_at.isoformat() if record.created_at else "",
                    )
                    for record in topic_records[:8]
                ],
            )
        )

    return sorted(clusters, key=lambda item: (-item.count, item.topic))


@router.get("/transcripts/search", response_model=List[TranscriptSearchResult])
def search_meeting_transcripts(
    query: str = Query(..., min_length=2, max_length=120),
    limit: int = Query(8, ge=1, le=20),
    matches_per_meeting: int = Query(3, ge=1, le=8),
    db: Session = Depends(get_db),
):
    normalized_query = query.strip().lower()
    records = (
        db.query(MeetingRecord)
        .filter(MeetingRecord.transcript_path.isnot(None))
        .order_by(MeetingRecord.created_at.desc())
        .limit(200)
        .all()
    )
    results: List[TranscriptSearchResult] = []

    for record in records:
        transcript_path = record.transcript_path or os.path.join(settings.transcript_folder, f"{record.id}.txt")
        if not transcript_path or not os.path.exists(transcript_path):
            continue

        try:
            with open(transcript_path, "r", encoding="utf-8") as f:
                lines = f.read().splitlines()
        except OSError:
            continue

        matches: List[TranscriptSearchMatch] = []
        for index, line in enumerate(lines, start=1):
            compact_line = " ".join(line.split())
            if normalized_query not in compact_line.lower():
                continue
            lowered = compact_line.lower()
            match_index = lowered.find(normalized_query)
            snippet = compact_line
            if match_index > 80:
                snippet = f"...{compact_line[max(0, match_index - 80):]}"
            if len(snippet) > 260:
                snippet = f"{snippet[:260]}..."
            matches.append(TranscriptSearchMatch(line_number=index, snippet=snippet))
            if len(matches) >= matches_per_meeting:
                break

        if matches:
            results.append(
                TranscriptSearchResult(
                    id=record.id,
                    title=record.title,
                    created_at=record.created_at.isoformat() if record.created_at else "",
                    matches=matches,
                )
            )
        if len(results) >= limit:
            break

    return results


@router.get("/{job_id}/transcript")
def get_meeting_transcript_text(
    job_id: str,
    db: Session = Depends(get_db),
    max_chars: int = Query(900_000, ge=1_000, le=2_000_000),
):
    """Return raw transcript text for reuse (e.g. Meeting Minutes AI) without copy-paste."""
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")
    transcript_path = resolve_transcript_path(record)
    if not transcript_path or not os.path.exists(transcript_path):
        raise HTTPException(status_code=404, detail="Transcript file not available for this meeting.")
    try:
        with open(transcript_path, "r", encoding="utf-8") as handle:
            text = handle.read()
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not read transcript file.") from exc
    truncated = len(text) > max_chars
    payload = text if not truncated else text[:max_chars]
    return {
        "id": job_id,
        "title": record.title,
        "transcript": payload,
        "truncated": truncated,
        "char_count": len(payload),
    }


@router.get("/{job_id}/transcript/download")
def download_meeting_transcript(job_id: str, db: Session = Depends(get_db)):
    """Download the persisted transcript as a .txt artifact."""
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript_path = resolve_transcript_path(record)
    if not transcript_path or not os.path.exists(transcript_path):
        raise HTTPException(status_code=404, detail="Transcript file not available for this meeting.")

    display_name = record.filename or record.title or job_id
    filename = f"{safe_download_stem(display_name, job_id)}_transcript.txt"
    return FileResponse(
        transcript_path,
        media_type="text/plain; charset=utf-8",
        filename=filename,
    )


@router.get("/{job_id}/transcript/corrected/download")
def download_meeting_corrected_transcript(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript_path = resolve_transcript_path(record)
    if not transcript_path or not os.path.exists(transcript_path):
        raise HTTPException(status_code=404, detail="Transcript file not available for this meeting.")

    corrected_path = corrected_transcript_path(job_id)
    try:
        needs_refresh = not os.path.exists(corrected_path) or os.path.getmtime(corrected_path) < os.path.getmtime(transcript_path)
    except OSError:
        needs_refresh = True
    if needs_refresh:
        try:
            with open(transcript_path, "r", encoding="utf-8") as handle:
                transcript = handle.read()
            corrected_path = save_corrected_transcript_text(
                job_id,
                transcript,
                glossary_terms_for_download_correction(db),
            )
        except OSError as exc:
            raise HTTPException(status_code=500, detail="Could not prepare corrected transcript file.") from exc

    display_name = record.filename or record.title or job_id
    filename = f"{safe_download_stem(display_name, job_id)}_transcript_corrected.txt"
    return FileResponse(
        corrected_path,
        media_type="text/plain; charset=utf-8",
        filename=filename,
    )


@router.get("/{job_id}/transcript/srt")
def download_meeting_transcript_srt(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    path = transcript_srt_path(job_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="SRT transcript is not available for this meeting.")

    display_name = record.filename or record.title or job_id
    filename = f"{safe_download_stem(display_name, job_id)}_transcript.srt"
    return FileResponse(
        path,
        media_type="application/x-subrip; charset=utf-8",
        filename=filename,
    )


@router.post("/{job_id}/transcript/translate", response_model=TranscriptTranslateResponse)
async def translate_meeting_transcript(
    job_id: str,
    request: TranscriptTranslateRequest,
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    raw_transcript_path = resolve_transcript_path(record)
    if not raw_transcript_path or not os.path.exists(raw_transcript_path):
        raise HTTPException(status_code=404, detail="Transcript file not available for this meeting.")

    target_language = normalize_translation_language(request.target_language)
    source_path = corrected_transcript_path(job_id)
    if not os.path.exists(source_path):
        source_path = raw_transcript_path

    try:
        with open(source_path, "r", encoding="utf-8") as handle:
            transcript = handle.read()
        srt_text = None
        source_srt_path = transcript_srt_path(job_id)
        if os.path.exists(source_srt_path):
            with open(source_srt_path, "r", encoding="utf-8") as handle:
                srt_text = handle.read()
        translated_path, srt_path, char_count = await save_translated_artifacts(
            job_id,
            transcript,
            target_language,
            glossary_terms_for_download_correction(db),
            srt_text=srt_text,
            model=request.model,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not prepare translated transcript artifacts.") from exc

    update_status_meta(
        job_id,
        translated_transcript_available=True,
        translated_srt_available=bool(srt_path),
        translation_target_language=target_language,
    )
    return TranscriptTranslateResponse(
        id=job_id,
        target_language=target_language,
        transcript_path=translated_path,
        srt_path=srt_path,
        transcript_char_count=char_count,
        srt_available=bool(srt_path),
        model=request.model,
    )


@router.get("/{job_id}/transcript/translated/download")
def download_meeting_translated_transcript(
    job_id: str,
    target_language: str = Query("vi"),
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    lang = normalize_translation_language(target_language)
    path = translated_transcript_path(job_id, lang)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Translated transcript is not available for this meeting/language.")

    display_name = record.filename or record.title or job_id
    filename = f"{safe_download_stem(display_name, job_id)}_transcript_{lang}.txt"
    return FileResponse(path, media_type="text/plain; charset=utf-8", filename=filename)


@router.get("/{job_id}/transcript/translated/srt")
def download_meeting_translated_srt(
    job_id: str,
    target_language: str = Query("vi"),
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    lang = normalize_translation_language(target_language)
    path = translated_srt_path(job_id, lang)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Translated SRT is not available for this meeting/language.")

    display_name = record.filename or record.title or job_id
    filename = f"{safe_download_stem(display_name, job_id)}_transcript_{lang}.srt"
    return FileResponse(path, media_type="application/x-subrip; charset=utf-8", filename=filename)


@router.post("/transcripts/reclean", response_model=TranscriptRecleanResponse)
def reclean_meeting_transcripts(
    request: TranscriptRecleanRequest,
    db: Session = Depends(get_db),
):
    query = db.query(MeetingRecord).filter(MeetingRecord.transcript_path.isnot(None))
    if request.meeting_ids:
        query = query.filter(MeetingRecord.id.in_(request.meeting_ids))
    records = query.all()
    glossary_terms = glossary_terms_for_download_correction(db)
    updated_ids: list[str] = []
    skipped_count = 0

    for record in records:
        transcript_path = resolve_transcript_path(record)
        if not transcript_path or not os.path.exists(transcript_path):
            skipped_count += 1
            continue
        try:
            with open(transcript_path, "r", encoding="utf-8") as handle:
                transcript = handle.read()
            save_corrected_transcript_text(record.id, transcript, glossary_terms)
            srt_path = transcript_srt_path(record.id)
            if os.path.exists(srt_path):
                with open(srt_path, "r", encoding="utf-8") as handle:
                    srt_text = handle.read()
                with open(srt_path, "w", encoding="utf-8") as handle:
                    handle.write(reclean_srt_terms(srt_text, glossary_terms))
            update_status_meta(record.id, corrected_transcript_available=True)
            updated_ids.append(record.id)
        except OSError:
            skipped_count += 1

    return TranscriptRecleanResponse(
        updated_count=len(updated_ids),
        skipped_count=skipped_count,
        meeting_ids=updated_ids,
    )

@router.get("/{job_id}", response_model=MeetingRecordRead)
def get_job(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return serialize_meeting_record(record, db)

@router.patch("/{job_id}", response_model=MeetingRecordRead)
def update_meeting_title(
    job_id: str,
    title: str,
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")
    cleaned_title = title.strip()
    if not cleaned_title:
        raise HTTPException(status_code=400, detail="Title is required")
    record.title = cleaned_title
    record.filename = record.filename or cleaned_title
    db.commit()
    db.refresh(record)
    update_status_meta(
        job_id,
        display_title=cleaned_title,
        original_filename=record.filename or cleaned_title,
    )
    return serialize_meeting_record(record, db)

@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    was_active = record.status in ACTIVE_MEETING_STATUSES
    if was_active:
        request_job_cancel(job_id, "User cancelled and deleted this Meeting Note job.")
        record.status = "failed"
        db.commit()
    
    # Cleanup files
    paths_to_delete = [
        record.file_path,
        record.transcript_path,
        record.memo_path,
        corrected_transcript_path(job_id),
        transcript_srt_path(job_id),
        *[translated_transcript_path(job_id, lang) for lang in TRANSLATION_LANGUAGES],
        *[translated_srt_path(job_id, lang) for lang in TRANSLATION_LANGUAGES],
    ]
    
    # Add common derived patterns
    if record.file_path:
        base_path = os.path.splitext(record.file_path)[0]
        paths_to_delete.append(f"{base_path}_transcribe.wav")
        paths_to_delete.append(f"{base_path}_audio.mp3")

    for path in paths_to_delete:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                logger.error(f" Failed to delete file {path}: {e}")
    derived_paths = [
        analysis_meta_path(job_id),
        os.path.join(settings.memo_folder, f"{job_id}.docx"),
        os.path.join(settings.memo_folder, f"{job_id}.pdf"),
        os.path.join(settings.memo_folder, f"{job_id}.html"),
    ]
    if not was_active:
        derived_paths.append(status_meta_path(job_id))
    for path in derived_paths:
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
                
    db.delete(record)
    db.commit()
    return {"message": "Meeting deleted successfully", "cancelled": was_active}

@router.post("/chat", response_model=ChatResponse)
def chat_with_meeting(request: ChatRequest, db: Session = Depends(get_db)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    context = None
    if request.job_id:
        record = db.query(MeetingRecord).filter(MeetingRecord.id == request.job_id).first()
        if record and record.transcript_path and os.path.exists(record.transcript_path):
            with open(record.transcript_path, "r", encoding="utf-8") as f:
                context = f.read()
                
    try:
        summarizer = SummarizerService()
        response = summarizer.chat(request.message, context=context)
        return ChatResponse(response=response)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@router.get("/{job_id}/memo")
def get_memo(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return read_meeting_memo(record)

@router.put("/{job_id}/memo")
def save_memo(job_id: str, request: MemoUpdateRequest, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Memo not found")
    return save_meeting_memo(record, request.content)


@router.get("/{job_id}/media")
def download_meeting_media(job_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record or not record.file_path or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Meeting media not found")

    from fastapi.responses import FileResponse

    filename = record.filename or os.path.basename(record.file_path)
    return FileResponse(record.file_path, filename=filename)


@router.get("/{job_id}/export/{format}")
def export_meeting(job_id: str, format: str, db: Session = Depends(get_db)):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Memo not found")
    
    try:
        output_path, filename = prepare_meeting_export(record, format)
        from fastapi.responses import FileResponse
        return FileResponse(output_path, filename=filename)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting meeting {job_id} to {format}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
