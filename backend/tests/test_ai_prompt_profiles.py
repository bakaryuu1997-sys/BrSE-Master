from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def prompt_payload(name: str, *, project_id: str = "", is_default: bool = True) -> dict:
    return {
        "name": name,
        "use_case": "report",
        "system_prompt": f"{name}: Write concise BrSE output with project-specific tone.",
        "project_id": project_id,
        "customer_name": "Pytest Customer",
        "notes": "created by pytest",
        "is_default": is_default,
    }


def test_ai_prompt_profile_crud_and_resolve_project_default() -> None:
    project_id = "pytest-ai-profile-project"
    first = client.post("/api/ai/prompt-profiles", json=prompt_payload("first", project_id=project_id))
    assert first.status_code == 201
    first_id = first.json()["id"]

    second = client.post("/api/ai/prompt-profiles", json=prompt_payload("second", project_id=project_id))
    assert second.status_code == 201
    second_id = second.json()["id"]

    resolved = client.get(f"/api/ai/prompt-profiles/resolve?use_case=report&project_id={project_id}")
    assert resolved.status_code == 200
    assert resolved.json()["id"] == second_id
    assert resolved.json()["system_prompt"].startswith("second:")

    refreshed_first = client.get(f"/api/ai/prompt-profiles/resolve?use_case=report&prompt_profile_id={first_id}")
    assert refreshed_first.status_code == 200
    assert refreshed_first.json()["is_default"] is False

    updated = client.put(
        f"/api/ai/prompt-profiles/{first_id}",
        json={"is_default": True, "system_prompt": "first updated prompt for BrSE reports."},
    )
    assert updated.status_code == 200
    assert updated.json()["is_default"] is True

    resolved_again = client.get(f"/api/ai/prompt-profiles/resolve?use_case=report&project_id={project_id}")
    assert resolved_again.status_code == 200
    assert resolved_again.json()["id"] == first_id

    assert client.delete(f"/api/ai/prompt-profiles/{first_id}").status_code == 200
    assert client.delete(f"/api/ai/prompt-profiles/{second_id}").status_code == 200


def test_ai_prompt_profile_rejects_unknown_use_case() -> None:
    response = client.post(
        "/api/ai/prompt-profiles",
        json={
            "name": "bad",
            "use_case": "unknown",
            "system_prompt": "This prompt is long enough but the use case is invalid.",
            "is_default": True,
        },
    )
    assert response.status_code == 400
