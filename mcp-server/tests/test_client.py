import httpx
import pytest

from brse_mcp.client import BrseApiError, BrseClient, path_segment, safe_id
from brse_mcp.config import Settings


def make_client(handler, **settings) -> BrseClient:
    return BrseClient(Settings(**settings), transport=httpx.MockTransport(handler))


async def test_sends_token_only_when_configured():
    seen = []
    ok = lambda request: (seen.append(request), httpx.Response(200, json={}))[1]  # noqa: E731

    await make_client(ok, api_secret="s3cret").get("/x")
    await make_client(ok).get("/x")

    assert seen[0].headers["x-brse-token"] == "s3cret"
    assert "x-brse-token" not in seen[1].headers


async def test_drops_empty_params():
    seen = []
    client = make_client(lambda r: (seen.append(r), httpx.Response(200, json={}))[1])

    await client.get("/x", {"a": "1", "b": None, "c": ""})

    assert dict(seen[0].url.params) == {"a": "1"}


async def test_follows_the_proxy_trailing_slash_redirect():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/glossary/"):
            return httpx.Response(308, headers={"location": "/api/glossary"})
        return httpx.Response(200, json={"ok": True})

    assert await make_client(handler, api_base="http://test/api").get("/glossary/") == {"ok": True}


async def test_unauthorized_explains_how_to_fix():
    with pytest.raises(BrseApiError) as caught:
        await make_client(lambda r: httpx.Response(401, json={"detail": "nope"})).get("/projects")

    assert caught.value.status == 401
    assert "BRSE_API_SECRET" in str(caught.value)


async def test_unreachable_server_gets_an_actionable_message():
    def refuse(request: httpx.Request):
        raise httpx.ConnectError("refused", request=request)

    with pytest.raises(BrseApiError) as caught:
        await make_client(refuse).get("/projects")

    assert "start-brse-stack" in str(caught.value)


async def test_not_found_and_server_errors_are_mapped():
    with pytest.raises(BrseApiError, match="Not found"):
        await make_client(lambda r: httpx.Response(404, json={"detail": "x"})).get("/a")
    with pytest.raises(BrseApiError, match="HTTP 500"):
        await make_client(lambda r: httpx.Response(500, json={"detail": "boom"})).get("/a")


@pytest.mark.parametrize("good", ["abc", "3c2698d5-af4e-4c1b-8012-c5edcc2e00a7", "todo-mq1x2-ab3de", "a.b_c:d-1"])
def test_safe_id_accepts_real_ids(good):
    assert safe_id(good) == good


@pytest.mark.parametrize("bad", ["", "  ", "../settings/backup", "a/b", "a b", "x?y=1", "a#b", "..", "a..b", "%2e%2e", "x" * 129])
def test_safe_id_rejects_anything_that_could_change_the_route(bad):
    with pytest.raises(BrseApiError):
        safe_id(bad)


def test_path_segment_encodes_one_segment():
    assert path_segment("Sensei Hub/QA") == "Sensei%20Hub%2FQA"
    with pytest.raises(BrseApiError):
        path_segment("  ")
