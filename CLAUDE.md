# CLAUDE.md

> Bridge file for Claude Code. The real project rules live in `AGENTS.md` and
> `docs/PROJECT_SOURCE_OF_TRUTH.md` — this file just loads them and adds the
> Claude Code essentials. It is **not** a new source of rules.

## What this project is

**BrSE OS** is a personal, localhost-first productivity cockpit for **one user**
(meetings, todos, operations, reports, glossary, knowledge, Chrome Extension
sidecar). Do not expand it into team/cloud/auth scope unless explicitly asked.

Architecture:
- `backend/` — FastAPI + SQLAlchemy + PostgreSQL (Docker). AI via Ollama + 9router.
- `frontend/` — Next.js (React + TailwindCSS), browser app on port 3010.
- `chrome-extension/` — Manifest V3 sidecar (separate product surface).
- `scripts/` — stack start + verification gates.

## Canonical rules (auto-loaded)

@AGENTS.md
@docs/PROJECT_SOURCE_OF_TRUTH.md

## Quick commands

```bash
# Frontend (TS/UI changes)
cd frontend && npm run typecheck
cd frontend && npx eslint <changed files>

# Backend (service/router changes)
cd backend && venv/bin/python -m ruff check app tests
cd backend && venv/bin/python -m pytest <focused test>

# Chrome Extension (JS syntax)
rg --files chrome-extension/src -g '*.js' | xargs -r -n1 node --check

# Shared API contract drift guard
node scripts/check-api-contract.cjs

# Runtime AI smoke
curl -fsS 'http://127.0.0.1:3010/api/ai/status?check_runtime=true'

# Full project gate (slowest, use before handoff)
bash scripts/verify-brse.sh           # or --quick / --skip-build / --skip-runtime

# Start the local stack
bash scripts/start-brse-stack.sh
```

## Top guardrails (read AGENTS.md for the full list)

- **API base:** browser/extension code uses `http://127.0.0.1:3010/api`. Never
  hardcode `localhost:8000` / `127.0.0.1:8000` in browser or extension code.
- **Runtime contract:** do not change ports or API base URLs ad hoc. Update
  `docs/PROJECT_SOURCE_OF_TRUTH.md` first if a contract really must change.
- **Don't broad-scan heavy folders:** `uploads/`, `frontend/node_modules/`,
  `frontend/.next/`, `backend/venv/`, `.run/`, `.git/`. Use targeted `rg` with
  explicit paths.
- **Chrome Extension is a separate surface.** Don't touch `chrome-extension/`
  during frontend/backend work unless the task targets it or a shared API
  contract changes.
- **Verification ladder:** run the smallest check that proves the change
  (typecheck → focused test → full gate). Report the exact command + result.
- **No mock/fake AI under product-sounding labels.** Name heuristic/local/mock
  behavior as such until wired to a real backend path.
- **Data models:** do not delete legacy note tables; follow the consolidation
  contract (read compatibility + export + migration + rollback) in
  `docs/PROJECT_SOURCE_OF_TRUTH.md` §5.

## Repo notes

- Trunk is `main` (decided 2026-11-06). Remote `origin` = github.com/bakaryuu1997-sys/BrSE-Master. The local
  `master` branch holds the original 106-commit history and stays **local only** as an archive: never push it.
- A `pre-push` hook re-runs the verify gate. CI lives in `.github/workflows/ci.yml` (backend ruff+pytest, frontend
  typecheck+eslint+vitest, API contract); it has not run on GitHub yet, so check the first run.
- Public API routes are an EXACT list in `backend/app/core/security.py` (`/api/health`, `/api/health/db`,
  `/api/health/deep`, `/api/ai/status`). Any new route is protected by default; add it to
  `backend/tests/test_api_protection.py` instead of widening that list.
