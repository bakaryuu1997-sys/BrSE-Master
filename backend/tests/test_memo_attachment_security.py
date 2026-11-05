"""Memo attachment upload/serve hardening: allow-list is enforced and active content is sandboxed."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


@pytest.fixture()
def client(monkeypatch, tmp_path) -> TestClient:
    monkeypatch.setattr(settings, "base_dir", str(tmp_path))
    monkeypatch.setattr(settings, "brse_api_secret", "")
    return TestClient(app)


def stored_files(tmp_path):
    return [path for path in tmp_path.rglob("*") if path.is_file()]


@pytest.mark.parametrize(
    ("name", "content_type"),
    [
        ("run.exe", "application/octet-stream"),
        ("script.js", "application/javascript"),
        ("payload.php", "application/x-php"),
        ("noextension", "application/octet-stream"),
        ("blob.bin", "application/octet-stream"),
    ],
)
def test_upload_rejects_types_outside_the_allow_list(client, tmp_path, name, content_type) -> None:
    response = client.post("/api/memos/images", files={"file": (name, b"x", content_type)})

    assert response.status_code == 415, name
    assert stored_files(tmp_path) == []


@pytest.mark.parametrize(
    ("name", "content_type", "suffix"),
    [
        ("notes.pdf", "application/pdf", ".pdf"),
        ("readme.md", "text/markdown", ".md"),
        ("sheet.xlsx", "application/octet-stream", ".xlsx"),  # allowed by extension when the type is generic
        ("shot.png", "image/png", ".png"),
    ],
)
def test_upload_accepts_documents_and_images(client, tmp_path, name, content_type, suffix) -> None:
    response = client.post("/api/memos/images", files={"file": (name, b"data", content_type)})

    assert response.status_code == 201, name
    assert response.json()["url"].endswith(suffix)
    assert len(stored_files(tmp_path)) == 1


def upload_and_fetch(client, name: str, content_type: str, body: bytes):
    created = client.post("/api/memos/images", files={"file": (name, body, content_type)})
    assert created.status_code == 201
    return client.get("/api" + created.json()["url"])


@pytest.mark.parametrize(
    ("name", "content_type", "body"),
    [
        ("page.html", "text/html", b"<script>alert(1)</script>"),
        ("logo.svg", "image/svg+xml", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"),
        ("disguised.pdf", "application/pdf", b"<!doctype html><script>alert(1)</script>"),
    ],
)
def test_active_content_is_served_sandboxed(client, name, content_type, body) -> None:
    response = upload_and_fetch(client, name, content_type, body)

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in response.headers["content-security-policy"]


def test_plain_files_get_nosniff_too(client) -> None:
    response = upload_and_fetch(client, "shot.png", "image/png", b"\x89PNG\r\n")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
