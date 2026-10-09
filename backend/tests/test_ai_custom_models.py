"""Tests for user-defined AI models (/api/ai/models/custom).

Users can add their own Ollama/9router model ids in Settings and switch to them.
Uses a temp runtime-config file so the real config is never touched.
"""

import pytest
from fastapi.testclient import TestClient

import app.core.ai_runtime as ai_runtime
from app.main import app


@pytest.fixture()
def temp_runtime(tmp_path, monkeypatch):
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_CONFIG_PATH", tmp_path / "runtime_ai_config.json")
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_SECRETS_PATH", tmp_path / "runtime_ai_secrets.json")
    return tmp_path


def test_add_custom_model_makes_it_known_and_selectable(temp_runtime):
    client = TestClient(app)
    res = client.post("/api/ai/models/custom", json={
        "id": "llava:7b", "label": "LLaVA 7B", "provider": "ollama",
    })
    assert res.status_code == 201
    ids = {m["id"] for m in res.json()["available_models"]}
    assert "llava:7b" in ids

    # Previously rejected non-preset id is now selectable.
    sel = client.post("/api/ai/model", json={"model": "llava:7b"})
    assert sel.status_code == 200
    assert sel.json()["model"] == "llava:7b"
    assert ai_runtime.get_selected_ai_model() == "llava:7b"


def test_add_custom_model_rejects_builtin_id(temp_runtime):
    client = TestClient(app)
    res = client.post("/api/ai/models/custom", json={"id": "free-logic"})
    assert res.status_code == 400


def test_add_custom_model_requires_id(temp_runtime):
    client = TestClient(app)
    res = client.post("/api/ai/models/custom", json={"id": "   "})
    assert res.status_code == 400


def test_unknown_model_still_rejected_by_selector(temp_runtime):
    client = TestClient(app)
    res = client.post("/api/ai/model", json={"model": "not-a-real-model"})
    assert res.status_code == 400


def test_remove_custom_model_reverts_active_to_default(temp_runtime):
    client = TestClient(app)
    client.post("/api/ai/models/custom", json={"id": "mistral:7b", "provider": "ollama"})
    client.post("/api/ai/model", json={"model": "mistral:7b"})
    assert ai_runtime.get_selected_ai_model() == "mistral:7b"

    res = client.delete("/api/ai/models/custom/mistral:7b")
    assert res.status_code == 200
    assert res.json()["selected_model"] == ai_runtime.DEFAULT_MODEL
    assert "mistral:7b" not in {m["id"] for m in res.json()["available_models"]}


def test_remove_missing_custom_model_returns_404(temp_runtime):
    client = TestClient(app)
    res = client.delete("/api/ai/models/custom/ghost:1b")
    assert res.status_code == 404


def test_custom_model_with_slash_id_round_trips(temp_runtime):
    """9router-style ids contain slashes; the {path} route must handle them."""
    client = TestClient(app)
    client.post("/api/ai/models/custom", json={"id": "gh/claude-sonnet-4.6", "provider": "custom"})
    res = client.delete("/api/ai/models/custom/gh/claude-sonnet-4.6")
    assert res.status_code == 200
    assert res.json()["removed"] == "gh/claude-sonnet-4.6"
