import asyncio
import os
import time
import uuid
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.models.meeting import MeetingRecord
from app.schemas.meeting import (
    MeetingRecordRead, 
    TranscriptProcessRequest, 
    CombineMemoRequest, 
    LiveAssistRequest, 
    LiveAssistResponse,
    ProcessURLRequest
)
from app.services.summarizer import SummarizerService
from app.services.transcriber import TranscriptionService
from app.services.video_editor import VideoEditor
from app.services.meeting_artifacts import update_status_meta, read_analysis_meta, read_meta_file, status_meta_path
from app.services.meeting_job_runner import enqueue_background_meeting_job, start_meeting_job_thread
from app.services.meeting_status import serialize_meeting_record
from app.services.meeting_processor import (
    process_meeting_task, 
    process_transcript_task, 
    download_and_process_task
)
from app.services.meeting_utils import get_upload_size_state, mark_upload_incomplete
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_MEMO_UPDATE_BYTES = 1 * 1024 * 1024
LIVE_PREVIEW_INTERVAL_SECONDS = 25
LIVE_PREVIEW_TAIL_SECONDS = 60


def _transcribe_live_preview(temp_path: str, whisper_model: Optional[str]) -> str:
    """Transcribe a bounded tail of the growing recording for the live preview.

    Runs in a worker thread (never on the event loop). Tries to transcribe only
    the last ~60s via ffmpeg ``sseof`` so cost stays bounded on long meetings;
    falls back to the whole file if tail extraction fails (e.g. streaming webm
    without a seekable header).
    """
    source = temp_path
    tail_path: Optional[str] = None
    try:
        import ffmpeg

        tail_path = f"{temp_path}.tail.wav"
        (
            ffmpeg
            .input(temp_path, sseof=f"-{LIVE_PREVIEW_TAIL_SECONDS}")
            .output(tail_path, ac=1, ar=16000, loglevel="error")
            .overwrite_output()
            .run(quiet=True)
        )
        if os.path.exists(tail_path) and os.path.getsize(tail_path) > 0:
            source = tail_path
    except Exception:
        source = temp_path
    try:
        transcriber = TranscriptionService(mode="local", model_name=whisper_model)
        text, _, _ = transcriber.transcribe(source)
        return text or ""
    finally:
        if tail_path and os.path.exists(tail_path):
            try:
                os.remove(tail_path)
            except OSError:
                pass

# --- WebSocket Manager for Live Recording & Collaboration ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.memo_rooms: dict[str, List[WebSocket]] = {} # job_id -> list of websockets

    async def connect(self, websocket: WebSocket, room_id: Optional[str] = None):
        await websocket.accept()
        if room_id:
            if room_id not in self.memo_rooms:
                self.memo_rooms[room_id] = []
            self.memo_rooms[room_id].append(websocket)
        else:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: Optional[str] = None):
        if room_id:
            if room_id in self.memo_rooms and websocket in self.memo_rooms[room_id]:
                self.memo_rooms[room_id].remove(websocket)
        else:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast_to_room(self, message: dict, room_id: str, exclude: WebSocket):
        if room_id in self.memo_rooms:
            for connection in self.memo_rooms[room_id]:
                if connection != exclude:
                    await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/memo/{job_id}")
