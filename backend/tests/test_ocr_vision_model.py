import asyncio

from app.core import ai


class _FakeResponse:
    def __init__(self, content: str | None = None) -> None:
        self.content = content or (
            '[{"text":"Login","source_language":"en","translation_ja":"ログイン",'
            '"translation_vi":"Đăng nhập","translation":"Đăng nhập",'
            '"translation_en":"Login","leftPercent":1,'
            '"topPercent":2,"wPercent":30,"hPercent":10}]'
        )

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        # Provide both OpenAI ("choices") and Ollama ("message") response shapes so
        # one fake works for either OCR routing branch.
        return {
            "choices": [{"message": {"content": self.content}}],
            "message": {"content": self.content},
        }


class _FakeClient:
    def __init__(self, content: str | None = None) -> None:
        self.content = content
        self.payload: dict | None = None
        self.endpoint: str | None = None
        self.headers: dict | None = None

    async def post(self, endpoint: str, json: dict, headers: dict) -> _FakeResponse:
        self.payload = json
        self.endpoint = endpoint
        self.headers = headers
        return _FakeResponse(self.content)


def test_ocr_falls_back_to_local_ollama_when_no_gemini_key(monkeypatch) -> None:
    """Local default: without a Gemini key, a cloud OCR_VISION_MODEL falls back to
    the local Ollama vision model so OCR works offline instead of hitting 9router."""
    fake_client = _FakeClient()
    monkeypatch.setattr(ai.settings, "ocr_vision_model", "gemini/gemini-3.1-flash-lite-preview")
    monkeypatch.setattr(ai.settings, "gemini_api_key", "")
    monkeypatch.setattr(ai.settings, "ocr_local_vision_model", "qwen3.5:9b")
    monkeypatch.setattr(ai.settings, "ollama_base_url", "http://localhost:11434")
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)

    result = asyncio.run(ai.generate_ocr_from_image("iVBORw0KGgo="))

    assert fake_client.payload is not None
    assert fake_client.payload["model"] == "qwen3.5:9b"
    assert fake_client.endpoint == "http://localhost:11434/api/chat"
    # Ollama vision uses an images array (raw base64) on the user message.
    assert fake_client.payload["messages"][-1]["images"] == ["iVBORw0KGgo="]
    assert result[0]["text"] == "Login"
    assert result[0]["translation_ja"] == "ログイン"


def test_ocr_uses_explicit_ollama_vision_model(monkeypatch) -> None:
    """An explicit Ollama OCR_VISION_MODEL always runs locally, even with a key."""
    fake_client = _FakeClient()
    monkeypatch.setattr(ai.settings, "ocr_vision_model", "ollama/qwen3.5")
    monkeypatch.setattr(ai.settings, "gemini_api_key", "AIza-test-key")
    monkeypatch.setattr(ai.settings, "ollama_base_url", "http://localhost:11434")
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)

    result = asyncio.run(ai.generate_ocr_from_image("iVBORw0KGgo="))

    assert fake_client.payload["model"] == "qwen3.5:9b"
    assert fake_client.endpoint == "http://localhost:11434/api/chat"
    assert result[0]["text"] == "Login"


def test_ocr_vision_uses_direct_gemini_when_key_configured(monkeypatch) -> None:
    """When a Gemini API key is set and the OCR model is a 'gemini/...' id, OCR
    calls Google's OpenAI-compatible endpoint directly with the prefix stripped."""
    fake_client = _FakeClient()
    monkeypatch.setattr(ai.settings, "ocr_vision_model", "gemini/gemini-3.1-flash-lite-preview")
    monkeypatch.setattr(ai.settings, "gemini_api_key", "AIza-test-key")
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)

    result = asyncio.run(ai.generate_ocr_from_image("iVBORw0KGgo="))

    assert fake_client.payload is not None
    # Google's endpoint expects the bare model id without the "gemini/" prefix.
    assert fake_client.payload["model"] == "gemini-3.1-flash-lite-preview"
    assert fake_client.endpoint == (
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    )
    assert fake_client.headers["Authorization"] == "Bearer AIza-test-key"
    assert result[0]["text"] == "Login"


def test_parse_ai_json_extracts_embedded_ocr_array() -> None:
    raw = 'OCR result:\n```json\n[{"text":"OK","translation":"OK"}]\n```'

    result = ai.parse_ai_json(raw, "parse failed")

    assert result == [{"text": "OK", "translation": "OK"}]


def test_ocr_vision_returns_raw_text_fallback_when_json_parse_fails(monkeypatch) -> None:
    fake_client = _FakeClient("Detected text but not JSON")
    monkeypatch.setattr(ai.settings, "ocr_vision_model", "gemini/gemini-3.1-flash-lite-preview")
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)

    result = asyncio.run(ai.generate_ocr_from_image("iVBORw0KGgo="))

    assert result[0]["text"] == "Detected text but not JSON"
    assert result[0]["wPercent"] == 100.0
