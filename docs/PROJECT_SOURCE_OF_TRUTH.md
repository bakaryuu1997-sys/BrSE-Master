# BrSE OS Project Source Of Truth

**Status:** canonical operating contract  
**Last updated:** 2026-05-25 JST  
**Scope:** personal localhost-first BrSE OS for one user. Do not expand into team/cloud/auth unless explicitly requested.

This file is the fixed direction for the whole project. When another document, old plan, or previous implementation disagrees with this file, follow this file first and update the older document only after verification.

## 1. Canonical Runtime Map

Use these endpoints consistently. Do not switch ports ad hoc.

| Surface | Canonical URL | Notes |
| --- | --- | --- |
| Browser app | `http://127.0.0.1:3010/app` | Docker frontend public entry. |
| Frontend API proxy | `http://127.0.0.1:3010/api` | Chrome Extension, browser UI, and local browser tools must use this. |
| Frontend container -> backend | `http://backend:8000` | Set through `INTERNAL_API_BASE_URL`; internal Docker network only. |
| Backend service | `backend:8000` inside Docker | Backend port is intentionally not published to host. |
| 9router host runtime | `http://127.0.0.1:20128/v1` | Host/WSL direct checks. |
| 9router from Docker backend | `http://172.21.191.148:20128/v1` | Current WSL-hosted 9router bridge for `OPENAI_BASE_URL` / `NINE_ROUTER_BASE_URL`; refresh with `wsl -d Ubuntu hostname -I` if WSL IP changes. |
| Ollama host runtime | `http://127.0.0.1:11434` | Host-only default Ollama service. |
| Ollama from Docker backend | `http://172.21.191.148:11434` | Current WSL-hosted Ollama bridge for local Qwen models; refresh with `wsl -d Ubuntu hostname -I` if WSL IP changes. |
| Cloudflare tunnel runtime | `.run/cloudflared` -> `/etc/cloudflared` | Docker Compose mounts the ignored runtime copy. Source credentials may live in `/home/bakaryuu/.cloudflared`, but credentials must not be committed. **Opt-in:** the `cloudflared` service is behind the `tunnel` compose profile and does not auto-start; enable with `BRSE_ENABLE_TUNNEL=1` or `docker compose --profile tunnel up`. Do not expose without `BRSE_API_SECRET` + token coverage or Cloudflare Access. |

Rules:
- Chrome Extension must not default to `8000/api`; use `3010/api`.
- Frontend must not call backend through host `8000`; use `/api` in browser code and `backend:8000` inside Next rewrites.
- Backend Docker must not call Ollama at `localhost:11434`; use the current WSL bridge in `OLLAMA_BASE_URL`.
- 9router and Ollama are both valid AI runtimes:
  - Ollama model IDs such as `qwen2.5-coder:7b-instruct` go to Ollama `/api/chat`.
  - Non-Ollama model IDs go through 9router OpenAI-compatible `/chat/completions`.
  - Image OCR uses `OCR_VISION_MODEL`; current smoke-tested default is
    `gemini/gemini-3.1-flash-lite-preview`.
- Active model selectors are intentionally limited to smoke-tested choices.
  Keep this list synchronized across backend, frontend, and Chrome Extension:
  - `qwen2.5-coder:7b-instruct` for local Ollama.
  - `cx/gpt-5.5` for the user-requested 9router CX lane; keep it visible even when the latest smoke test marks it red.
  - `gemini/gemma-4-31b-it` for 9router Gemma.
  - `nvidia/google/gemma-4-31b-it` for 9router NVIDIA Gemma.
  - `openrouter/nvidia/nemotron-3-super-120b-a12b:free` for 9router Nemotron.
  - `free-logic` for the 9router fallback lane.
- Do not add other listed-but-failing models to selectors until a real `/api/ai/chat`
  smoke test returns usable content. As of 2026-06-02 JST, `cx/gpt-5.3-codex`
  remains excluded; `cx/gpt-5.5` is the one explicit exception because the user
  wants to keep it selectable while the smoke-test UI reports its current health.
  Older failures also remain excluded:
  `qwen3.5:9b` missing locally, `nvidia/moonshotai/kimi-k2.5` 404,
  `nvidia/z-ai/glm4.7` 410, and
  `openrouter/z-ai/glm-4.5-air:free` returned no usable content.
