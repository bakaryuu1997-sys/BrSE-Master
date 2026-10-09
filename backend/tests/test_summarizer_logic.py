from app.services.summarizer import SummarizerService

svc = SummarizerService(model="test-model")


def test_chunk_content_splits_by_word_count():
    content = " ".join(str(i) for i in range(10))
    chunks = svc._chunk_content(content, 4)
    assert len(chunks) == 3
    assert chunks[0] == "0 1 2 3"
    assert chunks[-1] == "8 9"


def test_seconds_label_formats_mm_ss():
    assert svc._seconds_label(0) == "00:00"
    assert svc._seconds_label(75) == "01:15"


def test_looks_like_local_chunk_fallback():
    assert svc._looks_like_local_chunk_fallback("One AI summarize pass failed here") is True
    assert svc._looks_like_local_chunk_fallback("a normal AI summary") is False


def test_infer_role_hint():
    assert svc._infer_role_hint("ご確認お願いします") == "Customer"
    assert svc._infer_role_hint("we found a bug during UAT") == "QA / Team"
    assert svc._infer_role_hint("対応します") == "BrSE / Team"


def test_as_string_list_coerces_and_filters():
    assert svc._as_string_list(["a", " ", "b"]) == ["a", "b"]
    assert svc._as_string_list("solo") == ["solo"]
    assert svc._as_string_list(None) == []


def test_format_transcript_with_segments_adds_timestamp_and_role():
    out = svc._format_transcript_with_segments("raw", [{"start": 65, "text": "対応します"}])
    assert "[01:05]" in out
    assert "[BrSE / Team]" in out
    # no segments -> returns the raw transcript unchanged
    assert svc._format_transcript_with_segments("raw", []) == "raw"


def test_format_transcript_prefers_real_diarized_speaker():
    out = svc._format_transcript_with_segments(
        "raw", [{"start": 0, "text": "hello", "speaker": "SPEAKER_01"}]
    )
    assert "[SPEAKER_01]" in out
    # without a speaker label it falls back to the keyword role hint
    out2 = svc._format_transcript_with_segments("raw", [{"start": 0, "text": "対応します"}])
    assert "[BrSE / Team]" in out2


def test_relevant_glossary_caches_db_fetch(monkeypatch):
    """Map-reduce calls _get_relevant_glossary per chunk; the DB is hit once."""
    calls = {"queries": 0}

    class _FakeQuery:
        def all(self):
            return [("Requirement", "要件", "Yêu cầu"), ("Release", "リリース", "Phát hành")]

    class _FakeSession:
        def query(self, *cols):
            calls["queries"] += 1
            return _FakeQuery()

        def close(self):
            pass

    monkeypatch.setattr("app.services.summarizer.SessionLocal", lambda: _FakeSession())

    service = SummarizerService(model="test-model")
    first = service._get_relevant_glossary("We discussed the requirement in detail today.")
    second = service._get_relevant_glossary("Another requirement for the release came up.")

    assert calls["queries"] == 1  # cached across calls
    assert "要件" in first
    assert "要件" in second
    assert "リリース" in second  # 'release' now matches the second chunk too


def test_relevant_glossary_empty_when_no_match(monkeypatch):
    class _FakeQuery:
        def all(self):
            return [("Requirement", "要件", "Yêu cầu")]

    class _FakeSession:
        def query(self, *cols):
            return _FakeQuery()

        def close(self):
            pass

    monkeypatch.setattr("app.services.summarizer.SessionLocal", lambda: _FakeSession())
    service = SummarizerService(model="test-model")
    assert service._get_relevant_glossary("nothing relevant here") == ""
