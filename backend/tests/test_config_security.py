from types import SimpleNamespace

from app.core.config_security import (
    app_origin_is_local,
    placeholder_secret_warnings,
    requires_strong_runtime_secrets,
)


def test_local_origin_without_api_secret_allows_placeholder_defaults() -> None:
    config = SimpleNamespace(
        app_origin="http://127.0.0.1:3010",
        brse_api_secret="",
        jwt_secret="change-me-access-secret",
        jwt_refresh_secret="change-me-refresh-secret",
        openai_api_key="9router-key",
        nine_router_api_key="9router-key",
    )

    assert app_origin_is_local(config.app_origin)
    assert not requires_strong_runtime_secrets(config)
    assert placeholder_secret_warnings(config) == []


def test_external_origin_warns_on_placeholder_runtime_secrets() -> None:
    config = SimpleNamespace(
        app_origin="https://brse.example.com",
        brse_api_secret="strong-local-token",
        jwt_secret="change-me-access-secret",
        jwt_refresh_secret="change-me-refresh-secret",
        openai_api_key="9router-key",
        nine_router_api_key="9router-key",
    )

    warnings = placeholder_secret_warnings(config)

    assert len(warnings) == 4
    assert any("jwt_secret" in warning for warning in warnings)
    assert any("jwt_refresh_secret" in warning for warning in warnings)
    assert any("openai_api_key" in warning for warning in warnings)
    assert any("nine_router_api_key" in warning for warning in warnings)


def test_configured_local_api_secret_requires_real_runtime_secrets() -> None:
    config = SimpleNamespace(
        app_origin="http://localhost:3010",
        brse_api_secret="strong-local-token",
        jwt_secret="real-access-secret",
        jwt_refresh_secret="real-refresh-secret",
        openai_api_key="real-openai-key",
        nine_router_api_key="real-router-key",
    )

    assert requires_strong_runtime_secrets(config)
    assert placeholder_secret_warnings(config) == []