- Cloudflare tunnel can expose `master.baryuu.com` / `brse.baryuu.com` and API
  hostnames through the same Docker network. Public API hostnames are not safe
  unless `BRSE_API_SECRET` is set and clients send `X-BrSE-Token`.

## 2. Canonical Documents

Keep active docs small and current.

| File | Purpose |
| --- | --- |
| `README.md` | Human entry point: start, verify, doc map. |
| `AGENTS.md` | Agent operating rules and clean-code stop rules. |
| `CLAUDE.md` | Claude Code bridge: loads `AGENTS.md` + this file and lists quick commands. Defers to this file; not a new rule source. |
| `docs/PROJECT_SOURCE_OF_TRUTH.md` | This contract: runtime, direction, and change rules. |
| `docs/README.md` | Docs index and keep list. |
| `docs/DEVELOPER_GUIDE.md` | Project structure, local stack, commands, code rules, security posture. |
| `docs/API_CONTRACTS.md` | Shared frontend/extension/backend API inventory and drift guard contract. |
| `docs/FEATURE_GUIDE.md` | Current product features, daily workflow, glossary rules, extension safety. |
| `docs/QA_RELEASE.md` | Test matrix, release gates, and visual/manual QA checklist. |
| `docs/goal.md` | Active architecture backlog only. Completed items are removed after evidence is recorded. |
| `docs/AI_HANDOFF_TASKS.md` | Detailed handoff tasks referenced by `docs/goal.md`. |

Older PRD, roadmap, design, phase reports, sidebar notes, and archive documents are removed from `docs/` and are not allowed to override this file.

## 3. Product Direction

- BrSE OS is a local productivity cockpit, not a SaaS product.
- Optimize for daily use: Dashboard, Meeting Note, Todo, Operations, Reports, Knowledge, Chrome Extension.
- Keep important project data backend-backed or explicitly marked as local cache.
- Prefer simple, reliable workflows over large speculative feature surfaces.
- Do not label heuristic/mock/local preview features as real AI.

## 4. Clean-Code Direction

- No new business logic in oversized route/page files.
- Split by real boundaries: API client, domain service, hook, component, view shell.
- CSS goes through shared `frontend/app/globals.css` tokens/classes unless a component already has an established module pattern.
- React hooks are called only at component/hook top level.
- Backend hot paths reuse pooled clients where reasonable.
- Data model consolidation needs read compatibility, export/migration, tests, and rollback notes before deletion.
- Chrome Extension is a separate product surface. Change it only when the task targets extension or a shared API contract changes.
- Chrome Extension page summary uses a two-stage contract: show a local
  extractive summary immediately from readable page text, then optionally refine
  with AI. Do not make page summary depend on a successful AI response before
  showing useful content.

## 5. Data Model Consolidation Contract

Do not delete old note tables until this contract is fully implemented and verified.

| Model | Current role | Consolidation rule |
| --- | --- | --- |
| `MemoNoteRecord` | Source of truth for Memo Notes UI and existing memo data. | Keep readable/writable until Memo Notes has a tested UniversalNote-backed path and export. |
| `MeetingMinutesRecord` | Source of truth for Meeting Minutes UI and generated minutes. | Keep readable/writable until Minutes create/update/export are UniversalNote-backed with compatibility tests. |
| `UniversalNoteRecord` | Cross-note index/projection for unified listing and future linking. | Treat as non-destructive projection first; backfill from legacy tables before it becomes canonical storage. |

Migration order:

1. Keep legacy write paths stable and add read-through projection into `UniversalNoteRecord`.
2. Add export coverage for each legacy table before changing canonical writes.
3. Switch one surface at a time to UniversalNote-backed writes with focused tests.
4. Keep rollback by leaving legacy records untouched until both old and new reads match.
5. Only then plan table deprecation; destructive deletion requires a separate migration, backup/export check, and rollback note.

Glossary ownership:

