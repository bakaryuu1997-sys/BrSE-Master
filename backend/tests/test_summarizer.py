from app.core.config import settings
from app.services.summarizer import SummarizerService


def test_long_transcript_uses_multi_stage_summarize(monkeypatch) -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    transcript = "alpha " * 7000
    calls: list[str] = []

    def fake_create_completion(messages, max_tokens):
        user_content = messages[-1]["content"]
        calls.append(user_content)
        if "Chunk" in user_content and "long meeting transcript" in user_content:
            return "### Summary\n- Chunk summary ok\n\n### Decisions\n- None"
        if "Batch" in user_content and "consolidated meeting notes" in user_content:
            return "### Summary\n- Batch summary ok\n\n### Decisions\n- None"
        return "# Meeting Note\n\n## Summary\n- Final memo ok"

    monkeypatch.setattr(service, "_create_completion", fake_create_completion)

    result = service.summarize(transcript, language="vi", template="meeting")

    assert "Final memo ok" in result
    assert any("Chunk 1/" in content for content in calls)


def test_long_transcript_reuses_checkpointed_chunk_summaries(monkeypatch) -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    content = "alpha " * 5200
    chunks = service._chunk_content(content, 1600)
    checkpoint = {
        "version": 1,
        "key": service._summary_checkpoint_key(content, "vi", "meeting", 1600, len(chunks)),
        "language": "vi",
        "template": "meeting",
        "chunk_size": 1600,
        "total_chunks": len(chunks),
        "chunks": {"0": "cached chunk 1"},
    }
    summarized_chunks: list[int] = []
    saved_checkpoints: list[dict] = []

    def fake_chunk_summary(chunk, language, template, chunk_index, total_chunks):
        summarized_chunks.append(chunk_index)
        return f"new chunk {chunk_index}"

    def fake_reduce(summaries, language, template, progress_callback=None):
        assert summaries[0] == "cached chunk 1"
        return "# Meeting Note\n\n## Summary\n- Final from checkpointed chunks"

    monkeypatch.setattr(service, "_summarize_chunk_with_retry", fake_chunk_summary)
    monkeypatch.setattr(service, "_reduce_chunk_summaries", fake_reduce)
    monkeypatch.setattr(settings, "meeting_summary_chunk_workers", 1)

    result = service._summarize_long_content(
        content,
        "vi",
        "meeting",
        checkpoint=checkpoint,
        checkpoint_callback=lambda payload: saved_checkpoints.append(dict(payload)),
    )

    assert "Final from checkpointed chunks" in result
    assert 1 not in summarized_chunks
    assert summarized_chunks == list(range(2, len(chunks) + 1))
    assert saved_checkpoints
    assert saved_checkpoints[-1]["final_memo"] == result


def test_long_transcript_returns_structured_local_fallback_when_ai_unavailable(monkeypatch) -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    transcript = "follow up action and customer question. " * 7000

    def failing_completion(messages, max_tokens):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(service, "_create_completion", failing_completion)

    result = service.summarize(transcript, language="vi", template="meeting")

    assert "# Meeting Note" in result
    assert "local structured fallback" in result
    assert "## Source Excerpt" in result


def test_extract_structured_signals_uses_local_fallback_with_speakers(monkeypatch) -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    transcript = """
    [00:01] お願いします。仕様を来週までに確認したいです。
    [00:15] こちらでAPI実装を進めます。担当はBrSEです。
    [00:29] 決定としてUATは2026-05-20に開始します。
    [00:45] 課題は認証APIのレスポンスがまだ不安定です。
    """
    memo = "# Meeting Note\n\n## Summary\n- API and UAT discussion.\n"
    segments = [
        {"start": 1, "end": 10, "text": "お願いします。仕様を来週までに確認したいです。"},
        {"start": 15, "end": 24, "text": "こちらでAPI実装を進めます。担当はBrSEです。"},
    ]

    def failing_completion(messages, max_tokens):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(service, "_create_completion", failing_completion)

    signals = service.extract_structured_signals(transcript, memo, language="vi", segments=segments)

    assert signals["source"] == "fallback"
    assert signals["decisions"]
    assert signals["actions"]
    assert signals["speakers"]
    assert signals["short_summary"]
    assert signals["detailed_summary"]


def test_extract_structured_signals_accepts_short_and_detailed_summary(monkeypatch) -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")

    def fake_completion(messages, max_tokens):
        return """
        {
          "summary": "API scope was reviewed.",
          "short_summary": "- API scope reviewed\\n- UAT timing confirmed",
          "detailed_summary": "- Customer asked about API scope\\n- BrSE confirmed follow-up\\n- UAT timing needs tracking",
          "speakers": [{"label":"Customer","role_hint":"Customer","highlights":["Asked about API scope"]}],
          "decisions": ["Start UAT after API confirmation"],
          "actions": [{"task":"Send API scope summary","owner":"BrSE","deadline":"2026-05-10","status":"open"}],
          "risks": ["API response remains unstable"],
          "open_questions": ["Confirm final UAT date"],
          "keywords": ["API","UAT"]
        }
        """

    monkeypatch.setattr(service, "_create_completion", fake_completion)

    signals = service.extract_structured_signals("Customer asked about API scope.", "# Meeting Note", language="vi")

    assert signals["source"] == "ai"
    assert "UAT timing" in signals["short_summary"]
    assert "Customer asked" in signals["detailed_summary"]
