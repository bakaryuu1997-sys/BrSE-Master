from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_operation_record_crud_flow() -> None:
    payload = {
        "type": "qna",
        "title": "Confirm search condition test",
        "status": "Open",
        "priority": "High",
        "owner": "BrSE",
        "due_date": "2026-05-10",
        "customer_owner": "Customer PM",
        "project_name": "Localhost Project",
        "field_a": "Should deleted data be included?",
        "field_b": "Search API implementation needs a decision.",
        "field_c": "",
        "field_d": "",
        "field_e": "pytest-created",
    }

    create_response = client.post("/api/operations/", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == payload["title"]
    assert created["field_a"] == payload["field_a"]

    operation_id = created["id"]
    update_payload = {**payload, "status": "Answered", "field_c": "Exclude deleted data."}
    update_response = client.put(f"/api/operations/{operation_id}", json=update_payload)
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "Answered"
    assert updated["field_c"] == "Exclude deleted data."

    list_response = client.get("/api/operations/")
    assert list_response.status_code == 200
    assert any(item["id"] == operation_id for item in list_response.json())

    delete_response = client.delete(f"/api/operations/{operation_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"


def test_operation_auxiliary_data_crud_flow() -> None:
    decision_payload = {
        "title": "Release date confirmed",
        "decision": "Customer approved moving release to Wednesday.",
        "owner": "BrSE",
        "decision_date": "2026-05-20",
        "impact": "Update release note and UAT schedule.",
        "evidence_url": "meeting://pytest",
        "related_record_id": "",
        "project_name": "Localhost Project",
    }
    decision_response = client.post("/api/operations/decision-logs", json=decision_payload)
    assert decision_response.status_code == 201
    decision = decision_response.json()
    assert decision["title"] == decision_payload["title"]
    decision_id = decision["id"]

    decision_update = {**decision_payload, "owner": "PM"}
    assert client.put(f"/api/operations/decision-logs/{decision_id}", json=decision_update).json()["owner"] == "PM"
    assert any(item["id"] == decision_id for item in client.get("/api/operations/decision-logs").json())

    gate_payload = {
        "project_name": "Localhost Project",
        "release_date": "2026-05-30",
        "uat_start": "2026-05-21",
        "uat_end": "2026-05-24",
        "qna_closed": True,
        "critical_bug_closed": False,
        "cr_reviewed": True,
        "uat_passed": False,
        "evidence_ready": True,
        "customer_approved": False,
        "deploy_note_ready": True,
        "note": "pytest gate",
    }
    gate_response = client.put("/api/operations/release-gates/Localhost%20Project", json=gate_payload)
    assert gate_response.status_code == 200
    assert gate_response.json()["release_date"] == "2026-05-30"
    assert client.get("/api/operations/release-gates/Localhost%20Project").json()["note"] == "pytest gate"

    dependency_payload = {
        "project_name": "Localhost Project",
        "source_id": "source-op",
        "target_id": "target-op",
        "relation": "blocks",
        "note": "pytest dependency",
    }
    dependency_response = client.post("/api/operations/dependency-links", json=dependency_payload)
    assert dependency_response.status_code == 201
    dependency_id = dependency_response.json()["id"]
    assert client.put(f"/api/operations/dependency-links/{dependency_id}", json={**dependency_payload, "relation": "related"}).json()["relation"] == "related"
    assert any(item["id"] == dependency_id for item in client.get("/api/operations/dependency-links").json())

    test_payload = {
        "project_name": "Localhost Project",
        "requirement": "Search excludes deleted data",
        "operation_id": "source-op",
        "test_case": "Run search with deleted fixture",
        "expected_result": "Deleted rows are hidden",
        "owner": "QA",
        "uat_status": "In Progress",
        "evidence_url": "",
        "last_run_date": "2026-05-20",
        "note": "pytest test",
    }
    test_response = client.post("/api/operations/test-matrix", json=test_payload)
    assert test_response.status_code == 201
    test_id = test_response.json()["id"]
    assert client.put(f"/api/operations/test-matrix/{test_id}", json={**test_payload, "uat_status": "Passed"}).json()["uat_status"] == "Passed"
    assert any(item["id"] == test_id for item in client.get("/api/operations/test-matrix").json())

    assert client.delete(f"/api/operations/decision-logs/{decision_id}").status_code == 200
    assert client.delete(f"/api/operations/dependency-links/{dependency_id}").status_code == 200
    assert client.delete(f"/api/operations/test-matrix/{test_id}").status_code == 200


def test_report_record_crud_flow() -> None:
    payload = {
        "report_date": "2026-05-07",
        "project_name": "Localhost Project",
        "owner": "BrSE",
        "tasks_done": "[\"Implemented report CRUD test\"]",
        "tasks_in_progress": "Phase 2 hardening",
        "tasks_tomorrow": "Knowledge Base polish",
        "blockers": "",
        "progress_percent": "80%",
        "generated_jp": "【日次報告】pytest-created",
    }

    create_response = client.post("/api/reports/", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["project_name"] == payload["project_name"]
    assert created["generated_jp"] == payload["generated_jp"]

    report_id = created["id"]
    update_payload = {**payload, "progress_percent": "85%", "blockers": "特になし"}
    update_response = client.put(f"/api/reports/{report_id}", json=update_payload)
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["progress_percent"] == "85%"
    assert updated["blockers"] == "特になし"

    list_response = client.get("/api/reports/")
    assert list_response.status_code == 200
    assert any(item["id"] == report_id for item in list_response.json())

    delete_response = client.delete(f"/api/reports/{report_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"


def test_evidence_link_stays_stable_across_todo_operations_and_reports() -> None:
    meeting_id = "pytest-meeting-evidence"
    operation_id = "pytest-operation-evidence"
    todo_project_id = "pytest-evidence-project"
    todo_item_id = "pytest-evidence-todo"
    evidence_url = f"meeting://{meeting_id}#action=2"
    evidence_payload = [
        {
            "url": evidence_url,
            "label": "Customer approval quote",
            "meeting_id": meeting_id,
            "operation_id": operation_id,
        }
    ]

    project_payload = {
        "id": todo_project_id,
        "name": "Evidence Stability Project",
        "preset": "standard",
        "active_phase": "4. Tracking & Reporting",
        "archived_at": "",
    }
    todo_payload = {
        "id": todo_item_id,
        "phase": "4. Tracking & Reporting",
        "title": "Confirm release evidence",
        "detail": "Evidence link from meeting action must remain stable.",
        "priority": "P1",
        "presets": ["brse"],
        "done": False,
        "note": "pytest evidence flow",
        "deadline": "2026-05-21",
        "evidence_url": evidence_url,
        "evidences": evidence_payload,
        "operation_id": operation_id,
        "source": "meeting",
        "meeting_id": meeting_id,
        "meeting_title": "Release approval meeting",
        "action_index": 2,
        "updated_at_client": "2026-05-20T10:00:00.000Z",
    }

    state_response = client.put(
        f"/api/todos/projects/{todo_project_id}/state",
        json={"project": project_payload, "items": [todo_payload]},
    )
    assert state_response.status_code == 200
    state_todo = state_response.json()["items"][0]
    assert state_todo["evidence_url"] == evidence_url
    assert state_todo["evidences"] == evidence_payload
    assert state_todo["operation_id"] == operation_id
    assert state_todo["meeting_id"] == meeting_id
    assert state_todo["action_index"] == 2

    update_response = client.put(
        f"/api/todos/projects/{todo_project_id}/items/{todo_item_id}",
        json={"done": True, "note": "validated without changing evidence"},
    )
    assert update_response.status_code == 200
    updated_todo = update_response.json()
    assert updated_todo["evidence_url"] == evidence_url
    assert updated_todo["evidences"] == evidence_payload
    assert updated_todo["operation_id"] == operation_id
    assert updated_todo["meeting_id"] == meeting_id

    listed_todo = client.get(f"/api/todos/projects/{todo_project_id}/state").json()["items"][0]
    assert listed_todo["evidence_url"] == evidence_url
    assert listed_todo["evidences"] == evidence_payload

    decision_payload = {
        "title": "Release evidence accepted",
        "decision": "Customer approval recorded from meeting action.",
        "owner": "BrSE",
        "decision_date": "2026-05-20",
        "impact": "Proceed with release gate.",
        "evidence_url": evidence_url,
        "related_record_id": operation_id,
        "project_name": project_payload["name"],
    }
    decision_response = client.post("/api/operations/decision-logs", json=decision_payload)
    assert decision_response.status_code == 201
    decision = decision_response.json()
    decision_id = decision["id"]
    assert decision["evidence_url"] == evidence_url
    assert decision["related_record_id"] == operation_id

    decision_update = {**decision_payload, "owner": "PM"}
    updated_decision = client.put(f"/api/operations/decision-logs/{decision_id}", json=decision_update).json()
    assert updated_decision["evidence_url"] == evidence_url
    assert updated_decision["related_record_id"] == operation_id
    assert any(
        item["id"] == decision_id
        and item["evidence_url"] == evidence_url
        and item["related_record_id"] == operation_id
        for item in client.get("/api/operations/decision-logs").json()
    )

    matrix_payload = {
        "project_name": project_payload["name"],
        "requirement": "Evidence link remains stable",
        "operation_id": operation_id,
        "test_case": "Open report evidence URL from meeting action",
        "expected_result": "Same evidence URL is visible",
        "owner": "QA",
        "uat_status": "In Progress",
        "evidence_url": evidence_url,
        "last_run_date": "2026-05-20",
        "note": "pytest evidence matrix",
    }
    matrix_response = client.post("/api/operations/test-matrix", json=matrix_payload)
    assert matrix_response.status_code == 201
    matrix_item = matrix_response.json()
    matrix_id = matrix_item["id"]
    assert matrix_item["evidence_url"] == evidence_url
    assert matrix_item["operation_id"] == operation_id

    updated_matrix = client.put(
        f"/api/operations/test-matrix/{matrix_id}",
        json={**matrix_payload, "uat_status": "Passed"},
    ).json()
    assert updated_matrix["evidence_url"] == evidence_url
    assert updated_matrix["operation_id"] == operation_id
    assert any(
        item["id"] == matrix_id
        and item["evidence_url"] == evidence_url
        and item["operation_id"] == operation_id
        for item in client.get("/api/operations/test-matrix").json()
    )

    report_payload = {
        "report_date": "2026-05-20",
        "project_name": project_payload["name"],
        "owner": "BrSE",
        "tasks_done": f"[\"Confirmed evidence link {evidence_url}\"]",
        "tasks_in_progress": "Release evidence review",
        "tasks_tomorrow": "Customer release follow-up",
        "blockers": "",
        "progress_percent": "90%",
        "generated_jp": f"【エビデンス】{evidence_url}",
    }
    report_response = client.post("/api/reports/", json=report_payload)
    assert report_response.status_code == 200
    report = report_response.json()
    report_id = report["id"]
    assert evidence_url in report["tasks_done"]
    assert evidence_url in report["generated_jp"]

    updated_report = client.put(
        f"/api/reports/{report_id}",
        json={**report_payload, "progress_percent": "95%"},
    ).json()
    assert evidence_url in updated_report["tasks_done"]
    assert evidence_url in updated_report["generated_jp"]
    assert any(
        item["id"] == report_id and evidence_url in item["generated_jp"]
        for item in client.get("/api/reports/").json()
    )

    assert client.delete(f"/api/reports/{report_id}").status_code == 200
    assert client.delete(f"/api/operations/decision-logs/{decision_id}").status_code == 200
    assert client.delete(f"/api/operations/test-matrix/{matrix_id}").status_code == 200
    assert client.delete(f"/api/todos/projects/{todo_project_id}").status_code == 200
