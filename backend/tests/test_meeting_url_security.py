import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.schemas.meeting import ProcessURLRequest
from app.services.url_processor import URLProcessor
from app.main import app

client = TestClient(app)


def test_process_url_request_valid_urls():
    req1 = ProcessURLRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert req1.url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    req2 = ProcessURLRequest(url="http://example.com/podcast.mp3")
    assert req2.url == "http://example.com/podcast.mp3"


@pytest.mark.parametrize(
    "invalid_url",
    [
        "file:///etc/passwd",
        "file:///C:/Windows/win.ini",
        "ftp://mirror.example.com/audio.mp3",
        "gopher://example.com",
        "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
        "javascript:alert(1)",
    ],
)
def test_process_url_request_rejects_dangerous_schemes(invalid_url):
    with pytest.raises(ValidationError) as exc_info:
        ProcessURLRequest(url=invalid_url)
    assert "Only http and https URLs are allowed" in str(exc_info.value)


@pytest.mark.parametrize(
    "malformed_url",
    [
        "",
        "   ",
        "http://",
        "https://",
        "https:///just/a/path",
    ],
)
def test_process_url_request_rejects_empty_or_missing_host(malformed_url):
    with pytest.raises(ValidationError) as exc_info:
        ProcessURLRequest(url=malformed_url)
    err = str(exc_info.value)
    assert "URL cannot be empty" in err or "missing host domain" in err or "Only http and https" in err


def test_url_processor_download_audio_rejects_non_http():
    processor = URLProcessor(upload_folder="/tmp")
    with pytest.raises(ValueError) as exc_info:
        processor.download_audio("file:///etc/shadow")
    assert "Invalid URL scheme 'file'" in str(exc_info.value)

    with pytest.raises(ValueError) as exc_info:
        processor.download_audio("ftp://files.example.com/test.mp3")
    assert "Invalid URL scheme 'ftp'" in str(exc_info.value)


def test_api_security_headers_present():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Request-ID" in response.headers
