from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_meeting_minutes_persist_and_search() -> None:
    payload = {
        "project_id": "pytest-minutes",
        "title": "UAT kickoff minutes",
        "meeting_date": "2026-05-13",
        "location": "Teams",
        "status": "draft",
        "template": "customer",
        "language": "ja-vi",
        "attendees": ["Tanaka", "Nguyen"],
        "agenda_items": [{"title": "UAT scope", "decision": "Freeze scope"}],
        "action_items": [{"content": "Send test evidence", "owner": "BrSE"}],
        "body_markdown": "# UAT kickoff\n\nDecision: Freeze scope",
    }

    created = client.post("/api/meeting-minutes", json=payload)
    assert created.status_code == 201
    minutes_id = created.json()["id"]

    listed = client.get("/api/meeting-minutes", params={"project_id": "pytest-minutes", "q": "Freeze", "limit": 10})
    assert listed.status_code == 200
    assert any(item["id"] == minutes_id for item in listed.json())

    updated = client.put(f"/api/meeting-minutes/{minutes_id}", json={"status": "review"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "review"


def test_email_history_supports_server_search_and_pagination() -> None:
    payload = {
        "project_id": "pytest-history",
        "template_id": "qa-reminder",
        "template_title": "Q&A reminder",
        "category": "qa",
        "subject": "Reminder about login Q&A",
        "body": "Please confirm authentication failure by tomorrow.",
        "variables": {"customer_name": "ABC"},
    }

    created = client.post("/api/email-history", json=payload)
    assert created.status_code == 200
    record_id = created.json()["id"]

    searched = client.get("/api/email-history", params={"project_id": "pytest-history", "q": "authentication", "limit": 1, "offset": 0})
    assert searched.status_code == 200
    assert searched.json()[0]["id"] == record_id

    fetched = client.get(f"/api/email-history/{record_id}")
    assert fetched.status_code == 200
    assert fetched.json()["variables"]["customer_name"] == "ABC"
