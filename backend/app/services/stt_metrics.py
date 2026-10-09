"""Dependency-free STT confidence + benchmark helpers.

faster-whisper exposes `avg_logprob` (a log-probability) per segment. We turn
that into a 0..1 confidence and a duration-weighted transcript confidence, and
build a small benchmark record (timing / realtime factor) for the status meta.
Pure functions only — no model or network access.
"""

import math
from typing import Any


def _seg_get(segment: Any, key: str, default=None):
    if isinstance(segment, dict):
        return segment.get(key, default)
    return getattr(segment, key, default)


def segment_confidence(avg_logprob: float | None) -> float:
    """Map a log-probability (typically about -1..0) to 0..1 via exp(), clamped."""
    if avg_logprob is None:
        return 0.0
    try:
        return round(max(0.0, min(1.0, math.exp(float(avg_logprob)))), 3)
    except (TypeError, ValueError, OverflowError):
        return 0.0


def aggregate_confidence(segments: list | None) -> float:
    """Duration-weighted mean of per-segment confidence over a transcript."""
    if not segments:
        return 0.0
    weighted = 0.0
    total_weight = 0.0
    for segment in segments:
        confidence = _seg_get(segment, "confidence")
        if confidence is None:
            confidence = segment_confidence(_seg_get(segment, "avg_logprob"))
        try:
            start = float(_seg_get(segment, "start", 0) or 0)
            end = float(_seg_get(segment, "end", 0) or 0)
        except (TypeError, ValueError):
            start = end = 0.0
        weight = max(0.0, end - start) or 1.0
        weighted += float(confidence) * weight
        total_weight += weight
    return round(weighted / total_weight, 3) if total_weight else 0.0


def effective_chunk_workers(
    configured: int,
    cpu_count: int | None,
    chunk_count: int,
    cpu_threads: int = 1,
) -> int:
    """Clamp parallel-transcription workers to avoid CPU oversubscription.

    Each worker runs a CTranslate2 transcribe using ``cpu_threads`` threads, so
    ``workers * cpu_threads`` should stay within the available cores. The result
    never exceeds the configured value, the core budget, or the chunk count, and
    is always >= 1 (so it can only reduce concurrency, never inflate it).
    """
    configured = max(1, int(configured or 1))
    cores = max(1, int(cpu_count or 1))
    threads = max(1, int(cpu_threads or 1))
    core_budget = max(1, cores // threads)
    chunks = max(1, int(chunk_count or 1))
    return max(1, min(configured, core_budget, chunks))


def build_stt_benchmark(
    *,
    engine: str,
    model: str,
    device: str,
    transcribe_seconds: float,
    audio_seconds: float,
) -> dict[str, Any]:
    """A small, JSON-safe benchmark record for the job status meta."""
    transcribe_seconds = round(float(transcribe_seconds or 0), 2)
    audio_seconds = round(float(audio_seconds or 0), 2)
    realtime_factor = round(audio_seconds / transcribe_seconds, 2) if transcribe_seconds > 0 else 0.0
    return {
        "engine": engine,
        "model": model,
        "device": device,
        "transcribe_seconds": transcribe_seconds,
        "audio_seconds": audio_seconds,
        # audio_seconds / wall_seconds; > 1 means faster than realtime.
        "realtime_factor": realtime_factor,
    }
