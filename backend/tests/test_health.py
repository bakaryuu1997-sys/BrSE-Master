from fastapi.testclient import TestClient

from app.main import app


def test_health_check() -> None:
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_deep_health_check_contains_resource_and_job_summary() -> None:
    client = TestClient(app)
    response = client.get("/api/health/deep")
    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "brse-assistant-api"
    assert payload["database"]["status"] == "ok"
    assert "projects" in payload["database"]["table_counts"]
    assert "disk" in payload["resources"]
    assert "memory" in payload["resources"]
    assert "cpu" in payload["resources"]
    assert "gpu" in payload["resources"]
    assert "usage_percent" in payload["resources"]["cpu"]
    assert "temperature_c" in payload["resources"]["gpu"]
    assert "meeting_jobs" in payload
    assert "warnings" in payload


def test_inspect_database_table() -> None:
    client = TestClient(app)
    # Valid table
    res = client.get("/api/health/db/inspect/client_state?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["table_name"] == "client_state"
    assert "columns" in data
    assert "rows" in data
    assert isinstance(data["rows"], list)

    # Invalid table
    res_err = client.get("/api/health/db/inspect/non_existent_table")
    assert res_err.status_code == 400
    assert "Unsupported table" in res_err.json()["detail"]


def test_self_heal_system() -> None:
    client = TestClient(app)
    res = client.post("/api/health/self-heal")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "actions" in data
    assert len(data["actions"]) >= 4
    assert any(a["step"] == "db_pool" for a in data["actions"])
    assert any(a["step"] == "stale_jobs" for a in data["actions"])
    assert any(a["step"] == "ai_runtime" for a in data["actions"])

