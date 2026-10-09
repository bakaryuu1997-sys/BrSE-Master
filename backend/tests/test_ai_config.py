"""Tests for the runtime AI provider config endpoint (/api/ai/config).

Uses temp runtime files so it never touches the real config/secrets files, and
asserts: secrets are never exposed, empty secrets are preserved, updates are
applied to the live settings object, secrets are written to the dedicated
gitignored secrets file (never the model-config file), and a legacy provider
block in the model-config file is still readable for backward compatibility.
"""

import json

from fastapi.testclient import TestClient
import pytest

import app.core.ai_runtime as ai_runtime
from app.core.config import settings
from app.main import app


@pytest.fixture()
def temp_runtime(tmp_path, monkeypatch):
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_CONFIG_PATH", tmp_path / "runtime_ai_config.json")
    monkeypatch.setattr(ai_runtime, "RUNTIME_AI_SECRETS_PATH", tmp_path / "runtime_ai_secrets.json")
    return tmp_path


def test_get_config_defaults_no_secrets(temp_runtime):
    client = TestClient(app)
    res = client.get("/api/ai/config")
    assert res.status_code == 200
    data = res.json()
    # URL/model fields present in full.
    assert "openai_base_url" in data
    assert "ollama_base_url" in data
    assert "ocr_vision_model" in data
    # Secrets never exposed — only a configured map.
    assert "openai_api_key" not in data
    assert set(data["configured"].keys()) == {
        "openai_api_key",
        "nine_router_api_key",
        "gemini_api_key",
    }


def test_put_config_applies_to_settings(temp_runtime, monkeypatch):
    monkeypatch.setattr(settings, "ollama_base_url", "http://localhost:11434")
    client = TestClient(app)
    res = client.put("/api/ai/config", json={
        "ollama_base_url": "http://host.docker.internal:11434",
        "gemini_api_key": "AIza-secret-123",
        "ocr_vision_model": "gemini/gemini-2.0-flash",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["ollama_base_url"] == "http://host.docker.internal:11434"
    assert data["ocr_vision_model"] == "gemini/gemini-2.0-flash"
    assert data["configured"]["gemini_api_key"] is True
    # The live settings object was mutated.
    assert settings.ollama_base_url == "http://host.docker.internal:11434"
    assert settings.gemini_api_key == "AIza-secret-123"
    # Secret value is never returned.
    assert "gemini_api_key" not in data


def test_empty_secret_keeps_existing(temp_runtime):
    client = TestClient(app)
    client.put("/api/ai/config", json={"openai_api_key": "sk-original"})
    # Update only the URL, send empty key.
    client.put("/api/ai/config", json={"openai_api_key": "", "openai_base_url": "http://x/v1"})
    cfg = ai_runtime.get_ai_provider_config()
    assert cfg["configured"]["openai_api_key"] is True  # kept
    assert cfg["openai_base_url"] == "http://x/v1"


def test_persisted_config_reapplies(temp_runtime, monkeypatch):
    client = TestClient(app)
    client.put("/api/ai/config", json={"nine_router_base_url": "http://persisted:20128/v1"})
    # Simulate a restart: reset settings, then re-apply from the runtime file.
    monkeypatch.setattr(settings, "nine_router_base_url", "http://localhost:20128/v1")
    ai_runtime.apply_ai_provider_config()
    assert settings.nine_router_base_url == "http://persisted:20128/v1"


def test_secrets_written_to_secrets_file_not_config_file(temp_runtime):
    client = TestClient(app)
    client.put("/api/ai/config", json={"openai_api_key": "sk-secret", "model": "ignored"})

    # Secret lands in the dedicated secrets file...
    secrets = json.loads(ai_runtime.RUNTIME_AI_SECRETS_PATH.read_text(encoding="utf-8"))
    assert secrets["provider"]["openai_api_key"] == "sk-secret"
    # ...and never in the model-config file (which may not even exist yet).
    if ai_runtime.RUNTIME_AI_CONFIG_PATH.exists():
        config_text = ai_runtime.RUNTIME_AI_CONFIG_PATH.read_text(encoding="utf-8")
        assert "sk-secret" not in config_text
        assert "provider" not in json.loads(config_text)


def test_legacy_provider_block_in_config_file_is_migrated(temp_runtime):
    # Pre-split layout: provider block lives inside the model-config file.
    ai_runtime.RUNTIME_AI_CONFIG_PATH.write_text(
        json.dumps({"model": "qwen2.5-coder:7b-instruct", "source": "user",
                    "provider": {"gemini_api_key": "legacy-key",
                                 "ocr_vision_model": "gemini/legacy"}}),
        encoding="utf-8",
    )
    # Reading still sees the legacy secret (backward compatible).
    cfg = ai_runtime.get_ai_provider_config()
    assert cfg["configured"]["gemini_api_key"] is True
    assert cfg["ocr_vision_model"] == "gemini/legacy"

    # Any write migrates the secret out of the config file into the secrets file.
    client = TestClient(app)
    client.put("/api/ai/config", json={"ollama_base_url": "http://x:11434"})
    config = json.loads(ai_runtime.RUNTIME_AI_CONFIG_PATH.read_text(encoding="utf-8"))
    assert "provider" not in config  # migrated out
    assert config["model"] == "qwen2.5-coder:7b-instruct"  # model choice preserved
    secrets = json.loads(ai_runtime.RUNTIME_AI_SECRETS_PATH.read_text(encoding="utf-8"))
    assert secrets["provider"]["gemini_api_key"] == "legacy-key"
