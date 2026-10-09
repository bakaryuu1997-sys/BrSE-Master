from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_evaluate_todo_rule_payload_prioritizes_deadline_risk() -> None:
    response = client.post(
        "/api/todos/rules/evaluate",
        json={
            "today": "2026-05-19",
            "items": [
                {
                    "id": "future",
                    "phase": "1. Kick-off & Requirement",
                    "title": "Future task",
                    "priority": "P1",
                    "deadline": "2026-05-30",
                },
                {
                    "id": "overdue",
                    "phase": "5. Q&A & Change",
                    "title": "Overdue customer Q&A",
                    "priority": "P2",
                    "deadline": "2026-05-18",
                    "operation_id": "op-1",
                },
                {
                    "id": "done",
                    "phase": "2. Communication Setup",
                    "title": "Already done",
                    "priority": "P0",
                    "done": True,
                },
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["today"] == "2026-05-19"
    assert data["stats"]["total"] == 3
    assert data["stats"]["open"] == 2
    assert data["stats"]["done"] == 1
    assert data["stats"]["overdue"] == 1
    assert data["stats"]["p0"] == 1
    assert data["next_focus"][0]["id"] == "overdue"
    assert data["next_focus"][0]["computed_priority"] == "P0"
    assert "overdue" in data["next_focus"][0]["reasons"]
    assert "operation_linked" in data["next_focus"][0]["reasons"]


def test_evaluate_project_rules_reads_saved_state() -> None:
    project = client.post(
        "/api/todos/projects",
        json={
            "id": "rules-test-project",
            "name": "Rules Test Project",
            "preset": "standard",
            "active_phase": "5. Q&A & Change",
        },
    )
    assert project.status_code in {200, 201}

    state = client.put(
        "/api/todos/projects/rules-test-project/state",
        json={
            "project": {
                "id": "rules-test-project",
                "name": "Rules Test Project",
                "preset": "standard",
                "active_phase": "5. Q&A & Change",
            },
            "items": [
                {
                    "id": "today",
                    "phase": "5. Q&A & Change",
                    "title": "Answer today",
                    "priority": "P1",
                    "deadline": "2026-05-19",
                },
                {
                    "id": "later",
                    "phase": "6. Testing & UAT",
                    "title": "UAT later",
                    "priority": "P2",
                    "deadline": "2026-06-01",
                },
            ],
        },
    )
    assert state.status_code == 200

    response = client.get("/api/todos/projects/rules-test-project/rules?today=2026-05-19")

    assert response.status_code == 200
    data = response.json()
    assert data["project"]["id"] == "rules-test-project"
    assert data["stats"]["due_today"] == 1
    assert data["next_focus"][0]["id"] == "today"
    assert data["next_focus"][0]["risk"] == "due_today"
