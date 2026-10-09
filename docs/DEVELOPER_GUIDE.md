# BrSE OS Developer Guide

## Project Shape

- `frontend/`: Next.js app. Browser entry: `http://127.0.0.1:3010/app`. Browser API base: `/api`.
- `backend/`: FastAPI + SQLAlchemy. Docker-only service: `backend:8000`. Host backend port is intentionally not public.
- `chrome-extension/`: MV3/Vite/React sidecar. Default API: `http://127.0.0.1:3010/api`.
- `scripts/`: stack startup, Ollama sidecar, verification, API contract checks.

## Local Stack

```bash
bash scripts/start-brse-stack.sh
docker compose up -d backend frontend
```

If Docker backend uses local Qwen/Ollama:

```bash
bash scripts/start-ollama-docker-sidecar.sh
```

## Runtime Rules

- Browser and extension use `http://127.0.0.1:3010/api`.
- Frontend container talks to backend through `http://backend:8000`.
- Backend Docker talks to Ollama through `http://host.docker.internal:11435`.
- Do not hardcode `localhost:8000` or `127.0.0.1:8000` in browser or extension code.

## Security Posture

- Local UI and extension may call backend without secret only when `BRSE_API_SECRET` is empty.
- If exposed beyond localhost, set `BRSE_API_SECRET`; callers send `X-BrSE-Token`.
- No weak fallback token.
- Do not expose upload, AI, client-state, or command-center routes through a tunnel without explicit token coverage.

## Database Migrations

- Migration tool path: use Alembic under `backend/migrations/`.
- Do not add new startup `ALTER TABLE` patches in `backend/app/main.py`. New schema changes must be modeled, migrated, and covered by focused tests.
- Baseline revision: `20260531_0001_baseline.py` creates the current SQLAlchemy metadata on a fresh database.
- Fresh database command: `cd backend && venv/bin/alembic upgrade head`.
- Existing local database command after baseline exists: inspect schema first, then stamp only when it already matches the baseline: `cd backend && venv/bin/alembic stamp head`.
- Rollback rule: every migration PR/task must name the rollback command, normally `cd backend && venv/bin/alembic downgrade -1`, and must not delete legacy data without export and restore notes.
- Baseline downgrade warning: `downgrade base` from the baseline drops all modeled tables and is only acceptable for disposable local test databases.
- Transition complete (2026-06-11): startup `ALTER TABLE` helpers were removed from `backend/app/main.py`. `init_db()` now runs `alembic upgrade head` programmatically (plus `create_all` as a safety net for brand-new model tables). The project-settings columns live in `20260531_0004_project_settings_profile_columns.py`; the former `todos.evidences_json` patch lives in `20260531_0002_todo_evidences_json.py`.

## Meeting Job State Contract

A Meeting Note job's state lives in three coordinated places — keep them consistent:

- **`MeetingRecord.status`** (DB) — durable lifecycle anchor (`pending` → `processing`/`transcribing`/`summarizing` → `completed`/`failed`). Drives the history list and recovery queries.
- **`memos/_meta/{job_id}.status.json`** (file) — hot-path detail written frequently during processing (progress, current step, cancel flag, upload progress, summary checkpoint, STT telemetry). Resilient and scanned by recovery.
- **`MeetingTaskStatusRecord`** (DB) — queryable mirror of the file for health checks and as a fallback when the file is lost.

Rules:
- **Write only through `update_status_meta()` / `clear_status_meta_fields()`** in `backend/app/services/meeting_artifacts.py` — they write the file **and** upsert the DB mirror in one path. Never write the meta file with a raw `json.dump`.
- The DB upsert is best-effort and file-first: a DB failure is logged (not swallowed) and never breaks the file write.
- **Read only through `serialize_meeting_record()`** (`meeting_status.py`), which merges file + DB mirror (newer `updated_at` wins) + `MeetingRecord`.
- Cancellation is the `cancel_requested` flag in the meta file, checked by `ensure_not_cancelled()`.

## Note Consolidation Cutover (Memo → UniversalNote)

Per source-of-truth §5, note tables are being consolidated into
`UniversalNoteRecord` one surface at a time. Current state for **Memo Notes**:

`MEMO_CANONICAL_READ` (`settings.memo_canonical_read`) selects the canonical store:

- **`legacy` (default):** `/api/memos` writes `MemoNoteRecord` (canonical) and
  mirrors into `UniversalNoteRecord` via `safe_project_memo_note`. Reads come from
  `MemoNoteRecord`. Unchanged historical behaviour.
- **`universal`:** `/api/memos` writes `UniversalNoteRecord` (kind=`personal_memo`)
  as canonical and keeps `MemoNoteRecord` as a **best-effort synced backup**
  (`safe_backup_memo_record`). Reads come from `UniversalNoteRecord`.

Because both tables stay in sync in either mode, **rollback is just flipping the
flag back to `legacy`** — no data is lost. Equivalence of the two read paths and
two-table CRUD sync are covered by `tests/test_memo_universal_read.py`.

**Meeting Minutes** mirrors Memo via `MINUTES_CANONICAL_READ`
(`settings.minutes_canonical_read`): `universal` makes `UniversalNoteRecord`
(kind=`meeting_minutes`) canonical for **reads and writes** (list/get/create/update/
delete), with `MeetingMinutesRecord` kept as a best-effort synced backup
(`safe_backup_minutes_record`). Equivalence + two-table CRUD sync are covered by
`tests/test_minutes_universal_read.py`. Rollback = flip the flag back to `legacy`.

**Remaining (step 5, separate task):** once `universal` has run in production for a
while, stop writing the legacy backup tables and deprecate them via a dedicated
migration with backup/export + rollback notes. Do **not** drop a table before that.

## Code Rules

- No new business logic in oversized route/page files.
- Split by API client, domain service, hook, component, and view shell.
- Use `frontend/app/globals.css` tokens/classes unless a component has an established module pattern.
- React hooks run only at component/hook top level.
- Backend hot paths reuse pooled clients where reasonable.
- Chrome Extension changes need explicit task scope or shared API contract change.

## Useful Commands

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm test
cd backend && venv/bin/python -m ruff check app tests
cd backend && venv/bin/python -m pytest
node scripts/check-api-contract.cjs
bash scripts/verify-brse.sh
```