- Runtime glossary terms belong to `GlossaryTerm`.
- Generic knowledge articles belong to `KnowledgeItem`.
- Meeting glossary extraction writes to `GlossaryTerm`; Knowledge search may link to terms later, but must not silently become a second glossary store.

## 6. Shared Frontend/Extension API Contract

Both browser UI and Chrome Extension must route local API calls through the frontend proxy unless a backend-only runtime explicitly needs Docker service DNS.

| Client | Canonical helper | Default base |
| --- | --- | --- |
| Frontend browser code | `frontend/lib/config.ts` exports `apiBaseUrl` | `/api` |
| Chrome Extension | `chrome-extension/src/shared/api.js` exports `getApiBase` and `getAuthHeaders` | `http://127.0.0.1:3010/api` |

Rules:

- Do not hardcode `localhost:8000` or `127.0.0.1:8000` in browser/extension code.
- If Frontend and Extension both call the same backend feature, define the request/response shape at the backend schema/router level first, then update both clients through their canonical helpers.
- Extension storage may override `apiBaseUrl`, but stale `8000` values must be migrated back to `3010/api`.
- Any new shared API surface should add or update a focused backend test and keep `scripts/check-api-contract.cjs` passing.

Route protection:

- Local UI and extension may call backend without secret only when `BRSE_API_SECRET` is empty.
- If exposed beyond localhost, set `BRSE_API_SECRET`; callers send `X-BrSE-Token`.
- No weak fallback token.
- Do not expose upload, AI, client-state, or command-center routes through a tunnel without explicit token coverage.

Current shared API surfaces:

- AI runtime: `/ai/status`, `/ai/models`, `/ai/model`, `/ai/config`, `/ai/chat`, `/ai/chat/stream`, `/ai/keigo`.
  - `/ai/config` (GET/PUT) sets provider endpoints/API keys at runtime. Secrets are
    persisted to the gitignored `backend/app/runtime_ai_secrets.json` (never committed;
    shape in `runtime_ai_secrets.example.json`), kept separate from the model-choice
    file `runtime_ai_config.json` (shape in `runtime_ai_config.example.json`). GET
    returns only a `configured` boolean per secret, and an empty secret on PUT keeps
    the existing value. A legacy `provider` block inside the model-config file is read
    for backward compatibility and migrated out on the next PUT.
- Knowledge and glossary: `/knowledge`, `/glossary`, `/client-state/entry`.
- Work capture: `/operations`, `/todos/projects`, `/meeting-minutes`, `/meetings/upload`.
- OCR: `/ai/ocr` returns multilingual regions. Each region keeps the exact
  detected original text in `text`, detected language in `source_language`, and
  translations in `translation_ja`, `translation_vi`, `translation_en`; `translation`
  remains an alias of `translation_vi` for older extension code. Do not hardcode
  OCR UI to Japanese as the original language. The extension may preserve
  bounding-box columns only for real code-like captures; ordinary page UI/list
  captures must be displayed in natural reading order.

## 7. Required Verification Before Handoff

Choose the smallest relevant set, but do not skip verification.

- Frontend TS/UI change:
  - `cd frontend && npm run typecheck`
  - focused `npx eslint <changed files>`
- Backend change:
  - `cd backend && venv/bin/python -m ruff check app tests`
  - focused `venv/bin/python -m pytest <tests>`
- Chrome Extension change:
  - `rg --files chrome-extension/src -g '*.js' | xargs -r -n1 node --check`
- Shared API contract change:
  - `node scripts/check-api-contract.cjs`
- Runtime AI change:
  - `curl -fsS 'http://127.0.0.1:3010/api/ai/status?check_runtime=true'`
  - one real `/api/ai/chat` smoke through `3010/api`.

Full project gate:

```bash
bash scripts/verify-brse.sh
```

## 8. Change Checklist

Before adding or changing code:

- Is the change aligned with this file?
- Is there an existing shared utility/component/CSS class to reuse?
- Will this touch a monolith page? If yes, extract first or keep the patch to a small bug fix.
- Does it affect Frontend, Backend, and Extension API contracts? If yes, update all call sites and add/check verification.
- Does it modify local data shape? If yes, preserve old data and document migration/rollback.
- Did the focused checks pass?

If any answer is unclear, stop and inspect before coding.
