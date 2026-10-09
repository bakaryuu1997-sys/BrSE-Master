"""Lightweight, dependency-free transcript quality heuristics.

Whisper-family models occasionally hallucinate (repeating the same phrase in a
loop) or emit long low-content segments. This module flags those patterns so the
UI / logs can warn the user without needing a second model. Pure functions only.
"""

from typing import Any


def _segment_text(segment: Any) -> str:
    if isinstance(segment, dict):
        return str(segment.get("text") or "")
    return str(getattr(segment, "text", "") or "")


def _segment_duration(segment: Any) -> float:
    if isinstance(segment, dict):
        start, end = segment.get("start", 0), segment.get("end", 0)
    else:
        start, end = getattr(segment, "start", 0), getattr(segment, "end", 0)
    try:
        return max(0.0, float(end or 0) - float(start or 0))
    except (TypeError, ValueError):
        return 0.0


def _max_consecutive_repeat(segments: list) -> int:
    """Longest run of consecutive segments with identical (normalised) text."""
    longest = 0
    run = 0
    previous = None
    for segment in segments:
        text = " ".join(_segment_text(segment).lower().split())
        if not text:
            previous = None
            run = 0
            continue
        if text == previous:
            run += 1
        else:
            run = 1
            previous = text
        longest = max(longest, run)
    return longest


def assess_transcript_quality(text: str, segments: list | None = None) -> dict[str, Any]:
    """Return {"warnings": [...], "stats": {...}} for a transcript.

    Warning codes (stable strings, safe for UI/logs):
    - transcript_too_short: < 5 words total
    - repeated_segments: >= 3 identical consecutive segments (likely a loop)
    - low_lexical_diversity: unique/total word ratio < 0.2 on a long transcript
    - abnormal_long_segments: long segments (> 30s) carrying almost no words
    """
    segments = segments or []
    words = text.split()
    word_count = len(words)
    unique_ratio = (len({w.lower() for w in words}) / word_count) if word_count else 0.0

    repeat_run = _max_consecutive_repeat(segments)
    abnormal_long = sum(
        1
        for segment in segments
        if _segment_duration(segment) > 30 and len(_segment_text(segment).split()) < 3
    )

    warnings: list[str] = []
    if word_count < 5:
        warnings.append("transcript_too_short")
    if repeat_run >= 3:
        warnings.append("repeated_segments")
    if word_count >= 30 and unique_ratio < 0.2:
        warnings.append("low_lexical_diversity")
    if abnormal_long:
        warnings.append("abnormal_long_segments")

    return {
        "warnings": warnings,
        "stats": {
            "word_count": word_count,
            "segment_count": len(segments),
            "unique_word_ratio": round(unique_ratio, 3),
            "max_repeated_segment_run": repeat_run,
            "abnormal_long_segments": abnormal_long,
        },
    }
