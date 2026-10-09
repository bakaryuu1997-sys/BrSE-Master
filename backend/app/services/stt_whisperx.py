"""WhisperX engine adapter (Phase 3 — GPU).

Heavy deps (``whisperx``, ``torch``, ``pyannote``) are imported **inside** the
function, so importing this module is always safe on the CPU image. The actual
transcription requires ``backend/requirements-gpu.txt`` installed on a GPU host;
until then the dispatch seam (``stt_engines.transcribe_with_engine``) catches the
RuntimeError and falls back to local faster-whisper.

⚠️ Not run in CI/sandbox (no GPU). Verify on a GPU box per
``docs/reviews/STT-PHASE3-WHISPERX-PLAN.md`` before relying on it.

Returns the standard ``(full_text, detected_language, segments)`` triple where
each segment is ``{start, end, text, speaker?, confidence?}``.
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def transcribe_whisperx(file_path: str, language: str | None = None):
    try:
        import whisperx
    except ImportError as exc:
        raise RuntimeError(
            "WhisperX is not installed. Install backend/requirements-gpu.txt on a "
            "GPU host (see docs/reviews/STT-PHASE3-WHISPERX-PLAN.md)."
        ) from exc

    device = settings.whisperx_device
    model = whisperx.load_model(
        settings.whisperx_model, device, compute_type=settings.whisperx_compute_type
    )
    audio = whisperx.load_audio(file_path)
    result = model.transcribe(audio, language=language)
    detected = result.get("language", language or "auto")

    # Word-level alignment (best-effort; transcription still usable if it fails).
    try:
        align_model, meta = whisperx.load_align_model(detected, device)
        result = whisperx.align(result["segments"], align_model, meta, audio, device)
    except Exception as exc:  # pragma: no cover - GPU-only path
        logger.warning("WhisperX alignment skipped (%s).", exc)

    # Optional real speaker diarization (needs a HF token + accepted license).
    if settings.stt_diarization and settings.huggingface_token:
        try:
            diarize = whisperx.DiarizationPipeline(
                use_auth_token=settings.huggingface_token, device=device
            )
            result = whisperx.assign_word_speakers(diarize(audio), result)
        except Exception as exc:  # pragma: no cover - GPU-only path
            logger.warning("WhisperX diarization skipped (%s).", exc)

    segments: list[dict] = []
    for item in result.get("segments", []):
        text = (item.get("text") or "").strip()
        if not text:
            continue
        score = item.get("score")
        segments.append(
            {
                "start": round(float(item.get("start") or 0), 2),
                "end": round(float(item.get("end") or 0), 2),
                "text": text,
                "speaker": item.get("speaker"),
                "confidence": round(float(score), 3) if score is not None else None,
            }
        )
    full_text = " ".join(segment["text"] for segment in segments).strip()
    return full_text, detected, segments
