# BrSE OS agent operating rules

This is a personal localhost-first BrSE OS workspace. Keep changes narrow and practical.

## Canonical direction

- `docs/PROJECT_SOURCE_OF_TRUTH.md` is the project contract for runtime URLs, product direction, code rules, and verification gates.
- `docs/goal.md` is the active execution backlog. Root `GOAL.md` is obsolete and should not be recreated.
- `docs/AI_HANDOFF_TASKS.md` is the active detailed task handoff for other AI agents. Read it before continuing `docs/goal.md` work.
- If an older plan, report, or roadmap conflicts with `docs/PROJECT_SOURCE_OF_TRUTH.md`, follow the source-of-truth file and treat the older file as archive context only.
- Do not change canonical runtime ports or API base URLs ad hoc. Update the source-of-truth file first when a runtime contract really needs to change.

## Performance guardrails

- Do not broad-scan or summarize generated/heavy folders unless the user explicitly asks:
  - `uploads/`
  - `frontend/node_modules/`
  - `frontend/.next/`
  - `backend/venv/`
  - `.run/`
  - `.git/`
- Prefer targeted searches with `rg` and explicit paths, for example:
  - `rg "pattern" frontend/app frontend/components frontend/lib backend/app backend/tests`
- Avoid `find .`, `du .`, or recursive PowerShell scans without prune/exclude rules.
- Do not run long Docker rebuilds unless code changes need live-container verification.
- For UI work, first edit the exact page/component, then run the cheapest check that proves the change.

## Terminal safety

- Prefer native tools (`read_file`, `search_files`, `list_files`, `list_code_definition_names`) over shell scripts for inspection.
- Every `execute_command` must include an explicit `timeout`, except trivial commands that are guaranteed to exit immediately.
- Do not run inline stdin scripts through agent terminals:
  - no `python - <<'PY'`
  - no `python -`
  - no long `node -e "..."`
- If script logic is needed, create a small repo script or use an existing project command, then run it with `timeout`.
- Before diagnosing terminal/Cline hangs, check stale process patterns with a short timeout:
  - `timeout 5s ps -eo pid,ppid,stat,etime,cmd | grep -E "mcp-remote|node -e|python -|npm|pytest|alembic" | grep -v grep || true`
- Do not kill processes without user approval. Prefer `kill <pid>` first; use `kill -9 <pid>` only when the user confirms and graceful kill fails.
- If checking occupied ports, use targeted commands such as `timeout 5s lsof -i :3010` or `timeout 5s lsof -i :8000`.

## Verification ladder

Use the smallest useful verification first:

1. TypeScript-only frontend changes: `cd frontend && npm run typecheck`
2. Backend service/router changes: `cd backend && venv/bin/python -m pytest <focused test>`
3. Cross-cutting or final handoff: full build/test only when needed.

## Clean-code stop rules

- P0 quality debt blocks feature work in the same area. If a touched file has a known hook/security/test/lint blocker, fix or isolate that blocker before adding new feature surface.
- Do not add new logic to oversized route files unless the change is a small bug fix. For feature work, extract a component/hook/service first, then wire it into the route.
- Route files should trend toward thin orchestration. New business logic belongs in `frontend/lib`, `frontend/features/**`, backend services, or focused components with tests.
- Never call React hooks from callbacks, loops, conditions, helpers, or render branches. If a function starts with `use`, it must be a real hook called at component/hook top level.
- Hook dependency warnings are not noise. Fix stale closures with stable callbacks/memoized inputs, or leave a short code comment only when the dependency is intentionally stable and verified.
- Do not introduce page-local CSS systems. Reuse `frontend/app/globals.css` shared classes (`brse-page`, `brse-section`, `brse-card`, `brse-card-muted`, `brse-button`, `brse-button-primary`, `brse-tab`, `field-control`) and extend globals only when a reusable pattern is needed.
- Do not add mock/fake AI behavior under product-sounding labels. If a feature is heuristic/local/mock, name it that way in code and UI until it is wired to a real backend path.
- Do not delete legacy data models just because a newer model exists. First write/read compatibility, migration/export, tests, and rollback notes.
- Do not add a backend route without deciding whether it is localhost-open or protected. If protected, add/check the dependency and a focused test.
- Do not introduce weak default secrets. Local defaults may be empty/disabled, but secrets like `1204` must not be silent fallbacks.
- Backend hot paths must not create a new network client per item/request loop when a pooled/runtime client is reasonable.
- Chrome Extension code is a separate product surface. Do not touch it during frontend/backend cleanup unless the task explicitly targets extension or an API contract change requires it.
- Every feature slice needs a focused test or the smallest meaningful verification command. Report the exact command and result.

## Current product direction

- Treat BrSE OS as a one-person local productivity cockpit.
- Prefer functional clarity over decorative polish.
- Keep dashboard/calendar flows fast for daily use.
