from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_knowledge_crud_and_search_flow() -> None:
    payload = {
        "title": "Deploy checklist pytest",
        "content": "Staging deploy requires smoke test and customer notice.",
        "category": "process",
        "project_id": "pytest-project",
    }

    create_response = client.post("/api/knowledge/", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["title"] == payload["title"]
    assert created["category"] == "process"

    item_id = created["id"]

    search_response = client.get("/api/knowledge/search", params={"q": "Deploy", "project_id": "pytest-project"})
    assert search_response.status_code == 200
    assert any(item["id"] == item_id for item in search_response.json())

    detail_response = client.get(f"/api/knowledge/{item_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["content"] == payload["content"]

    update_response = client.put(
        f"/api/knowledge/{item_id}",
        json={"title": "Deploy checklist updated", "category": "spec"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Deploy checklist updated"
    assert updated["category"] == "spec"
    assert updated["content"] == payload["content"]

    delete_response = client.delete(f"/api/knowledge/{item_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Deleted"
