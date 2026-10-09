from urllib.parse import urlparse
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List

class MeetingRecordBase(BaseModel):
    title: str
    language: str = "vi"
    template: str = "meeting"
    model: Optional[str] = None

class MeetingRecordCreate(MeetingRecordBase):
    pass

class MeetingRecordUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

class MeetingRecordRead(MeetingRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    filename: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    progress_percent: Optional[int] = None
    current_step: Optional[str] = None
    status_message: Optional[str] = None
    transcript_word_count: Optional[int] = None
    segment_count: Optional[int] = None
    speaker_count: Optional[int] = None
    summary_chunks_done: Optional[int] = None
    summary_chunks_total: Optional[int] = None
    reduce_batches_done: Optional[int] = None
    reduce_batches_total: Optional[int] = None
    ai_processing_started_at: Optional[str] = None
    ai_processing_completed_at: Optional[str] = None
    ai_processing_seconds: Optional[int] = None
    ai_processing_mode: Optional[str] = None
    error: Optional[str] = None
    task_status: Optional[str] = None
    retry_count: Optional[int] = None
    failure_reason: Optional[str] = None
    recovery_metadata: Optional[dict] = None
    task_started_at: Optional[str] = None
    task_completed_at: Optional[str] = None
    task_failed_at: Optional[str] = None
    checkpoint_path: Optional[str] = None
    chunk_index: Optional[int] = None
    source_available: Optional[bool] = None
    transcript_available: Optional[bool] = None
    corrected_transcript_available: Optional[bool] = None
    transcript_srt_available: Optional[bool] = None
    translated_transcript_available: Optional[bool] = None
    translated_srt_available: Optional[bool] = None
    translation_available_languages: Optional[List[str]] = None
    memo_available: Optional[bool] = None
    meeting_action_pending_count: Optional[int] = None
    meeting_action_synced_count: Optional[int] = None
    meeting_action_rejected_count: Optional[int] = None
    meeting_actions_synced: Optional[bool] = None
    transcript_only: Optional[bool] = None
    upload_received_bytes: Optional[int] = None
    upload_file_size: Optional[int] = None
    upload_remaining_bytes: Optional[int] = None
    upload_chunk_size: Optional[int] = None
    upload_chunks_done: Optional[int] = None
    upload_chunks_total: Optional[int] = None

class ChatRequest(BaseModel):
    message: str
    job_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

class LiveAssistRequest(BaseModel):
    context: str
    question: Optional[str] = None
    language: str = "vi"
    mode: str = "assist"

class LiveAssistResponse(BaseModel):
    memo: List[str] = []
    suggestions: List[str] = []
    explanations: List[str] = []
    questions: List[str] = []
    reply_drafts: List[str] = []
    raw: Optional[str] = None

class ProcessURLRequest(BaseModel):
    url: str
    language: str = "vi"
    template: str = "meeting"
    model: Optional[str] = None
    transcript_only: bool = False
    keep_source_media: bool = False
    whisper_model: Optional[str] = None

    @field_validator("url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if not cleaned:
            raise ValueError("URL cannot be empty.")
        parsed = urlparse(cleaned)
        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError("Only http and https URLs are allowed.")
        if not parsed.netloc:
            raise ValueError("Invalid URL format: missing host domain.")
        return cleaned

class MemoUpdateRequest(BaseModel):
    content: str

class TranscriptProcessRequest(BaseModel):
    title: str = "Pasted transcript"
    transcript: str
    language: str = "vi"
    template: str = "meeting"
    model: Optional[str] = None

class CombineMemoRequest(BaseModel):
    meeting_ids: List[str]
    title: str = "Combined learning memo"
    language: str = "vi"
    template: str = "meeting"
    model: Optional[str] = None


class ResumableUploadInitRequest(BaseModel):
    filename: str
    file_size: int
    language: str = "vi"
    template: str = "meeting"
    model: Optional[str] = None
    transcript_only: bool = False
    keep_source_media: bool = False
    whisper_model: Optional[str] = None

class ResumableUploadStatus(BaseModel):
    job_id: str
    received_bytes: int
    file_size: int
    complete: bool
    status: str

class MeetingTopicItem(BaseModel):
    id: str
    title: str
    created_at: str

class MeetingTopicCluster(BaseModel):
    topic: str
    count: int
    keywords: List[str]
    meetings: List[MeetingTopicItem]

class TranscriptSearchMatch(BaseModel):
    line_number: int
    snippet: str

class TranscriptSearchResult(BaseModel):
    id: str
    title: str
    created_at: str
    matches: List[TranscriptSearchMatch]

class TranscriptTranslateRequest(BaseModel):
    target_language: str = "vi"
    model: Optional[str] = None


class TranscriptTranslateResponse(BaseModel):
    id: str
    target_language: str
    transcript_path: str
    srt_path: Optional[str] = None
    transcript_char_count: int
    srt_available: bool
    model: Optional[str] = None


class TranscriptRecleanRequest(BaseModel):
    meeting_ids: Optional[List[str]] = None


class TranscriptRecleanResponse(BaseModel):
    updated_count: int
    skipped_count: int
    meeting_ids: List[str]

