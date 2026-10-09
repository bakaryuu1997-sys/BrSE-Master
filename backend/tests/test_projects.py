from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_project_profile_execution_context_round_trip() -> None:
    payload = {
        "name": "Pytest Project Context",
        "customer_name": "Customer A",
        "brse_name": "BrSE",
        "pm_name": "PM",
        "timezone": "Asia/Tokyo",
        "language": "vi",
        "current_phase": "UAT",
        "health_status": "Yellow",
        "next_milestone_date": "2026-06-01",
        "stakeholders_json": '[{"role":"Client PO","name":"Sato","email":"sato@example.com"}]',
        "integrations_json": '{"jira":"https://jira.example.com/BRSE"}',
    }

    create_response = client.post("/api/projects", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["current_phase"] == "UAT"
    assert created["health_status"] == "Yellow"
    assert created["next_milestone_date"] == "2026-06-01"
    assert "Client PO" in created["stakeholders_json"]

    update_response = client.put(
        f"/api/projects/{created['id']}",
        json={"health_status": "Red", "current_phase": "Release"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["health_status"] == "Red"
    assert updated["current_phase"] == "Release"
