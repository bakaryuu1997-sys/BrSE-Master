"""Runtime AI model selection for the local 9router lane."""

from __future__ import annotations

import json
from pathlib import Path

from app.core.config import settings


RUNTIME_AI_CONFIG_PATH = Path(__file__).resolve().parents[1] / "runtime_ai_config.json"
# Provider endpoints + API keys live in a SEPARATE file from the model choice so
# the model-config file never contains secrets (and could be tracked safely if
# desired). This file holds keys/URLs and must never be committed (see .gitignore).
RUNTIME_AI_SECRETS_PATH = Path(__file__).resolve().parents[1] / "runtime_ai_secrets.json"

LOCAL_DEFAULT_MODEL = "qwen2.5-coder:7b-instruct"

AI_MODEL_PRESETS = [
    {
        "id": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
        "label": "Nemotron 3 Super Free",
        "provider": "openrouter",
        "notes": "Current stable 9router default. Runtime-smoked for fast fallback chat.",
    },
    {
        "id": "cx/gpt-5.5",
        "label": "ChatGPT 5.5 Codex",
        "provider": "cx",
        "notes": "User-requested 9router CX lane. Keep visible even when smoke test reports red.",
    },
    {
        "id": LOCAL_DEFAULT_MODEL,
        "label": "Qwen 2.5 Coder (Ollama)",
        "provider": "ollama",
        "notes": "Verified local Ollama model for coding and BrSE workflows.",
    },
    {
        "id": "gemma4:12b",
        "label": "Gemma 4 12B (Ollama)",
        "provider": "ollama",
        "notes": "Installed local Ollama Gemma 4 12B lane. Stronger long-context option, but slower than Qwen on this machine.",
    },
    {
        "id": "gemini/gemma-4-31b-it",
        "label": "Gemma 4 31B",
        "provider": "gemini",
        "notes": "Runtime-smoked 9router route for general BrSE summarization.",
    },
    {
        "id": "nvidia/google/gemma-4-31b-it",
        "label": "NVIDIA Gemma 4 31B",
        "provider": "nvidia",
        "notes": "Runtime-smoked NVIDIA route for Gemma 4 31B.",
    },
    {
        "id": "free-logic",
        "label": "9router Free Logic",
        "provider": "combo",
        "notes": "Runtime-smoked 9router route for fallback chat and summarization.",
    },
]

KNOWN_MODEL_IDS = {item["id"] for item in AI_MODEL_PRESETS}
DEFAULT_MODEL = (
    settings.ai_model_primary
    if settings.ai_model_primary in KNOWN_MODEL_IDS
    else settings.ai_model
    if settings.ai_model in KNOWN_MODEL_IDS
    else LOCAL_DEFAULT_MODEL
)


VALID_PROVIDERS = {"openrouter", "cx", "ollama", "gemini", "nvidia", "combo", "openai", "custom"}


def _read_custom_models() -> list[dict[str, str]]:
    """User-defined models persisted in the (non-secret) model-config file."""
    raw = _read_runtime_file().get("customModels")
    if not isinstance(raw, list):
        return []
    models: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        model_id = str(item.get("id", "")).strip()
        if not model_id:
            continue
        models.append(
            {
                "id": model_id,
                "label": str(item.get("label", "") or model_id).strip(),
                "provider": str(item.get("provider", "") or "custom").strip(),
                "notes": str(item.get("notes", "") or "User-added model.").strip(),
                "custom": True,
            }
        )
    return models


def get_known_ai_models() -> list[dict[str, str]]:
    """Curated presets first, then user-added custom models (deduped by id)."""
    seen: set[str] = set()
    models: list[dict[str, str]] = []
    for item in [*AI_MODEL_PRESETS, *_read_custom_models()]:
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        models.append(item)
    return models


def get_known_model_ids() -> set[str]:
    """All selectable ids = curated presets ∪ user-added custom models."""
    return KNOWN_MODEL_IDS | {m["id"] for m in _read_custom_models()}


def add_custom_model(model_id: str, label: str = "", provider: str = "custom", notes: str = "") -> dict[str, str]:
    """Add (or update) a user-defined model. Returns the stored entry."""
    normalized_id = (model_id or "").strip()
    if not normalized_id:
        raise ValueError("Model id is empty.")
    if normalized_id in KNOWN_MODEL_IDS:
        raise ValueError(f"'{normalized_id}' is already a built-in model.")
    provider_clean = (provider or "custom").strip().lower()
    if provider_clean not in VALID_PROVIDERS:
        provider_clean = "custom"

    data = _read_runtime_file()
    existing = data.get("customModels")
    custom = [m for m in existing if isinstance(m, dict)] if isinstance(existing, list) else []
    entry = {
        "id": normalized_id,
        "label": (label or normalized_id).strip(),
        "provider": provider_clean,
        "notes": (notes or "User-added model.").strip(),
    }
    custom = [m for m in custom if str(m.get("id", "")).strip() != normalized_id]
    custom.append(entry)
    data["customModels"] = custom
    _write_runtime_file(data)
    return {**entry, "custom": True}