async def memo_collaboration_endpoint(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, room_id=job_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data["type"] == "edit":
                # Broadcast the new content to other users in the same room
                await manager.broadcast_to_room(
                    {"type": "update", "content": data["content"]}, 
                    room_id=job_id, 
                    exclude=websocket
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id=job_id)

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    
    # State for this connection
    job_id = str(uuid.uuid4())
    recording_kind = websocket.query_params.get("kind") or "mic"
    language = websocket.query_params.get("language") or "vi"
    template = websocket.query_params.get("template") or "meeting"
    whisper_model = websocket.query_params.get("whisper_model") or None
    requested_title = (websocket.query_params.get("title") or "").strip()
    title_prefix = {
        "mic": "Mic Voice",
        "system": "Screen Audio",
        "mixed": "Mic + Screen Audio",
        "screenVideo": "Screen Video",
    }.get(recording_kind, "Live Record")
    title = requested_title or f"{title_prefix} {datetime.now().strftime('%H:%M %d/%m')}"
    temp_path = os.path.join(settings.upload_folder, f"live_{job_id}.webm")
    chunk_count = 0
    
    # Initialize DB record
    db = SessionLocal()
    try:
        new_record = MeetingRecord(
            id=job_id,
            title=title,
            status="recording",
            filename=f"live_{job_id}.webm",
            file_path=temp_path,
            language=language,
            template=template,
        )
        db.add(new_record)
        db.commit()
        
        # Save selected whisper model in metadata
        update_status_meta(
            job_id,
            whisper_model=whisper_model,
        )
        
        await websocket.send_json({"type": "init", "job_id": job_id})

        preview_task: Optional[asyncio.Task] = None
        last_preview_at = 0.0

        async def run_live_preview() -> None:
            # Transcription runs off the event loop so the receive loop keeps
            # draining chunks — this is what prevents the WS from stalling and
            # dropping after a few minutes.
            try:
                text = await asyncio.to_thread(_transcribe_live_preview, temp_path, whisper_model)
                if text:
                    await websocket.send_json(
                        {"type": "partial", "text": text[-150:] if len(text) > 150 else text}
                    )
            except Exception as e:  # noqa: BLE001 - preview is best-effort
                logger.warning(f"⚠️ Live STT error: {e}")

        try:
            while True:
                data = await websocket.receive_bytes()

                # Append binary data to file (cheap; never blocks meaningfully).
                with open(temp_path, "ab") as f:
                    f.write(data)

                chunk_count += 1

                # Kick a background preview at most once every N seconds, and only
                # when the previous one has finished (skip-if-busy). Never awaited
                # in the receive loop, so chunk ingestion is never blocked.
                now = time.monotonic()
                preview_idle = preview_task is None or preview_task.done()
                if (
                    recording_kind != "screenVideo"
                    and preview_idle
                    and chunk_count >= 10
                    and now - last_preview_at >= LIVE_PREVIEW_INTERVAL_SECONDS
                ):
                    last_preview_at = now
                    preview_task = asyncio.create_task(run_live_preview())

        except WebSocketDisconnect:
            manager.disconnect(websocket)
            # Finalize recording
            record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
            if record:
                record.status = "processing"
                db.commit()
                start_meeting_job_thread(
                    job_id=job_id,
                    kind="meeting_live_record_process",
                    target=process_meeting_task,
                    args=(job_id, temp_path, record.language or language, record.template or template, record.model),
                )
            logger.info(f"Client {client_id} disconnected, processing live record {job_id}")
    finally:
        db.close()


@router.post("/transcript", response_model=MeetingRecordRead)
def process_transcript(
    request: TranscriptProcessRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    cleaned_transcript = request.transcript.strip()
    if not cleaned_transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")
    if len(cleaned_transcript.encode("utf-8")) > MAX_MEMO_UPDATE_BYTES:
        raise HTTPException(status_code=413, detail="Transcript is too large. Limit is 1MB.")

    job_id = str(uuid.uuid4())
    title = request.title.strip() or "Pasted transcript"
    new_record = MeetingRecord(
        id=job_id,
        title=title,
        status="processing",
        filename=f"{job_id}.txt",
        language=request.language,
        template=request.template,
        model=request.model,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=10,
        status_message="Transcript queued for memo generation.",
        display_title=title,
        original_filename=f"{job_id}.txt",
        transcript_word_count=len(cleaned_transcript.split()),
        segment_count=0,
    )

    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_transcript_process",
        target=process_transcript_task,
        args=(job_id, cleaned_transcript, request.language, request.template, request.model),
    )

    return serialize_meeting_record(new_record)

@router.post("/live-assist", response_model=LiveAssistResponse)
def live_meeting_assist(request: LiveAssistRequest):
    if not request.context.strip() and not (request.question or "").strip():
        raise HTTPException(status_code=400, detail="Live context or question is required")
    try:
        summarizer = SummarizerService()
        return summarizer.live_assist(
            request.context,
            question=request.question,
            language=request.language,
            mode=request.mode,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@router.post("/process-url", response_model=MeetingRecordRead)
async def process_url(
    request: ProcessURLRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    
    new_record = MeetingRecord(
        id=job_id,
        title="Downloading from URL...",
        status="processing",
        language=request.language,
        template=request.template,
        model=request.model
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    update_status_meta(
        job_id,
        current_step="downloading",
        progress_percent=8,
        status_message=("Downloading audio from URL for transcript only." if request.transcript_only else "Downloading audio from URL."),
        display_title=request.url,
        original_filename=request.url,
        transcript_only=request.transcript_only,
        keep_source_media=request.keep_source_media,
        source_media_retained=request.keep_source_media,
        auto_resume=True,
        whisper_model=request.whisper_model,
    )
    
    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_url_process",
        target=download_and_process_task,
        args=(job_id, request.url, request.language, request.template, request.model, request.transcript_only),
        status_message=("Downloading audio from URL for transcript only." if request.transcript_only else "Downloading audio from URL."),
        progress_percent=8,
        metadata={"source_url": request.url, "transcript_only": request.transcript_only, "keep_source_media": request.keep_source_media, "auto_resume": True},
    )
    
    return serialize_meeting_record(new_record)


@router.post("/combine-memos", response_model=MeetingRecordRead)
def combine_meeting_memos(
    request: CombineMemoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    meeting_ids = list(dict.fromkeys([item for item in request.meeting_ids if item.strip()]))[:12]
    if len(meeting_ids) < 2:
        raise HTTPException(status_code=400, detail="Select at least two completed Meeting Notes to combine.")

    records = db.query(MeetingRecord).filter(MeetingRecord.id.in_(meeting_ids)).all()
    records_by_id = {record.id: record for record in records}
    ordered_records = [records_by_id[item_id] for item_id in meeting_ids if item_id in records_by_id]
    missing = [item_id for item_id in meeting_ids if item_id not in records_by_id]
    if missing:
        raise HTTPException(status_code=404, detail=f"Meeting not found: {', '.join(missing)}")

    source_blocks: list[str] = []
    for index, record in enumerate(ordered_records, start=1):
        if record.status != "completed" or not record.memo_path or not os.path.exists(record.memo_path):
            raise HTTPException(status_code=400, detail=f"Meeting is not ready for combine: {record.title}")
        with open(record.memo_path, "r", encoding="utf-8") as f:
            memo = f.read()
        analysis = read_analysis_meta(record.id)
        detailed = analysis.get("detailed_summary") if isinstance(analysis, dict) else ""
        source_blocks.append(
            "\n".join(
                [
                    f"## Source video {index}: {record.title}",
                    f"Created at: {record.created_at.isoformat() if record.created_at else ''}",
                    "### Structured detail",
                    str(detailed or "").strip(),
                    "### Memo",
                    memo[:9000],
                ]
            )
        )

    job_id = str(uuid.uuid4())
    transcript = (
        f"Create one integrated learning/meeting note from {len(source_blocks)} source memos. "
        "Merge duplicates, keep chronology, explain concepts clearly, and produce a readable document for later study.\n\n"
        + "\n\n".join(source_blocks)
    )
    transcript_path = os.path.join(settings.transcript_folder, f"{job_id}.txt")
    os.makedirs(settings.transcript_folder, exist_ok=True)
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write(transcript)

    record = MeetingRecord(
        id=job_id,
        title=request.title or f"Combined memo {len(source_blocks)} videos",
        status="processing",
        filename="combined-memos.txt",
        file_path=transcript_path,
        transcript_path=transcript_path,
        language=request.language,
        template=request.template,
        model=request.model,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=18,
        status_message=f"Queued to combine {len(source_blocks)} completed memos into one learning note.",
        display_title=record.title,
        original_filename=record.filename,
        source_meeting_ids=meeting_ids,
    )
    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_transcript_process",
        target=process_transcript_task,
        args=(job_id, transcript, request.language, request.template, request.model),
    )
    return serialize_meeting_record(record)


@router.post("/{job_id}/resummarize", response_model=MeetingRecordRead)
def resummarize_meeting(
    job_id: str,
    background_tasks: BackgroundTasks,
    language: Optional[str] = None,
    template: Optional[str] = None,
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript_path = record.transcript_path or os.path.join(settings.transcript_folder, f"{job_id}.txt")
    if not os.path.exists(transcript_path):
        raise HTTPException(status_code=404, detail="Transcript not found")

    with open(transcript_path, "r", encoding="utf-8") as f:
        transcript = f.read()

    record.status = "processing"
    if language:
        record.language = language
    if template:
        record.template = template
    db.commit()
    db.refresh(record)
    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=18,
        status_message="Queued for re-summarization.",
    )

    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_transcript_process",
        target=process_transcript_task,
        args=(job_id, transcript, record.language, record.template, record.model),
    )

    return serialize_meeting_record(record)


@router.post("/{job_id}/retry", response_model=MeetingRecordRead)
def retry_meeting_processing(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript_path = record.transcript_path or os.path.join(settings.transcript_folder, f"{job_id}.txt")
    media_path = record.file_path
    status_meta = read_meta_file(status_meta_path(job_id))
    transcript_only = bool(status_meta.get("transcript_only"))

    if media_path and os.path.exists(media_path):
        _, _, upload_incomplete = get_upload_size_state(job_id, media_path)
        if upload_incomplete and not (transcript_path and os.path.exists(transcript_path)):
            mark_upload_incomplete(job_id, record, db, media_path)
            return serialize_meeting_record(record)

    record.status = "processing"
    record.completed_at = None
    db.commit()
    db.refresh(record)

    if transcript_path and os.path.exists(transcript_path):
        with open(transcript_path, "r", encoding="utf-8") as f:
            transcript = f.read()
        update_status_meta(
            job_id,
            current_step="queued",
            progress_percent=18,
            status_message="Queued to rebuild memo from existing transcript.",
        )
        enqueue_background_meeting_job(
            background_tasks,
            job_id=job_id,
            kind="meeting_transcript_process",
            target=process_transcript_task,
            args=(job_id, transcript, record.language, record.template, record.model),
            status_message="Queued to rebuild memo from existing transcript.",
            progress_percent=18,
        )
        return serialize_meeting_record(record)

    if media_path and os.path.exists(media_path):
        update_status_meta(
            job_id,
            current_step="queued",
            progress_percent=12,
            status_message="Queued to reprocess source media.",
        )
        enqueue_background_meeting_job(
            background_tasks,
            job_id=job_id,
            kind="meeting_media_process",
            target=process_meeting_task,
            args=(job_id, media_path, record.language, record.template, record.model, transcript_only),
            metadata={"transcript_only": transcript_only, "auto_resume": True},
        )
        return serialize_meeting_record(record)

    record.status = "failed"
    db.commit()
    db.refresh(record)
    update_status_meta(
        job_id,
        current_step="missing_source",
        progress_percent=100,
        status_message="Cannot retry because source media and transcript are missing. Please re-upload the original file.",
    )
    raise HTTPException(status_code=404, detail="Source media and transcript are missing. Please re-upload the original file.")


@router.post("/{job_id}/retranscribe", response_model=MeetingRecordRead)
def retranscribe_meeting_processing(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found")

    media_path = record.file_path
    status_meta = read_meta_file(status_meta_path(job_id))
    transcript_only = bool(status_meta.get("transcript_only"))
    if not media_path or not os.path.exists(media_path):
        update_status_meta(
            job_id,
            current_step="missing_source",
            progress_percent=100,
            status_message="Cannot re-transcribe because source media is missing. Please re-upload the original file.",
        )
        raise HTTPException(status_code=404, detail="Source media is missing. Please re-upload the original file.")

    _, _, upload_incomplete = get_upload_size_state(job_id, media_path)
    if upload_incomplete:
        mark_upload_incomplete(job_id, record, db, media_path)
        return serialize_meeting_record(record)

    record.status = "processing"
    record.completed_at = None
    db.commit()
    db.refresh(record)

    update_status_meta(
        job_id,
        current_step="queued",
        progress_percent=12,
        status_message="Queued to re-transcribe source media with automatic language detection.",
    )
    enqueue_background_meeting_job(
        background_tasks,
        job_id=job_id,
        kind="meeting_media_retranscribe",
        target=process_meeting_task,
        args=(job_id, media_path, record.language, record.template, record.model, transcript_only),
        status_message="Queued to re-transcribe source media with automatic language detection.",
        progress_percent=12,
        metadata={"transcript_only": transcript_only, "auto_resume": True},
    )
    return serialize_meeting_record(record)

@router.post("/{job_id}/trim", response_model=MeetingRecordRead)
async def trim_meeting(
    job_id: str,
    start_time: float,
    end_time: float,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    record = db.query(MeetingRecord).filter(MeetingRecord.id == job_id).first()
    if not record or not record.file_path or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Meeting or source file not found")
        
    try:
        editor = VideoEditor()
        new_file_path = editor.trim_video(record.file_path, start_time, end_time)
        
        new_job_id = str(uuid.uuid4())
        new_record = MeetingRecord(
            id=new_job_id,
            title=f"Trimmed: {record.title}",
            status="processing",
            filename=os.path.basename(new_file_path),
            file_path=new_file_path,
            language=record.language,
            template=record.template,
            model=record.model
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        update_status_meta(
            new_job_id,
            current_step="queued",
            progress_percent=12,
            status_message="Trim completed. Waiting to start transcription.",
            display_title=new_record.title,
            original_filename=new_record.filename,
        )
        
        enqueue_background_meeting_job(
            background_tasks,
            job_id=new_job_id,
            kind="meeting_media_process",
            target=process_meeting_task,
            args=(new_job_id, new_file_path, record.language, record.template, record.model),
        )
        
        return serialize_meeting_record(new_record)
    except Exception as e:
        logger.error(f"Error trimming meeting {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
