"""Read-only tools. Every tool only issues GET requests and is annotated readOnlyHint=True."""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from .client import BrseClient, path_segment, safe_id
from .config import Settings
from .shaping import as_items, clamp_limit, clip_deep, contains, list_result

READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)


def register_read_tools(mcp: FastMCP, client: BrseClient, settings: Settings) -> None:
    def tool(title: str):
        return mcp.tool(title=title, annotations=READ_ONLY)

    def full(data: Any) -> Any:
        return clip_deep(data, settings.max_chars)

    # ---- app / projects -------------------------------------------------------------------
    @tool("App health")
    async def app_status() -> Any:
        """Check that BrSE OS is reachable and report its health summary."""
        return await client.get("/health")

    @tool("List projects")
    async def list_projects() -> Any:
        """List project settings (id, name, customer, phase, health, timezone ...). Start here to find project ids."""
        return list_result(as_items(await client.get("/projects")), limit=100)

    # ---- operations (Q&A / Bug / Change Request) ------------------------------------------
    @tool("List operations")
    async def list_operations(
        type: str = "", status: str = "", project: str = "", query: str = "", limit: int = 50, offset: int = 0
    ) -> Any:
        """List operation records (type is qna, bug or cr). Filters are optional substrings; `project` matches project_name."""
        items = [
            item
            for item in as_items(await client.get("/operations"))
            if contains(item, type, ("type",))
            and contains(item, status, ("status",))
            and contains(item, project, ("project_name",))
            and contains(item, query, ("title", "owner", "customer_owner", "field_a", "field_b", "field_c", "field_d", "field_e"))
        ]
        return list_result(items, limit=clamp_limit(limit), offset=max(0, offset))

    @tool("List decision logs")
    async def list_decision_logs(limit: int = 50, offset: int = 0) -> Any:
        """List decision-log entries recorded in Operations."""
        return list_result(as_items(await client.get("/operations/decision-logs")), limit=clamp_limit(limit), offset=max(0, offset))

    @tool("Get release gate")
    async def get_release_gate(project_name: str) -> Any:
        """Get the release-gate checklist of a project, by project name."""
        return full(await client.get(f"/operations/release-gates/{path_segment(project_name)}"))

    # ---- todo -----------------------------------------------------------------------------
    @tool("List todo projects")
    async def list_todo_projects() -> Any:
        """List the projects that have a Todo workflow board."""
        return list_result(as_items(await client.get("/todos/projects")), limit=100)

    @tool("Get todo state")
    async def get_todo_state(project_id: str) -> Any:
        """Get the Todo board of a project: preset, active phase and all items with done/deadline/notes."""
        return full(await client.get(f"/todos/projects/{safe_id(project_id, kind='project id')}/state"))

    @tool("Evaluate todo rules")
    async def evaluate_todo_rules(project_id: str, today: str = "") -> Any:
        """Evaluate the project's Todo rules (overdue, deadline soon, stale ...). `today` is optional, format YYYY-MM-DD."""
        return full(
            await client.get(f"/todos/projects/{safe_id(project_id, kind='project id')}/rules", {"today": today.strip() or None})
        )

    # ---- meetings & minutes ---------------------------------------------------------------
    @tool("Search meeting minutes")
    async def search_minutes(
        project_id: str = "", query: str = "", status: str = "", limit: int = 20, offset: int = 0
    ) -> Any:
        """List/search meeting minutes. Returns previews; call get_minutes for the full body."""
        data = await client.get(
            "/meeting-minutes",
            {
                "project_id": safe_id(project_id, kind="project id") if project_id else None,
                "q": query.strip() or None,
                "status": status.strip() or None,
                "limit": clamp_limit(limit, 20),
                "offset": max(0, offset),
            },
        )
        items = as_items(data)
        return list_result(items, limit=clamp_limit(limit, 20))

    @tool("Get meeting minutes")
    async def get_minutes(minutes_id: str) -> Any:
        """Get one set of meeting minutes in full (markdown body, agenda, action items)."""
        return full(await client.get(f"/meeting-minutes/{safe_id(minutes_id, kind='minutes id')}"))

    @tool("List meetings")
    async def list_meetings(limit: int = 30, offset: int = 0) -> Any:
        """List processed meeting recordings (history) with status and summary previews."""
        return list_result(as_items(await client.get("/meetings/history")), limit=clamp_limit(limit, 30), offset=max(0, offset))

    # ---- notes, knowledge, glossary -------------------------------------------------------
    @tool("List memos")
    async def list_memos(query: str = "", limit: int = 30, offset: int = 0) -> Any:
        """List personal memo notes (optionally filtered by a substring of title/body/tags)."""
        items = [item for item in as_items(await client.get("/memos")) if contains(item, query)]
        return list_result(items, limit=clamp_limit(limit, 30), offset=max(0, offset))

    @tool("Search all notes")
    async def search_notes(q: str, limit: int = 20) -> Any:
        """Full-text search across the unified note index (memos, minutes ...). Returns previews."""
        data = await client.get("/note-index/search", {"q": q.strip(), "limit": clamp_limit(limit, 20)})
        return list_result(as_items(data), limit=clamp_limit(limit, 20))

    @tool("List universal notes")
    async def list_notes(kind: str = "", project_id: str = "", limit: int = 30, offset: int = 0) -> Any:
        """List notes from the unified note store, optionally by kind (e.g. personal_memo) and project id."""
        data = await client.get(
            "/universal-notes/",
            {"kind": kind.strip() or None, "project_id": safe_id(project_id, kind="project id") if project_id else None},
        )
        return list_result(as_items(data), limit=clamp_limit(limit, 30), offset=max(0, offset))

    @tool("Get universal note")
    async def get_note(note_id: str) -> Any:
        """Get one note from the unified note store in full."""
        return full(await client.get(f"/universal-notes/{safe_id(note_id, kind='note id')}"))

    @tool("Search knowledge")
    async def search_knowledge(q: str, project_id: str = "") -> Any:
        """Search knowledge-base articles. Returns previews; call get_knowledge for the full article."""
        data = await client.get(
            "/knowledge/search", {"q": q.strip(), "project_id": safe_id(project_id, kind="project id") if project_id else None}
        )
        return list_result(as_items(data), limit=50)

    @tool("Get knowledge item")
    async def get_knowledge(item_id: str) -> Any:
        """Get one knowledge-base article in full."""
        return full(await client.get(f"/knowledge/{safe_id(item_id, kind='knowledge id')}"))

    @tool("Search glossary")
    async def search_glossary(search: str = "", category: str = "", role: str = "", page: int = 1, size: int = 20) -> Any:
        """Search the BrSE glossary (English / Japanese / Vietnamese terms with notes and examples)."""
        data = await client.get(
            "/glossary",
            {
                "search": search.strip() or None,
                "category": category.strip() or None,
                "role": role.strip() or None,
                "page": max(1, page),
                "size": clamp_limit(size, 20),
            },
        )
        items = as_items(data)
        total = data.get("total") if isinstance(data, dict) else None
        return list_result(items, limit=clamp_limit(size, 20), total=total)

    # ---- reports, calendar, email ---------------------------------------------------------
    @tool("List reports")
    async def list_reports(limit: int = 30, offset: int = 0) -> Any:
        """List saved daily/weekly reports (previews of the generated text)."""
        return list_result(as_items(await client.get("/reports")), limit=clamp_limit(limit, 30), offset=max(0, offset))

    @tool("List calendar schedules")
    async def list_calendar_schedules(limit: int = 50, offset: int = 0) -> Any:
        """List personal calendar schedules."""
        return list_result(as_items(await client.get("/calendar/schedules")), limit=clamp_limit(limit), offset=max(0, offset))

    @tool("List email history")
    async def list_email_history(project_id: str = "", query: str = "", limit: int = 20, offset: int = 0) -> Any:
        """List generated/sent email drafts history (previews)."""
        data = await client.get(
            "/email-history",
            {
                "project_id": safe_id(project_id, kind="project id") if project_id else None,
                "q": query.strip() or None,
                "limit": clamp_limit(limit, 20),
                "offset": max(0, offset),
            },
        )
        return list_result(as_items(data), limit=clamp_limit(limit, 20))
