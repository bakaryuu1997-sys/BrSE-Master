import logging
import os
import re

try:
    import ffmpeg
except ModuleNotFoundError:
    ffmpeg = None

from app.core.config import settings
from app.services.meeting_artifacts import update_status_meta

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {"mp4", "mkv", "webm", "mov", "avi"}


def transcription_progress_percent(segment_count: int, segment_end: float, duration: float) -> int:
    if duration:
        return 28 + min(24, int((segment_end / max(duration, 1)) * 24))
    return min(52, 28 + segment_count)


def save_transcript_text(job_id: str, transcript: str) -> str:
    os.makedirs(settings.transcript_folder, exist_ok=True)
    transcript_path = os.path.join(settings.transcript_folder, f"{job_id}.txt")
    with open(transcript_path, "w", encoding="utf-8") as handle:
        handle.write(transcript)
    return transcript_path


def extract_audio_for_transcription(file_path: str, job_id: str) -> str:
    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in VIDEO_EXTENSIONS:
        return file_path
    if ffmpeg is None:
        update_status_meta(
            job_id,
            current_step="preparing_audio",
            progress_percent=20,
            status_message="Audio extraction dependency is unavailable. Processing original media instead.",
        )
        return file_path

    os.makedirs(settings.upload_folder, exist_ok=True)
    audio_path = os.path.join(settings.upload_folder, f"{job_id}_transcribe.wav")
    if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
        try:
            if os.path.getmtime(audio_path) >= os.path.getmtime(file_path):
                update_status_meta(
                    job_id,
                    current_step="transcribing",
                    progress_percent=26,
                    status_message="Using prepared audio. Starting Whisper transcription.",
                )
                return audio_path
        except OSError:
            pass
    update_status_meta(
        job_id,
        current_step="preparing_audio",
        progress_percent=20,
        status_message="Extracting mono audio from video for faster transcription.",
    )
    try:
        (
            ffmpeg.input(file_path)
            .output(audio_path, vn=None, acodec="pcm_s16le", ac=1, ar="16000")
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
            update_status_meta(
                job_id,
                current_step="transcribing",
                progress_percent=26,
                status_message="Audio prepared. Starting Whisper transcription.",
            )
            return audio_path
    except Exception as exc:
        stderr = getattr(exc, "stderr", b"")
        detail = stderr.decode(errors="ignore") if isinstance(stderr, bytes) else str(exc)
        logger.warning(f"Audio extraction unavailable, falling back to original media: {detail}")
    return file_path


TECHNICAL_TRANSCRIPT_CORRECTIONS = (
    (r"\bđi\s+dài\s+nốt\b", "design note"),
    (r"\bđi\s+dai\s+nốt\b", "design note"),
    (r"\bdesign\s+nốt\b", "design note"),
    (r"\bmít\s+tinh\s+nốt\b", "meeting note"),
    (r"\bmeeting\s+nốt\b", "meeting note"),
    (r"\bíp\s+bọt\b", "import"),
    (r"\bíp\s+port\b", "import"),
    (r"\bim\s+bọt\b", "import"),
    (r"\bếch\s+bọt\b", "export"),
    (r"\béc\s+bọt\b", "export"),
    (r"\bex\s+bọt\b", "export"),
    (r"\bđép\b", "dev"),
    (r"\bcờ\s+la\s+ri\s+fai\b", "clarify"),
    (r"\bcla\s+ri\s+fai\b", "clarify"),
    (r"\brun\s+business\b", "rule business"),
    (r"\brun\s+biz\b", "business rule"),
    (r"\brule\s+business\b", "business rule"),
    (r"\bbích\s+lóc\b", "backlog"),
    (r"\bbách\s+lóc\b", "backlog"),
    (r"\bba\s+clog\b", "backlog"),
    (r"\bu\s+a\s+t\b", "UAT"),
    (r"\byêu\s+ây\s+ti\b", "UAT"),
    (r"\ba\s+pi\b", "API"),
    (r"\bây\s+pi\b", "API"),
    (r"\bgit\s+húp\b", "GitHub"),
    (r"\bgit\s+hub\b", "GitHub"),
    (r"\bđốc\s+cơ\b", "Docker"),
    (r"\bđốc\s+ker\b", "Docker"),
    (r"\bphờ\s+ron\s+end\b", "frontend"),
    (r"\bfront\s+end\b", "frontend"),
    (r"\bbách\s+end\b", "backend"),
    (r"\bback\s+end\b", "backend"),
)


def transcript_srt_path(job_id: str) -> str:
    return os.path.join(settings.transcript_folder, f"{job_id}.srt")


def corrected_transcript_path(job_id: str) -> str:
    return os.path.join(settings.transcript_folder, f"{job_id}.corrected.txt")


def _format_srt_timestamp(seconds: float) -> str:
    safe_seconds = max(0.0, float(seconds or 0.0))
    milliseconds = int(round(safe_seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def save_transcript_srt(job_id: str, segments: list[dict], glossary_terms: list[dict] | None = None) -> str:
    os.makedirs(settings.transcript_folder, exist_ok=True)
    path = transcript_srt_path(job_id)
    blocks = []
    for segment in segments or []:
        text = correct_transcript_terms(str(segment.get("text") or "").strip(), glossary_terms)
        if not text:
            continue
        start = float(segment.get("start") or 0.0)
        end = max(start, float(segment.get("end") or start))
        blocks.append(
            f"{len(blocks) + 1}\n{_format_srt_timestamp(start)} --> {_format_srt_timestamp(end)}\n{text}"
        )
    if not blocks:
        if os.path.exists(path):
            os.remove(path)
        return ""
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n\n".join(blocks))
        handle.write("\n")
    return path


def _term_pattern(term: str) -> str:
    escaped = re.escape(term.strip())
    if not escaped:
        return ""
    return rf"(?<!\w){escaped}(?!\w)"


def _glossary_corrections(glossary_terms: list[dict] | None) -> list[tuple[str, str]]:
    corrections: list[tuple[str, str]] = []
    seen: set[str] = set()
    for term in glossary_terms or []:
        candidates = [
            str(term.get("english") or "").strip(),
            str(term.get("japanese") or "").strip(),
            str(term.get("vietnamese") or "").strip(),
        ]
        canonical = next((value for value in candidates if value and value.upper() != "N/A"), "")
        if not canonical:
            continue
        for value in candidates:
            if not value or value.upper() == "N/A" or len(value) < 2:
                continue
            key = value.lower()
            if key in seen:
                continue
            pattern = _term_pattern(value)
            if pattern:
                corrections.append((pattern, canonical))
                seen.add(key)
    return corrections


def correct_transcript_terms(transcript: str, glossary_terms: list[dict] | None = None) -> str:
    corrected = transcript
    for pattern, replacement in (*TECHNICAL_TRANSCRIPT_CORRECTIONS, *_glossary_corrections(glossary_terms)):
        corrected = re.sub(pattern, replacement, corrected, flags=re.IGNORECASE)
    return corrected


def save_corrected_transcript_text(job_id: str, transcript: str, glossary_terms: list[dict] | None = None) -> str:
    os.makedirs(settings.transcript_folder, exist_ok=True)
    path = corrected_transcript_path(job_id)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(correct_transcript_terms(transcript, glossary_terms))
    return path
