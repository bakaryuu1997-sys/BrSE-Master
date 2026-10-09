from app.services.transcript_quality import assess_transcript_quality


def _seg(start, end, text):
    return {"start": start, "end": end, "text": text}


def test_clean_transcript_has_no_warnings():
    text = "We reviewed the API spec and agreed on the deadline for the next sprint review"
    segments = [_seg(0, 4, "We reviewed the API spec"), _seg(4, 8, "and agreed on the deadline")]
    result = assess_transcript_quality(text, segments)
    assert result["warnings"] == []
    assert result["stats"]["word_count"] == len(text.split())


def test_flags_too_short():
    result = assess_transcript_quality("ok thanks", [])
    assert "transcript_too_short" in result["warnings"]


def test_flags_repeated_segments_loop():
    segments = [_seg(i, i + 1, "thank you") for i in range(5)]
    text = "thank you " * 5
    result = assess_transcript_quality(text, segments)
    assert "repeated_segments" in result["warnings"]
    assert result["stats"]["max_repeated_segment_run"] >= 3


def test_flags_low_lexical_diversity():
    text = " ".join(["yes"] * 40)
    result = assess_transcript_quality(text, [])
    assert "low_lexical_diversity" in result["warnings"]


def test_flags_abnormal_long_segments():
    segments = [_seg(0, 45, "uh")]  # 45s segment, almost no words
    text = "uh " * 10
    result = assess_transcript_quality(text, segments)
    assert "abnormal_long_segments" in result["warnings"]
