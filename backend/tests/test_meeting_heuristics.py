from datetime import UTC, datetime, timedelta

from app.core.constants import PriorityEnum
from app.services.meeting_processor import _parse_glossary_line, is_valid_glossary_term
from app.services.meeting_todo_sync import is_useful_action_task, priority_for_action


def test_is_useful_action_task_filters_noise_and_length():
    assert is_useful_action_task("Confirm the API spec with the customer by Friday") is True
    # too short
    assert is_useful_action_task("do it") is False
    # too long
    assert is_useful_action_task("x" * 230) is False
    # known noise patterns leaking from the summarizer prompt/scaffold
    assert is_useful_action_task("Synthesize them into one complete meeting note now") is False
    assert is_useful_action_task("Review final memo to confirm decisions later") is False


def test_priority_for_action_overdue_and_urgent_are_p0():
    assert priority_for_action({"task": "ship it", "deadline": "2020-01-01"}) == PriorityEnum.P0
    assert priority_for_action({"task": "urgent blocker on login flow"}) == PriorityEnum.P0


def test_priority_for_action_without_deadline_is_p2():
    assert priority_for_action({"task": "clean up some unrelated notes"}) == PriorityEnum.P2


def test_priority_for_action_far_future_is_p2():
    far = (datetime.now(UTC).date() + timedelta(days=30)).isoformat()
    assert priority_for_action({"task": "plan next milestone", "deadline": far}) == PriorityEnum.P2


def test_parse_glossary_line_slash_form():
    assert _parse_glossary_line("- BrSE / ブリッジSE: kỹ sư cầu nối") == ("BrSE", "ブリッジSE", "kỹ sư cầu nối")


def test_parse_glossary_line_paren_form():
    assert _parse_glossary_line("- Backlog (バックログ): danh sách công việc") == ("Backlog", "バックログ", "danh sách công việc")


def test_parse_glossary_line_plain_and_invalid():
    assert _parse_glossary_line("- Sprint: chu kỳ phát triển") == ("Sprint", "", "chu kỳ phát triển")
    assert _parse_glossary_line("just some prose without a separator") is None


def test_is_valid_glossary_term_filters_junk():
    assert is_valid_glossary_term("API", "", "giao diện lập trình ứng dụng") is True
    assert is_valid_glossary_term("", "用語", "thuật ngữ") is True
    # placeholder-only term
    assert is_valid_glossary_term("N/A", "N/A", "something") is False
    # empty / too-short meaning
    assert is_valid_glossary_term("Sprint", "", "") is False
    assert is_valid_glossary_term("Sprint", "", "x") is False
    # term part is really a sentence, not a term
    assert is_valid_glossary_term("this is clearly a long sentence not a term", "", "meaning") is False
