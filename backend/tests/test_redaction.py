from fastapi.testclient import TestClient

from app.api.routes import ai as ai_routes
from app.core.redaction import redact_sensitive_text
from app.main import app


def test_redact_sensitive_text_masks_tokens_content_and_image_payload() -> None:
    raw = (
        'Bearer sk-live-secret api_key=abc123 token="local-token" '
        '{"content":"customer private payload","base64_image":"data:image/png;base64,'
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'
    )

    redacted = redact_sensitive_text(raw, extra_secrets=["local-token"])

    assert "sk-live-secret" not in redacted
    assert "abc123" not in redacted
    assert "local-token" not in redacted
    assert "customer private payload" not in redacted
    assert "AAAAAAAAAAAAAAAA" not in redacted
    assert "[REDACTED" in redacted


def test_ai_chat_runtime_error_detail_is_redacted(monkeypatch) -> None:
    async def fail_chat(message: str):  # noqa: ARG001
        raise RuntimeError('Bearer sk-live-secret {"content":"private customer note"}')

    monkeypatch.setattr(ai_routes.settings, "brse_api_secret", "")
    monkeypatch.setattr(ai_routes.settings, "openai_api_key", "sk-live-secret")
    monkeypatch.setattr(ai_routes, "generate_chat_reply", fail_chat)
    client = TestClient(app)

    response = client.post("/api/ai/chat", json={"message": "hello"})

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert "sk-live-secret" not in detail
    assert "private customer note" not in detail
    assert "[REDACTED" in detail
