import pytest

from brse_mcp.config import DEFAULT_API_BASE, Settings
from tests.conftest import Harness, json_route

EXPECTED_TOOLS = {
    "app_status", "list_projects", "list_operations", "list_decision_logs", "get_release_gate",
    "list_todo_projects", "get_todo_state", "evaluate_todo_rules", "search_minutes", "get_minutes",
    "list_meetings", "list_memos", "search_notes", "list_notes", "get_note", "search_knowledge",
    "get_knowledge", "search_glossary", "list_reports", "list_calendar_schedules", "list_email_history",
}


async def test_exposes_exactly_the_planned_read_tools():
    tools = await Harness(json_route({})).mcp.list_tools()

    assert {tool.name for tool in tools} == EXPECTED_TOOLS


async def test_every_tool_is_declared_read_only_and_described():
    tools = await Harness(json_route({})).mcp.list_tools()

    for tool in tools:
        assert tool.annotations is not None, tool.name
        assert tool.annotations.readOnlyHint is True, tool.name
        assert tool.annotations.destructiveHint is False, tool.name
        assert (tool.description or "").strip(), tool.name


async def test_instructions_warn_that_app_content_is_untrusted():
    instructions = Harness(json_route({})).mcp.instructions

    assert "untrusted" in instructions and "READ-ONLY" in instructions


def test_settings_defaults_use_the_canonical_proxy_not_port_8000():
    settings = Settings.from_env({})

    assert settings.api_base == DEFAULT_API_BASE == "http://127.0.0.1:3010/api"
    assert ":8000" not in settings.api_base
    assert settings.api_secret == "" and settings.mode == "read"


def test_settings_read_the_environment():
    settings = Settings.from_env({"BRSE_API_BASE": "http://127.0.0.1:3011/api/", "BRSE_API_SECRET": " tok ", "BRSE_MCP_MAX_CHARS": "50"})

    assert (settings.api_base, settings.api_secret, settings.max_chars) == ("http://127.0.0.1:3011/api", "tok", 50)


def test_write_mode_is_refused_until_it_exists():
    with pytest.raises(ValueError, match="not supported yet"):
        Settings.from_env({"BRSE_MCP_MODE": "write"})
