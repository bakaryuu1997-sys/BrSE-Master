import httpx
import pytest
from mcp.server.fastmcp.exceptions import ToolError

from brse_mcp.config import Settings
from tests.conftest import Harness, json_route

OPERATIONS = [
    {"id": "1", "type": "qna", "title": "Search condition?", "status": "Draft", "project_name": "Alpha", "owner": "An"},
    {"id": "2", "type": "bug", "title": "Login fails", "status": "Sent", "project_name": "Alpha", "owner": "Binh"},
    {"id": "3", "type": "qna", "title": "Batch timing", "status": "Answered", "project_name": "Beta", "owner": "An"},
]


async def test_list_operations_filters_and_pages():
    h = Harness(json_route(OPERATIONS))

    only_alpha_qna = await h.call("list_operations", type="qna", project="alpha")
    assert [item["id"] for item in only_alpha_qna["items"]] == ["1"]

    by_query = await h.call("list_operations", query="login")
    assert [item["id"] for item in by_query["items"]] == ["2"]

    page = await h.call("list_operations", limit=2)
    assert (page["total"], page["returned"], page["has_more"]) == (3, 2, True)
    rest = await h.call("list_operations", limit=2, offset=2)
    assert (rest["returned"], rest["has_more"]) == (1, False)


async def test_lists_return_previews_but_get_returns_the_full_text():
    long_body = "x" * 5000
    h = Harness(json_route([{"id": "m1", "title": "T", "body_markdown": long_body}]))

    listing = await h.call("search_minutes")
    assert len(listing["items"][0]["body_markdown"]) < 400
    assert "truncated" in listing["items"][0]["body_markdown"]

    h = Harness(json_route({"id": "m1", "body_markdown": long_body}))
    assert (await h.call("get_minutes", minutes_id="m1"))["body_markdown"] == long_body


async def test_get_tools_cap_very_large_text_at_max_chars():
    h = Harness(json_route({"id": "m1", "body_markdown": "y" * 500}), Settings(max_chars=100))

    body = (await h.call("get_minutes", minutes_id="m1"))["body_markdown"]

    assert body.startswith("y" * 100)
    assert "truncated 400 chars" in body


async def test_ids_that_try_to_change_the_route_never_reach_the_api():
    h = Harness(json_route({}))

    for name, args in [
        ("get_minutes", {"minutes_id": "../settings/backup"}),
        ("get_todo_state", {"project_id": "a/b"}),
        ("get_note", {"note_id": "x?y"}),
        ("get_knowledge", {"item_id": ".."}),
        ("evaluate_todo_rules", {"project_id": "../../x"}),
        ("search_minutes", {"project_id": "a b"}),
    ]:
        with pytest.raises(ToolError, match="Invalid"):
            await h.call(name, **args)

    assert h.requests == []


async def test_project_name_is_encoded_as_a_single_path_segment():
    h = Harness(json_route({"gate": "ok"}))

    await h.call("get_release_gate", project_name="Sensei Hub/QA")

    assert h.requests[0].url.raw_path.decode().endswith("/operations/release-gates/Sensei%20Hub%2FQA")


async def test_search_glossary_passes_filters_and_uses_the_api_total():
    h = Harness(json_route({"items": [{"id": "g1", "english": "Requirement"}], "total": 2198}))

    result = await h.call("search_glossary", search="req", category="Requirement", role="BrSE", page=2, size=5)

    params = dict(h.requests[0].url.params)
    assert params == {"search": "req", "category": "Requirement", "role": "BrSE", "page": "2", "size": "5"}
    assert (result["total"], result["returned"], result["has_more"]) == (2198, 1, True)


async def test_search_minutes_forwards_filters():
    h = Harness(json_route([]))

    await h.call("search_minutes", project_id="p1", query="kickoff", status="completed", limit=10, offset=20)

    assert dict(h.requests[0].url.params) == {
        "project_id": "p1", "q": "kickoff", "status": "completed", "limit": "10", "offset": "20",
    }


async def test_unauthorized_reaches_the_model_with_a_fix():
    h = Harness(lambda request: httpx.Response(401, json={"detail": "x"}))

    with pytest.raises(ToolError, match="BRSE_API_SECRET"):
        await h.call("list_projects")


async def test_every_tool_only_issues_get_requests():
    h = Harness(json_route([]))
    names = [tool.name for tool in await h.mcp.list_tools()]
    args = {
        "get_release_gate": {"project_name": "P"},
        "get_todo_state": {"project_id": "p"},
        "evaluate_todo_rules": {"project_id": "p"},
        "get_minutes": {"minutes_id": "m"},
        "get_note": {"note_id": "n"},
        "get_knowledge": {"item_id": "k"},
        "search_notes": {"q": "x"},
        "search_knowledge": {"q": "x"},
    }

    for name in names:
        try:
            await h.mcp.call_tool(name, args.get(name, {}))
        except ToolError:
            pass  # a fake that returns [] may not satisfy every shape; only the HTTP verb matters here

    assert len(h.requests) >= len(names) - 1
    assert {request.method for request in h.requests} == {"GET"}
