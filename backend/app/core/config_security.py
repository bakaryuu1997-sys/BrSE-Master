from __future__ import annotations

from typing import Protocol
from urllib.parse import urlparse


class SecuritySettings(Protocol):
    app_origin: str
    brse_api_secret: str
    jwt_secret: str
    jwt_refresh_secret: str
    openai_api_key: str
    nine_router_api_key: str


LOCAL_HOSTS = {"", "localhost", "127.0.0.1", "::1", "0.0.0.0"}
PLACEHOLDER_VALUES = {
    "jwt_secret": {"change-me-access-secret", "change-me", "jwt_secret", "secret"},
    "jwt_refresh_secret": {"change-me-refresh-secret", "change-me", "jwt_refresh_secret", "secret"},
    "openai_api_key": {"9router-key", "change-me", "openai_api_key", "sk-xxx"},
    "nine_router_api_key": {"9router-key", "change-me", "nine_router_api_key", "sk-xxx"},
}


def app_origin_is_local(app_origin: str) -> bool:
    parsed = urlparse(app_origin if "://" in app_origin else f"http://{app_origin}")
    host = (parsed.hostname or "").lower()
    return host in LOCAL_HOSTS


def requires_strong_runtime_secrets(config: SecuritySettings) -> bool:
    return bool((config.brse_api_secret or "").strip()) or not app_origin_is_local(config.app_origin)


def is_placeholder_secret(field: str, value: str) -> bool:
    cleaned = (value or "").strip()
    if not cleaned:
        return True
    lowered = cleaned.lower()
    if lowered in PLACEHOLDER_VALUES.get(field, set()):
        return True
    return lowered.startswith(("change-me", "placeholder", "todo-"))


def placeholder_secret_warnings(config: SecuritySettings) -> list[str]:
    if not requires_strong_runtime_secrets(config):
        return []

    warnings: list[str] = []
    for field in ("jwt_secret", "jwt_refresh_secret", "openai_api_key", "nine_router_api_key"):
        if is_placeholder_secret(field, getattr(config, field, "")):
            warnings.append(f"{field} uses a placeholder value while external/protected access is configured.")
    return warnings