def remove_custom_model(model_id: str) -> bool:
    """Remove a user-defined model. If it was the active model, fall back to default."""
    normalized_id = (model_id or "").strip()
    if not normalized_id:
        raise ValueError("Model id is empty.")
    data = _read_runtime_file()
    existing = data.get("customModels")
    custom = [m for m in existing if isinstance(m, dict)] if isinstance(existing, list) else []
    remaining = [m for m in custom if str(m.get("id", "")).strip() != normalized_id]
    if len(remaining) == len(custom):
        return False
    data["customModels"] = remaining
    # If the deleted model was selected, revert selection to the default model.
    if str(data.get("model", "")).strip() == normalized_id:
        data["model"] = DEFAULT_MODEL
        data["source"] = "user"
    _write_runtime_file(data)
    return True


def _read_runtime_file() -> dict:
    try:
        return json.loads(RUNTIME_AI_CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _write_runtime_file(data: dict) -> None:
    RUNTIME_AI_CONFIG_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _read_secrets_file() -> dict:
    try:
        return json.loads(RUNTIME_AI_SECRETS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _write_secrets_file(data: dict) -> None:
    RUNTIME_AI_SECRETS_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _read_provider() -> dict:
    """Provider overrides from the secrets file, with a one-time read fallback to a
    legacy ``provider`` block in the model-config file (pre-split format)."""
    provider = _read_secrets_file().get("provider")
    if isinstance(provider, dict) and provider:
        return dict(provider)
    legacy = _read_runtime_file().get("provider")
    return dict(legacy) if isinstance(legacy, dict) else {}


def get_selected_ai_model() -> str:
    parsed = _read_runtime_file()
    model = str(parsed.get("model", "")).strip()
    source = str(parsed.get("source", "")).strip()
    if model in get_known_model_ids():
        if source != "user" and model != DEFAULT_MODEL:
            return DEFAULT_MODEL
        return model
    return DEFAULT_MODEL


def set_selected_ai_model(model: str) -> str:
    normalized = model.strip()
    if not normalized:
        raise ValueError("Model is empty.")
    valid_ids = get_known_model_ids()
    if normalized not in valid_ids:
        supported = ", ".join(sorted(valid_ids))
        raise ValueError(f"Unsupported model '{normalized}'. Supported models: {supported}.")

    data = _read_runtime_file()
    data["model"] = normalized
    data["source"] = "user"
    _write_runtime_file(data)
    return normalized


# --- Runtime AI provider config (API keys / endpoints set from the extension) ---
# These mirror env settings but can be overridden at runtime and persisted to the
# gitignored secrets file (RUNTIME_AI_SECRETS_PATH). URL/model fields are returned
# in full; secrets are never exposed (only a boolean "configured" flag), and an
# empty secret on update means "keep".

PROVIDER_URL_FIELDS = (
    "openai_base_url",
    "nine_router_base_url",
    "ollama_base_url",
    "ocr_vision_model",
)
PROVIDER_SECRET_FIELDS = (
    "openai_api_key",
    "nine_router_api_key",
    "gemini_api_key",
)
PROVIDER_CONFIG_FIELDS = PROVIDER_URL_FIELDS + PROVIDER_SECRET_FIELDS


def apply_ai_provider_config() -> None:
    """Push the persisted provider overrides onto the live settings object."""
    provider = _read_provider()
    for field in PROVIDER_CONFIG_FIELDS:
        value = str(provider.get(field, "")).strip()
        if value:
            setattr(settings, field, value)


def get_ai_provider_config() -> dict:
    """Non-secret values in full + a 'configured' map for secrets (never exposed)."""
    provider = _read_provider()

    def effective(field: str) -> str:
        return str(provider.get(field, "") or getattr(settings, field, "")).strip()

    result: dict = {field: effective(field) for field in PROVIDER_URL_FIELDS}
    result["configured"] = {field: bool(effective(field)) for field in PROVIDER_SECRET_FIELDS}
    return result


def set_ai_provider_config(payload: dict) -> dict:
    """Merge an update into the persisted provider config and apply it live.

    Secrets/endpoints are written to the gitignored secrets file. Any legacy
    ``provider`` block left in the model-config file is migrated out so secrets
    never linger there.
    """
    provider = _read_provider()

    for field in PROVIDER_URL_FIELDS:
        if field in payload and payload[field] is not None:
            provider[field] = str(payload[field]).strip()

    for field in PROVIDER_SECRET_FIELDS:
        if field in payload and payload[field] is not None:
            value = str(payload[field]).strip()
            if value:  # empty secret = keep existing (do not wipe)
                provider[field] = value

    _write_secrets_file({"provider": provider})

    # Migrate: strip any legacy provider block from the model-config file so the
    # split is one-directional and secrets are not duplicated.
    config = _read_runtime_file()
    if "provider" in config:
        config.pop("provider", None)
        _write_runtime_file(config)

    apply_ai_provider_config()
    return get_ai_provider_config()
