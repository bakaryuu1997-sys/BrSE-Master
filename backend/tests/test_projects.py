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


def test_put_unknown_project_id_creates_it_so_local_projects_can_sync() -> None:
    project_id = "todo-pytest-upsert"
    try:
        response = client.put(
            f"/api/projects/{project_id}",
            json={"name": "Local-only project", "customer_name": "Acme"},
        )
        assert response.status_code == 200
        assert response.json()["id"] == project_id
        listed = [p["id"] for p in client.get("/api/projects").json()]
        assert project_id in listed

        again = client.put(f"/api/projects/{project_id}", json={"health_status": "Red"})
        assert again.status_code == 200
        assert again.json()["health_status"] == "Red"
        assert again.json()["name"] == "Local-only project"
    finally:
        client.delete(f"/api/projects/{project_id}")


def test_put_unknown_project_without_name_or_with_long_id_is_rejected() -> None:
    assert client.put("/api/projects/does-not-exist", json={"health_status": "Red"}).status_code == 404
    assert client.put("/api/projects/" + "x" * 40, json={"name": "Too long id"}).status_code == 422
