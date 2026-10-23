import io
import json
import zipfile
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_zip_buffer(entries: dict[str, str | bytes]) -> io.BytesIO:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in entries.items():
            if isinstance(content, str):
                zf.writestr(filename, content.encode("utf-8"))
            else:
                zf.writestr(filename, content)
    buffer.seek(0)
    return buffer


def test_restore_rejects_missing_database_dump():
    zip_buf = _create_zip_buffer({"dummy.txt": "hello"})
    response = client.post(
        "/api/settings/restore",
        files={"file": ("backup.brsebackup", zip_buf.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "missing database_dump.json" in response.json()["detail"]


def test_restore_rejects_zip_slip_path_traversal():
    # Attempting to escape into parent directories or root
    zip_buf = _create_zip_buffer({
        "database_dump.json": json.dumps({}),
        "../../evil.txt": "malicious content",
    })
    response = client.post(
        "/api/settings/restore",
        files={"file": ("backup.brsebackup", zip_buf.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "Path Traversal" in response.json()["detail"]


def test_restore_rejects_zip_slip_absolute_path():
    zip_buf = _create_zip_buffer({
        "database_dump.json": json.dumps({}),
        "/etc/cron.d/malicious": "malicious content",
    })
    response = client.post(
        "/api/settings/restore",
        files={"file": ("backup.brsebackup", zip_buf.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "Path Traversal" in response.json()["detail"]


def test_restore_accepts_valid_archive():
    zip_buf = _create_zip_buffer({
        "database_dump.json": json.dumps({}),
        "uploads/safe_note.txt": "safe file content",
    })
    response = client.post(
        "/api/settings/restore",
        files={"file": ("backup.brsebackup", zip_buf.getvalue(), "application/zip")},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
