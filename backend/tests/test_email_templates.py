from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_email_template_library_has_expanded_template_set() -> None:
    response = client.get("/api/email-templates")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 24
    assert any(template["id"] == "meeting-minutes-send" for template in data)
    assert any(template["id"] == "requirement-change-confirmation" for template in data)


def test_confirmation_template_supports_multiline_inputs() -> None:
    response = client.get("/api/email-templates/confirmation-search-condition")

    assert response.status_code == 200
    variables = {variable["key"]: variable for variable in response.json()["variables"]}
    assert variables["confirmation_item_1"]["input_type"] == "textarea"
    assert variables["confirmation_item_2"]["input_type"] == "textarea"
