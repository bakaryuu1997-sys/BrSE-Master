from app.services.summarizer import SummarizerService


def test_meeting_signals_dedupe_keep_order() -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    signals = service.signals_service
    items = ["A", "B", "A", "C", "B"]
    assert signals._dedupe_keep_order(items) == ["A", "B", "C"]


def test_meeting_signals_extract_deadline() -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    signals = service.signals_service
    assert signals._extract_deadline("The due date is 2026-05-12.") == "2026-05-12"
    assert signals._extract_deadline("No date here.") == ""


def test_meeting_signals_extract_terms() -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    signals = service.signals_service
    text = "We should implement the new REST API and run UAT tests."
    terms = signals._extract_terms(text)
    assert "API" in terms
    assert "UAT" in terms


def test_meeting_signals_normalize_structured_signals() -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    signals = service.signals_service
    raw_data = {
        "summary": "Meeting recap",
        "short_summary": ["Bullet 1", "Bullet 2"],
        "detailed_summary": "Detailed notes here.",
        "speakers": [
            {"label": "Speaker 1", "role_hint": "BrSE", "highlights": ["Hello"]}
        ],
        "decisions": ["Decision 1", "Decision 1"],
        "actions": [
            "Action line 1",
            {"task": "Task 2", "owner": "BrSE", "deadline": "2026-05-15", "status": "open"}
        ],
        "risks": ["Risk 1"],
        "open_questions": ["Question 1"],
        "keywords": ["Term 1"]
    }
    normalized = signals._normalize_structured_signals(raw_data)
    assert normalized["summary"] == "Meeting recap"
    assert normalized["short_summary"] == "- Bullet 1\n- Bullet 2"
    assert normalized["decisions"] == ["Decision 1"]
    assert len(normalized["actions"]) == 2
    assert normalized["actions"][0]["task"] == "Action line 1"
    assert normalized["actions"][1]["owner"] == "BrSE"


def test_meeting_signals_fallback_parsing() -> None:
    service = SummarizerService(api_key="test", base_url="http://localhost:20128", model="dummy")
    signals = service.signals_service
    transcript = """
    Speaker 1: Q&A - Confirm scope by 2026-05-20.
    Speaker 2: We decided UAT will start next week.
    Speaker 1: Action: VN team will deploy this weekend.
    """
    memo = "## Summary\nThis is a memo recap."
    fallback = signals._build_structured_signal_fallback(transcript, memo)
    assert fallback["summary"] == "This is a memo recap."
    assert any("VN team will deploy" in a["task"] for a in fallback["actions"])
    assert any("start next week" in d for d in fallback["decisions"])
