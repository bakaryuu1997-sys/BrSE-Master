import asyncio

import httpx

from app.core import ai


class FakeAsyncClient:
    def __init__(self, response: httpx.Response):
        self.response = response
        self.calls: list[dict] = []

    async def post(self, endpoint: str, **kwargs):
        self.calls.append({"endpoint": endpoint, **kwargs})
        self.response.request = httpx.Request("POST", endpoint)
        return self.response


def test_ollama_model_uses_ollama_chat_api(monkeypatch) -> None:
    fake_client = FakeAsyncClient(httpx.Response(200, json={"message": {"content": "pong"}}))
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)
    monkeypatch.setattr(ai.settings, "ollama_base_url", "http://ollama.local")

    result = asyncio.run(
        ai.create_chat_completion(
            [{"role": "user", "content": "ping"}],
            temperature=0.1,
            max_tokens=32,
            model="qwen2.5-coder:7b-instruct",
        )
    )

    assert result == "pong"
    assert fake_client.calls[0]["endpoint"] == "http://ollama.local/api/chat"
    assert fake_client.calls[0]["json"]["model"] == "qwen2.5-coder:7b-instruct"
    assert fake_client.calls[0]["json"]["stream"] is False
    assert "headers" not in fake_client.calls[0]


def test_ollama_prefixed_model_is_normalized(monkeypatch) -> None:
    fake_client = FakeAsyncClient(httpx.Response(200, json={"message": {"content": "pong"}}))
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)
    monkeypatch.setattr(ai.settings, "ollama_base_url", "http://ollama.local")

    asyncio.run(
        ai.create_chat_completion(
            [{"role": "user", "content": "ping"}],
            temperature=0.1,
            max_tokens=32,
            model="ollama/qwen3.5",
        )
    )

    assert fake_client.calls[0]["json"]["model"] == "qwen3.5:9b"


def test_non_ollama_model_uses_9router_chat_completions(monkeypatch) -> None:
    fake_client = FakeAsyncClient(httpx.Response(200, json={"choices": [{"message": {"content": "pong"}}]}))
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)
    monkeypatch.setattr(ai.settings, "openai_base_url", "http://9router.local/v1")
    monkeypatch.setattr(ai.settings, "openai_api_key", "test-key")

    result = asyncio.run(
        ai.create_chat_completion(
            [{"role": "user", "content": "ping"}],
            temperature=0.1,
            max_tokens=32,
            model="gemini/gemma-4-31b-it",
        )
    )

    assert result == "pong"
    assert fake_client.calls[0]["endpoint"] == "http://9router.local/v1/chat/completions"
    assert fake_client.calls[0]["json"]["model"] == "gemini/gemma-4-31b-it"
    assert fake_client.calls[0]["headers"]["Authorization"] == "Bearer test-key"



def test_gemma4_12b_model_uses_ollama_chat_api(monkeypatch) -> None:
    fake_client = FakeAsyncClient(httpx.Response(200, json={"message": {"content": "ok"}}))
    monkeypatch.setattr(ai, "get_ai_async_client", lambda: fake_client)
    monkeypatch.setattr(ai.settings, "ollama_base_url", "http://ollama.local")

    result = asyncio.run(
        ai.create_chat_completion(
            [{"role": "user", "content": "ping"}],
            temperature=0.1,
            max_tokens=32,
            model="gemma4:12b",
        )
    )

    assert result == "ok"
    assert fake_client.calls[0]["endpoint"] == "http://ollama.local/api/chat"
    assert fake_client.calls[0]["json"]["model"] == "gemma4:12b"
