from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_stt_status_endpoint_returns_local_whisper_config() -> None:
    response = client.get("/api/stt/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["provider"] == "local-whisper"
    assert data["ready"] is True
    assert data["model"]
