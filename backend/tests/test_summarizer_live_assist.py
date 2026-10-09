"""Tests for live-assist + local engine-fallback paths of SummarizerService.

These cover the branches that run when the AI runtime is unavailable or returns
unusable output, which previously had little coverage.
"""

from app.services.summarizer import SummarizerService

svc = SummarizerService(model="test-model")

HAPPY_JSON = (
    '{"memo":["bullet"],"suggestions":["do X"],"explanations":["term Y"],'
    '"questions":["why late?"],"reply_drafts":["I will confirm."]}'
)


def test_live_assist_empty_input_returns_empty_shape():
    out = svc.live_assist("   ", question="  ")
    assert out == {
        "memo": [],
        "suggestions": [],
        "explanations": [],
        "questions": [],
        "reply_drafts": [],
        "raw": "",
    }


def test_live_assist_happy_path_parses_ai_json(monkeypatch):
    service = SummarizerService(model="test-model")
    monkeypatch.setattr(service, "_create_completion", lambda messages, max_tokens: HAPPY_JSON)
    out = service.live_assist("Customer asked about the deadline.", question="When is release?")
    assert out["memo"] == ["bullet"]
    assert out["suggestions"] == ["do X"]
    assert out["explanations"] == ["term Y"]
    assert out["questions"] == ["why late?"]
    assert out["reply_drafts"] == ["I will confirm."]


def test_live_assist_falls_back_locally_when_ai_raises(monkeypatch):
    service = SummarizerService(model="test-model")

    def boom(messages, max_tokens):
        raise RuntimeError("runtime down")

    monkeypatch.setattr(service, "_create_completion", boom)
    context = (
        "Khách hàng hỏi when is the deadline\n"
        "Có một bug nghiêm trọng trong module login\n"
        "We will continue tomorrow"
    )
    out = service.live_assist(context, question="Khi nào xong?")
    # Local heuristic still returns a usable structure (no exception bubbles up).
    assert out["suggestions"]
    assert any("when" in q.lower() for q in out["questions"])
    assert any("bug" in e.lower() for e in out["explanations"])


def test_live_assist_uses_local_fallback_on_ai_error_json(monkeypatch):
    service = SummarizerService(model="test-model")
    monkeypatch.setattr(service, "_create_completion", lambda messages, max_tokens: '{"error": "model refused"}')
    out = service.live_assist("Risk: deployment may slip", question="")
    assert out["suggestions"]  # came from _local_live_assist, not the (errored) AI


def test_local_live_assist_detects_questions_and_risks():
    out = svc._local_live_assist(
        "How should we handle the delay\nThere is a blocker on the API\nfine line here",
        question="",
    )
    assert any("how" in q.lower() for q in out["questions"])
    assert any("blocker" in e.lower() for e in out["explanations"])
    assert out["reply_drafts"]


def test_local_chunk_summary_has_sections_and_bullets():
    chunk = "決定: use feature flags\naction: assign owner\nrisk: api latency\nGeneral discussion about scope."
    out = svc._local_chunk_summary(chunk, 1, 3)
    assert "## Chunk 1/3" in out
    assert "### Decisions" in out
    assert "### Action Items" in out
    assert "### Risks / Open Questions" in out


def test_local_batch_summary_reduces_locally():
    out = svc._local_batch_summary(["point one", "point two", "point three"], 2, 4)
    assert "## Reduced Batch 2/4" in out
    assert "### Summary" in out
    assert "local fallback" in out
