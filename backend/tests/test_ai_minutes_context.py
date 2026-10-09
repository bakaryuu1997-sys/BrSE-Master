import asyncio
import json

from app.core import ai


def test_extract_meeting_minutes_adds_project_rules_to_prompt(monkeypatch) -> None:
    captured = {}

    async def fake_completion(**kwargs):
        captured["messages"] = kwargs["messages"]
        return json.dumps(
            {
                "project_name": "Bridge OS",
                "summary_vi": "ok",
                "agenda_items": [],
                "action_items": [],
            }
        )

    monkeypatch.setattr(ai, "create_chat_completion", fake_completion)

    result = asyncio.run(
        ai.extract_meeting_minutes(
            "Transcript body",
            customer_style="polite",
            report_rule="include blockers",
            timezone_rule="JST",
            communication_notes="impact first",
        )
    )

    user_prompt = captured["messages"][1]["content"]
    assert result["project_name"] == "Bridge OS"
    assert "顧客スタイル: polite" in user_prompt
    assert "報告ルール: include blockers" in user_prompt
    assert "タイムゾーン/稼働ルール: JST" in user_prompt
    assert "コミュニケーションメモ: impact first" in user_prompt
