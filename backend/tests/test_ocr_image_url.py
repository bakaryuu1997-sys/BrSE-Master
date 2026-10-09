import asyncio

import httpx
import pytest
from fastapi import HTTPException

# OCR image-url fetch + SSRF helpers moved to ai_ocr.py; patch/call them there.
from app.api.routes import ai_ocr as ai


class _FakeResp:
    def __init__(self, content=b"hello", headers=None, error=None, is_redirect=False):
        self.content = content
        self.headers = headers if headers is not None else {"content-type": "image/png"}
        self._error = error
        self.is_redirect = is_redirect

    def raise_for_status(self):
        if self._error:
            raise self._error


class _FakeClient:
    def __init__(self, responses=None, get_error=None):
        if responses is None:
            self._responses = []
        elif isinstance(responses, list):
            self._responses = list(responses)
        else:
            self._responses = [responses]
        self._get_error = get_error
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        self.calls.append(url)
        if self._get_error:
            raise self._get_error
        if not self._responses:
            raise AssertionError("unexpected extra get() call")
        return self._responses.pop(0)


def _patch_client(monkeypatch, responses=None, get_error=None):
    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda *a, **k: _FakeClient(responses, get_error))


def _patch_resolver(monkeypatch, ips=("93.184.216.34",)):
    """Avoid real DNS in tests; default to a public IP so the SSRF guard passes."""
    monkeypatch.setattr(ai, "_resolve_host_ips", lambda host, port: list(ips))


# --- SSRF IP classification (pure, no network) ---

@pytest.mark.parametrize(
    "ip",
    ["127.0.0.1", "10.0.0.5", "192.168.1.10", "172.16.0.1", "169.254.169.254", "::1", "fe80::1", "0.0.0.0", "garbage"],
)
def test_is_blocked_ip_blocks_internal_and_invalid(ip):
    assert ai._is_blocked_ip(ip) is True


@pytest.mark.parametrize("ip", ["93.184.216.34", "8.8.8.8", "1.1.1.1"])
def test_is_blocked_ip_allows_public(ip):
    assert ai._is_blocked_ip(ip) is False


# --- fetch_image_url_as_base64 behaviour ---

def test_fetch_image_url_success_returns_data_uri(monkeypatch):
    _patch_resolver(monkeypatch)
    _patch_client(monkeypatch, _FakeResp(content=b"hello", headers={"content-type": "image/png"}))
    result = asyncio.run(ai.fetch_image_url_as_base64("https://example.com/a.png"))
    assert result == "data:image/png;base64,aGVsbG8="


def test_fetch_image_url_rejects_non_http():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("ftp://example.com/a.png"))
    assert exc.value.status_code == 400


def test_fetch_image_url_rejects_non_image_content_type(monkeypatch):
    _patch_resolver(monkeypatch)
    _patch_client(monkeypatch, _FakeResp(headers={"content-type": "text/html"}))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("https://example.com/page"))
    assert exc.value.status_code == 415


def test_fetch_image_url_rejects_oversize(monkeypatch):
    _patch_resolver(monkeypatch)
    big = b"x" * (ai.OCR_IMAGE_URL_MAX_BYTES + 1)
    _patch_client(monkeypatch, _FakeResp(content=big, headers={"content-type": "image/jpeg"}))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("https://example.com/big.jpg"))
    assert exc.value.status_code == 413


def test_fetch_image_url_wraps_network_error(monkeypatch):
    _patch_resolver(monkeypatch)
    _patch_client(monkeypatch, get_error=httpx.ConnectError("boom"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("https://example.com/a.png"))
    assert exc.value.status_code == 502


def test_fetch_image_url_blocks_private_host(monkeypatch):
    _patch_resolver(monkeypatch, ips=("127.0.0.1",))
    _patch_client(monkeypatch, _FakeResp())
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("http://malicious.internal/a.png"))
    assert exc.value.status_code == 400


def test_fetch_image_url_follows_redirect_then_succeeds(monkeypatch):
    _patch_resolver(monkeypatch)
    redirect = _FakeResp(headers={"location": "https://example.com/final.png"}, is_redirect=True)
    final = _FakeResp(content=b"hello", headers={"content-type": "image/png"})
    _patch_client(monkeypatch, [redirect, final])
    result = asyncio.run(ai.fetch_image_url_as_base64("https://example.com/start.png"))
    assert result == "data:image/png;base64,aGVsbG8="


def test_fetch_image_url_blocks_redirect_to_internal(monkeypatch):
    calls = {"n": 0}

    def resolver(host, port):
        calls["n"] += 1
        return ["93.184.216.34"] if calls["n"] == 1 else ["10.0.0.5"]

    monkeypatch.setattr(ai, "_resolve_host_ips", resolver)
    redirect = _FakeResp(headers={"location": "http://internal.local/secret.png"}, is_redirect=True)
    _patch_client(monkeypatch, [redirect, _FakeResp()])
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("https://example.com/start.png"))
    assert exc.value.status_code == 400


def test_fetch_image_url_enforces_redirect_limit(monkeypatch):
    _patch_resolver(monkeypatch)
    redirects = [
        _FakeResp(headers={"location": "https://example.com/next.png"}, is_redirect=True)
        for _ in range(ai.OCR_IMAGE_URL_MAX_REDIRECTS + 1)
    ]
    _patch_client(monkeypatch, redirects)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ai.fetch_image_url_as_base64("https://example.com/start.png"))
    assert exc.value.status_code == 502
