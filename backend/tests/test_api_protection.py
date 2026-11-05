from fastapi.testclient import TestClient
import pytest

from app.core.config import settings
from app.main import app


SENSITIVE_ENDPOINTS = [
    ("GET", "/api/command-center"),
    ("POST", "/api/settings/backup"),
    ("GET", "/api/projects"),
    ("GET", "/api/knowledge"),
    ("POST", "/api/ai/chat"),
    ("POST", "/api/ai/ocr"),
    ("GET", "/api/ai/config"),
    ("PUT", "/api/ai/config"),
    ("GET", "/api/client-state/entry/brse.security.matrix"),
    ("POST", "/api/meetings/upload"),
    ("GET", "/api/meetings/history"),
    ("GET", "/api/meeting-minutes"),
    ("GET", "/api/operations"),
    ("POST", "/api/operations"),
    ("GET", "/api/todos/projects"),
    ("POST", "/api/todos/projects"),
    ("GET", "/api/reports/"),
    ("POST", "/api/reports/"),
    # Sub-routes of /api/health are NOT public: the public list is exact-match only.
    ("GET", "/api/health/db/inspect/client_state"),
    ("POST", "/api/health/self-heal"),
    ("POST", "/api/memos/images"),
    ("GET", "/api/memos/images/2026/11/none.png"),
]

PUBLIC_ENDPOINTS = [
    ("GET", "/api/health"),
    ("GET", "/api/health/db"),
    ("GET", "/api/health/deep"),
    ("GET", "/api/ai/status"),
]


def request(client: TestClient, method: str, path: str, **kwargs):
    return client.request(method, path, **kwargs)

def test_api_protection_gate(monkeypatch) -> None:
    client = TestClient(app)
    # 1. Test when BRSE_API_SECRET is disabled (empty string)
    monkeypatch.setattr(settings, "brse_api_secret", "")
    
    response = client.get("/api/command-center")
    assert response.status_code != 401

    # 2. Test when BRSE_API_SECRET is enabled
    monkeypatch.setattr(settings, "brse_api_secret", "super-secret-gate-token")

    # Call without token header
    response = client.get("/api/command-center")
    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized: Invalid BrSE Personal Token"

    # Call with wrong token
    response = client.get("/api/command-center", headers={"X-BrSE-Token": "wrong-token"})
    assert response.status_code == 401

    # Call with correct token
    response = client.get("/api/command-center", headers={"X-BrSE-Token": "super-secret-gate-token"})
    assert response.status_code != 401


@pytest.mark.parametrize(("method", "path"), SENSITIVE_ENDPOINTS)
def test_sensitive_endpoint_matrix_requires_token_when_secret_configured(monkeypatch, method: str, path: str) -> None:
    client = TestClient(app)
    monkeypatch.setattr(settings, "brse_api_secret", "super-secret-gate-token")

    assert request(client, method, path).status_code == 401
    assert request(client, method, path, headers={"X-BrSE-Token": "wrong-token"}).status_code == 401
    assert request(client, method, path, headers={"X-BrSE-Token": "super-secret-gate-token"}).status_code != 401


@pytest.mark.parametrize(("method", "path"), PUBLIC_ENDPOINTS)
def test_public_endpoint_matrix_stays_open_when_secret_configured(monkeypatch, method: str, path: str) -> None:
    client = TestClient(app)
    monkeypatch.setattr(settings, "brse_api_secret", "super-secret-gate-token")

    assert request(client, method, path).status_code != 401


@pytest.mark.parametrize(("method", "path"), SENSITIVE_ENDPOINTS)
def test_remote_sensitive_endpoint_requires_configured_secret(monkeypatch, method: str, path: str) -> None:
    client = TestClient(app)
    monkeypatch.setattr(settings, "brse_api_secret", "")

    response = request(client, method, path, headers={"X-Forwarded-For": "203.0.113.10"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized: Remote access detected but BRSE_API_SECRET is not configured on the server."
