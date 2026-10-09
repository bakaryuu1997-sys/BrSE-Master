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
