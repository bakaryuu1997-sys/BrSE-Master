from fastapi.testclient import TestClient

from app.core import ai_runtime
from app.api.routes import ai as ai_routes
from app.main import app


client = TestClient(app)


def test_ai_status_exposes_config_without_runtime_check() -> None:
    response = client.get("/api/ai/status")

    assert response.status_code == 200
    data = response.json()
    assert data["provider"] in {"9router", "ollama"}
    assert data["configured"] is True
    assert data["runtime_checked"] is False
    assert data["runtime_reachable"] is None
    assert data["base_url"]
    assert data["default_model"] == "openrouter/nvidia/nemotron-3-super-120b-a12b:free"


SECRET = "status-test-secret"
DETAIL_KEYS = {"base_url", "model", "default_model", "available_models"}


class CountingAsyncClient:
    """Stands in for httpx.AsyncClient so a test can tell whether the runtime probe was attempted."""

    calls = 0

    def __init__(self, *args, **kwargs) -> None:
        CountingAsyncClient.calls += 1

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info) -> bool:
        return False

    async def get(self, *args, **kwargs):
        class Response:
            status_code = 200

            def json(self):
                return {"models": []}

        return Response()


def test_ai_status_hides_internals_from_untrusted_callers(monkeypatch) -> None:
    """B-018: the route stays public but must not leak base_url/models, nor trigger the runtime probe."""
    monkeypatch.setattr(ai_routes.settings, "brse_api_secret", SECRET)
    monkeypatch.setattr(ai_routes.httpx, "AsyncClient", CountingAsyncClient)
    CountingAsyncClient.calls = 0

    for headers in ({}, {"X-BrSE-Token": "wrong"}):
        response = client.get("/api/ai/status?check_runtime=true", headers=headers)
        data = response.json()
        assert response.status_code == 200
        assert data["restricted"] is True
        assert DETAIL_KEYS.isdisjoint(data)
        assert data["runtime_checked"] is False

    assert CountingAsyncClient.calls == 0


def test_ai_status_full_detail_and_runtime_probe_with_the_right_token(monkeypatch) -> None:
    monkeypatch.setattr(ai_routes.settings, "brse_api_secret", SECRET)
    monkeypatch.setattr(ai_routes.httpx, "AsyncClient", CountingAsyncClient)
    CountingAsyncClient.calls = 0

    data = client.get("/api/ai/status?check_runtime=true", headers={"X-BrSE-Token": SECRET}).json()

    assert data.get("restricted") is not True
    assert DETAIL_KEYS <= set(data)
    assert data["runtime_checked"] is True
    assert CountingAsyncClient.calls == 1


def test_ai_status_hides_internals_from_remote_callers_without_a_secret(monkeypatch) -> None:
    monkeypatch.setattr(ai_routes.settings, "brse_api_secret", "")

    data = client.get("/api/ai/status", headers={"X-Forwarded-For": "203.0.113.10"}).json()

    assert data["restricted"] is True
    assert DETAIL_KEYS.isdisjoint(data)


def test_ai_status_exposes_only_verified_model_presets() -> None:
    response = client.get("/api/ai/status")

    assert response.status_code == 200
    data = response.json()
    assert {model["id"] for model in data["available_models"]} == {
        "qwen2.5-coder:7b-instruct",
        "gemma4:12b",
        "cx/gpt-5.5",
        "gemini/gemma-4-31b-it",
        "nvidia/google/gemma-4-31b-it",
        "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
        "free-logic",
    }


def test_ai_model_rejects_unverified_model() -> None:
    response = client.post("/api/ai/model", json={"model": "cx/unknown-model"})

    assert response.status_code == 400
    assert "Unsupported model" in response.json()["detail"]


def test_legacy_persisted_model_without_user_source_falls_back_to_default(tmp_path, monkeypatch) -> None:
    runtime_path = tmp_path / "runtime_ai_config.json"
    runtime_path.write_text('{"model": "qwen2.5-coder:7b-instruct"}', encoding="utf-8")
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_CONFIG_PATH", runtime_path)

    assert ai_runtime.get_selected_ai_model() == "openrouter/nvidia/nemotron-3-super-120b-a12b:free"


def test_user_selected_ollama_model_is_preserved(tmp_path, monkeypatch) -> None:
    runtime_path = tmp_path / "runtime_ai_config.json"
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_CONFIG_PATH", runtime_path)

    assert ai_runtime.set_selected_ai_model("qwen2.5-coder:7b-instruct") == "qwen2.5-coder:7b-instruct"
    assert ai_runtime.get_selected_ai_model() == "qwen2.5-coder:7b-instruct"


def test_ai_model_smoke_does_not_change_selected_model(tmp_path, monkeypatch) -> None:
    runtime_path = tmp_path / "runtime_ai_config.json"
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_CONFIG_PATH", runtime_path)
    ai_runtime.set_selected_ai_model("qwen2.5-coder:7b-instruct")

    async def fake_create_chat_completion(*args, model: str | None = None, **kwargs) -> str:
        if model == "free-logic":
            raise RuntimeError("provider unavailable")
        return "OK"

    monkeypatch.setattr(ai_routes, "create_chat_completion", fake_create_chat_completion)

    response = client.post("/api/ai/model-smoke", json={"message": "OK?"})

    assert response.status_code == 200
    data = response.json()
    assert data["active_model"] == "qwen2.5-coder:7b-instruct"
    assert ai_runtime.get_selected_ai_model() == "qwen2.5-coder:7b-instruct"
    results = {item["id"]: item for item in data["results"]}
    assert results["qwen2.5-coder:7b-instruct"]["ok"] is True
    assert results["free-logic"]["ok"] is False
    assert "provider unavailable" in results["free-logic"]["error"]


def test_ai_model_smoke_supports_sequential_mode(tmp_path, monkeypatch) -> None:
    runtime_path = tmp_path / "runtime_ai_config.json"
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_CONFIG_PATH", runtime_path)
    ai_runtime.set_selected_ai_model("qwen2.5-coder:7b-instruct")

    calls: list[str | None] = []

    async def fake_create_chat_completion(*args, model: str | None = None, **kwargs) -> str:
        calls.append(model)
        return "OK"

    monkeypatch.setattr(ai_routes, "create_chat_completion", fake_create_chat_completion)

    response = client.post(
        "/api/ai/model-smoke",
        json={"message": "OK?", "sequential": True, "timeout_seconds": 30},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["results"], "expected smoke results"
    assert all(item["ok"] for item in data["results"])
    assert len(calls) == len(data["results"])  # one call per curated preset
