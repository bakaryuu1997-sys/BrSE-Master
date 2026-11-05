# BrSE OS MCP server (phase 1: read-only)

Lets an AI agent (Claude Desktop, Claude Code, any MCP client) **read** BrSE OS: projects, operations
(Q&A / Bug / CR), todos, meeting minutes, memos and notes, knowledge, glossary, reports, calendar, email
history. It is a thin adapter over the app's own REST API (`http://127.0.0.1:3010/api`, the canonical
proxy in `docs/PROJECT_SOURCE_OF_TRUTH.md`); it never touches the database directly.

Writing is **not implemented yet** (`BRSE_MCP_MODE` other than `read` is refused). Roadmap: phase 2 adds
write tools with guard rails, phase 3 adds documents as MCP resources and workflow prompts.

## Install

```bash
cd mcp-server
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/python -m pytest -q          # 37 tests, no network needed
```

Needs Python 3.10+. The SDK is pinned to `mcp>=1.9,<2` (mcp 2.x renamed `FastMCP`; migrate on purpose).

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `BRSE_API_BASE` | `http://127.0.0.1:3010/api` | Frontend proxy. Use `http://127.0.0.1:3011/api` for the isolated test stack. Never `:8000`. |
| `BRSE_API_SECRET` | empty | Sent as `X-BrSE-Token`. Set it to the same value as the backend's `BRSE_API_SECRET`. |
| `BRSE_MCP_TIMEOUT` | `30` | Seconds per API call. |
| `BRSE_MCP_MAX_CHARS` | `20000` | Cut for one text field in a `get_*` result (list/search results are cut at 300 chars). |
| `BRSE_MCP_MODE` | `read` | Only `read` exists. |

## Connect a client

The stack must be running (`bash scripts/start-brse-stack.sh`). The server speaks MCP over **stdio**, so no
network port is opened.

**Claude Code** (run inside the project, WSL path):

```bash
claude mcp add brse-os -- /home/bakaryuu/BrSE/mcp-server/.venv/bin/python -m brse_mcp.server
```

**Claude Desktop on Windows, server in WSL** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "brse-os": {
      "command": "wsl.exe",
      "args": [
        "-d", "Ubuntu", "--", "env", "BRSE_API_BASE=http://127.0.0.1:3010/api",
        "/home/bakaryuu/BrSE/mcp-server/.venv/bin/python", "-m", "brse_mcp.server"
      ]
    }
  }
}
```

Smoke test (real stdio session, read-only calls, prefer the test stack):

```bash
.venv/bin/python scripts/smoke_stdio.py --api-base http://127.0.0.1:3011/api
```

## Tools (21, all `readOnlyHint=true`)

`app_status`, `list_projects`, `list_operations`, `list_decision_logs`, `get_release_gate`,
`list_todo_projects`, `get_todo_state`, `evaluate_todo_rules`, `search_minutes`, `get_minutes`,
`list_meetings`, `list_memos`, `search_notes`, `list_notes`, `get_note`, `search_knowledge`,
`get_knowledge`, `search_glossary`, `list_reports`, `list_calendar_schedules`, `list_email_history`.

List/search tools return previews with paging (`total`, `returned`, `has_more`); `get_*` return the full item.

## Safety design

- **Read-only by construction**: every tool issues GET only (a test asserts it) and is annotated read-only.
- **No route injection**: ids supplied by the model are validated (`[A-Za-z0-9._:-]`, no `..`) and free text
  (project names) is percent-encoded as one path segment. `../settings/backup` never reaches the API.
- **Untrusted content**: meeting transcripts, emails and web captures can contain instructions aimed at the
  AI. The server tells the client to treat everything it returns as data, not commands. Keep this in mind
  before enabling write tools in phase 2 (confirmations, backups, audit log).
- **Auth**: uses the app's existing `X-BrSE-Token`. Exposing the app outside localhost is a separate
  decision (see open bugs B-017/B-018 in `docs/reviews/`).
- **No SQL / no inspect routes** are exposed.
