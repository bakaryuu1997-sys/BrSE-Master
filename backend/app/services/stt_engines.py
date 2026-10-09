"""Single dispatch seam for speech-to-text engines.

The meeting pipeline calls :func:`transcribe_with_engine` instead of constructing
an engine directly, so new engines plug in here without touching the hot path.

- ``local`` / ``cloud`` -> the existing :class:`TranscriptionService`.
- ``whisperx`` / ``funasr`` -> heavy engines, **lazily imported** so a missing
  GPU dependency never breaks import of this module. Any failure (not installed,
  GPU error, ...) falls back to local faster-whisper so a job is never lost.

Every engine returns the same triple: ``(full_text, detected_language, segments)``
where each segment is a dict with at least ``start`` / ``end`` / ``text``.
"""

import logging
from collections.abc import Callable
from typing import Any

from app.services.transcriber import TranscriptionService

logger = logging.getLogger(__name__)

# Engines that require heavy, optional dependencies (imported lazily).
LAZY_ENGINES = {"whisperx", "funasr"}


def _transcribe_lazy(engine: str, file_path: str, language: str | None):
    if engine == "whisperx":
        from app.services.stt_whisperx import transcribe_whisperx  # lazy import

        return transcribe_whisperx(file_path, language=language)
    raise NotImplementedError(
        f"STT engine '{engine}' is not installed. See "
        "docs/reviews/STT-PHASE3-WHISPERX-PLAN.md."
    )


def transcribe_with_engine(
    engine: str,
    file_path: str,
    *,
    model_name: str | None = None,
    language: str | None = None,
    progress_callback: Callable[..., Any] | None = None,
    job_id: str | None = None,
) -> tuple[str, str, list[dict]]:
    """Transcribe ``file_path`` using ``engine``, falling back to local on error."""
    engine = (engine or "local").lower()

    if engine in LAZY_ENGINES:
        try:
            return _transcribe_lazy(engine, file_path, language)
        except Exception as exc:  # not installed / GPU error / etc.
            logger.warning(
                "STT engine '%s' unavailable (%s); falling back to local Whisper.",
                engine,
                exc,
            )
            engine = "local"

    mode = "cloud" if engine == "cloud" else "local"
    transcriber = TranscriptionService(mode=mode, model_name=model_name)
    return transcriber.transcribe(
        file_path,
        language=language,
        progress_callback=progress_callback,
        job_id=job_id,
    )
