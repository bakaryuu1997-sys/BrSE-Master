import asyncio
import json

from app.core import ai


def test_keigo_prompt_accepts_vietnamese_input(monkeypatch) -> None:
    captured: dict[str, object] = {}

    async def fake_create_chat_completion(*, messages, temperature, max_tokens):
        captured["messages"] = messages
        captured["temperature"] = temperature
        captured["max_tokens"] = max_tokens
        return json.dumps(
            {
                "level": "敬語",
                "score": 92,
                "improved": "お世話になっております。確認いたします。",
                "changes": [
                    {
                        "original": "mình sẽ kiểm tra",
                        "corrected": "確認いたします",
                        "reason_vi": "Chuyển ý tiếng Việt sang kính ngữ Nhật tự nhiên.",
                    }
                ],
                "summary_vi": "Đã chuyển ý tiếng Việt sang câu Nhật Keigo phù hợp.",
            }
        )

    monkeypatch.setattr(ai, "create_chat_completion", fake_create_chat_completion)

    result = asyncio.run(ai.generate_keigo_correction("mình sẽ kiểm tra và báo lại khách hàng"))

    messages = captured["messages"]
    system_prompt = messages[0]["content"]
    user_message = messages[1]["content"]

    assert "ベトナム語" in system_prompt
    assert "improved は必ず日本語" in system_prompt
    assert "日本語ビジネス敬語へ変換・修正" in user_message
    assert result["improved"] == "お世話になっております。確認いたします。"
