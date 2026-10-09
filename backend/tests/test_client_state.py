from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_client_state_entry_round_trip() -> None:
    key = "brse.activeProjectId.v1"
    payload = {"key": key, "value": "pytest-project"}

    put_response = client.put(f"/api/client-state/entry/{key}", json=payload)
    assert put_response.status_code == 200
    assert put_response.json()["value"] == "pytest-project"

    get_response = client.get(f"/api/client-state/entry/{key}")
    assert get_response.status_code == 200
    assert get_response.json()["key"] == key
    assert get_response.json()["value"] == "pytest-project"


def test_client_state_rejects_non_brse_keys() -> None:
    response = client.put(
        "/api/client-state/entry/external.key",
        json={"key": "external.key", "value": "nope"},
    )
    assert response.status_code == 400


def test_missing_client_state_entry_returns_empty_value() -> None:
    key = "brse.missing.value"
    response = client.get(f"/api/client-state/entry/{key}")
    assert response.status_code == 200
    assert response.json()["key"] == key
    assert response.json()["value"] == ""
