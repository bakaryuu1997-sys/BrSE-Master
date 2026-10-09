# BrSE OS AI Handoff Tasks

**Updated:** 2026-05-26 JST  
**Audience:** another AI coding agent continuing BrSE OS work.  
**Scope:** personal localhost-first productivity cockpit. Do not expand to team/cloud/auth unless the user asks.

## Mandatory Working Rules

1. Read `AGENTS.md`, `GOAL.md`, and `docs/PROJECT_SOURCE_OF_TRUTH.md` before coding.
2. Do not add feature logic to oversized files. Extract module/component/hook/service first.
3. Preserve existing behavior. If a change may overwrite current behavior, stop and report the risk.
4. Chrome extension work must keep model selection synchronized everywhere.
5. AI output that becomes HTML must pass through `chrome-extension/src/shared/sanitizer.js`.
6. Do not present mock/heuristic behavior as real AI.
7. Use the smallest verification that proves the slice, then report exact commands/results.
8. For final cross-cutting handoff, run `bash scripts/verify-brse.sh --skip-runtime`.

## Current Verified Baseline

- `bash scripts/verify-brse.sh --skip-runtime` passed on 2026-05-26 JST.
- Frontend lint/typecheck/test/build passed.
- Frontend Vitest reported 20 files / 52 tests passed.
- Backend Ruff passed and backend pytest reported 89 tests passed.
- Chrome extension tests reported 14 files / 37 tests passed.
- Chrome extension production build passed.
- Runtime API health at `127.0.0.1:3010/api/health` returned `ok`.
- Runtime glossary API at `127.0.0.1:3010/api/glossary` returned data.
- Runtime AI smoke initially failed on selected Ollama model `qwen2.5-coder:7b-instruct` because `host.docker.internal:11435` was unreachable.
- Active model was switched through `/api/ai/model` to `cx/gpt-5.5`; `/api/ai/chat` returned `200` with reply `OK`, provider `9router`, base URL `http://host.docker.internal:20128/v1`.
- Manual Chrome profile QA is not independently verified by Codex unless the user explicitly confirms it.

## P0 Extension Tasks

### EXT-SEC-01: Continue AI/HTML Safety Audit

**Files likely involved**
- `chrome-extension/src/shared/sanitizer.js`
- `chrome-extension/src/content/ui/**`
- `chrome-extension/src/sidepanel/**`

**Goal**
- Keep every AI/user/backend text path sanitized before it becomes HTML.
- Prefer DOM APIs or escaped text for translated text, glossary text, Jira text, and AI errors.
- Keep internal static markup allowed, but do not mix dynamic values into it without `escapeHtml()` or `sanitizeAiHtml()`.

**Acceptance criteria**
- No direct AI/user/backend text is assigned to `innerHTML`.
- Formatter tests cover markdown/table rendering with hostile HTML-like input.
- Existing QuickBox and sidepanel behavior remains unchanged.

**Verification**
- `cd chrome-extension && npm run test`
- `cd chrome-extension && npm run build`

### EXT-QB-01: Keep QuickBox Shell Small Without Behavior Drift

**Current state**
- `QuickBox.js` already uses `orchestrator.js`, `glossaryOverlay.js`, `ipa.js`, `responseActions.js`, `chatComposer.js`, `modelSelector.js`, `position.js`, `resize.js`, `tabs.js`, and `syncBadge.js`.

**Goal**
- Do not reopen the old monolith pattern.
- If further changes are needed, extract pure shell/markup helpers only after manual QA proves current behavior.

**Verification**
- `cd chrome-extension && npm run test`
- `cd chrome-extension && npm run build`

### EXT-SP-01: Keep Sidepanel Controller Boundaries Stable

**Current state**
- `sidepanel.js` already delegates chat stream handling to `chatController.js` and Jira/Todo sync to `jiraContext.js`.

**Goal**
- Preserve the split. New chat, Jira, Todo, model, or project status behavior belongs in focused sidepanel modules, not the shell.

**Verification**
- `cd chrome-extension && npm run test`
- `cd chrome-extension && npm run build`

### EXT-QA-01: Manual Chrome QA

**Prerequisite**
- Build extension: `cd chrome-extension && npm run build`.
- Reload `chrome-extension/dist` in `chrome://extensions`.

**Checklist**
- Quick Memo opens from Subaru/menu and can add/edit notes.
- Summary page shows source, input length, cache/fallback status.
- YouTube page with no captions says no subtitles/captions instead of looking like AI failed.
- Double-click does not show Subaru selection icon; triple-click or drag-select does.
- Add glossary term, refresh page, confirm highlight and tooltip.
- Switch model in sidepanel/QuickBox/web app and confirm the selected model stays consistent.

**Evidence expected**
- Browser console has no red errors from extension scripts.
- A short note listing page URL, selected model, and pass/fail per flow.

## P0 Frontend Decomposition Tasks

### FE-01: Dashboard Route Shell Split

**Files likely involved**
- `frontend/app/app/page.tsx`
- `frontend/components/dashboard/**`
- `frontend/lib/**`

**Goal**
- Remove business logic from the route shell.
- Extract command intelligence, planner, morning brief, metrics, drawers into focused components/hooks.

**Acceptance criteria**
- Route shell trends toward orchestration only.
- No new page-local CSS system.

**Verification**
- `cd frontend && npm run typecheck`
- Focused dashboard tests if changed.

### FE-02: Meeting Note Route Split

**Goal**
- Split uploader, history, recorder, and actions.
- Preserve upload/transcription/memo behavior.

**Verification**
- `cd frontend && npm run typecheck`
- Backend focused tests only if API contracts change.

### FE-03: Project Settings Route Split

**Goal**
- Split conflict handling, integrations, stakeholders, profile form.
- Keep hooks at top level only.

**Verification**
- `cd frontend && npm run typecheck`
- Project settings tests if changed.

## P1 Product Workflow Tasks

### WF-01: Operations -> Reports Horenso

**Goal**
- From overdue Q&A/CR/risk, draft Japanese Horenso email.
- Handoff should copy/open draft, not silently send.

**Verification**
- Focused frontend test for draft payload.

### WF-02: Notes Cross-Links

**Goal**
- Add cross-link actions between Meeting Memo, Meeting Minutes, and Memo Notes.
- Keep the three note surfaces separate for now.

**Verification**
- Focused test for link metadata.

### WF-03: Todo Multi-Source Evidence

**Goal**
- Multiple evidence items per task: image, Jira/Redmine link, Chatwork excerpt, Meeting quote, Minutes link.

**Verification**
- Data shape test and UI render test.

## P1 Dashboard Cockpit Tasks

### DB-01: Golden Action

**Goal**
- Show exactly one top urgent action.
- Sources: overdue Todo, overdue Q&A, failed meeting job, red project health, upcoming milestone.

**Verification**
- Pure ranking test.

### DB-02: Inbox Zero Quick Actions

**Goal**
- Add Draft Email, Update Status, Snooze to actionable dashboard hotspots.

**Verification**
- Focused component tests.

### DB-03: Communication Pulse

**Goal**
- Show Q&A response time, open/answered trend, meeting frequency trend.

**Verification**
- Pure metric tests.

### DB-04: Interactive Week Planner

**Goal**
- Start with click-to-schedule if drag/drop is risky.

**Verification**
- Planner state test.

## P1 Slide Studio Tasks

### SL-01: Weekly Report Deck

**Goal**
- Generate 5-slide weekly deck: Overview, Progress, Issues, Next Actions, Decisions/Risks.

**Verification**
- Focused deck model/layout tests.

### SL-02: Project-Aware Slide AI

**Goal**
- Include project memory, operations context, and customer tone in `/ai/slides/summarize`.

**Verification**
- Backend/frontend prompt-context test.

### SL-03: Markdown Layout Parser

**Goal**
- Tables -> table/split layout.
- Timeline bullets -> timeline layout.
- Decision blocks -> decision slide.

**Verification**
- Parser tests.

## P2 Later Tasks

- Meeting enterprise: speaker labels, Honne/Tatemae hints, context chain, evidence vault, custom template, multi-meeting chat.
- Todo intelligence: project-type suggestions, stable drag order, source badges, report-aware Todo.
- Knowledge/Search: markdown editor polish, glossary/article cross-links, better ranking, semantic search evaluation.
- Release hygiene: theme QA, responsive QA, frontend error boundary, backend long-job logging, localhost-plus-tunnel security baseline.

## Reviewer Checklist For Codex After Another AI Works

1. Review diff first: ensure no broad rewrites or unrelated file churn.
2. Run the smallest focused tests for changed areas.
3. Run `bash scripts/verify-brse.sh --skip-runtime` before accepting cross-cutting changes.
4. Check for new hardcoded model/API URLs or secret defaults.
5. Check Chrome extension model sync if any extension file changed.
6. Check no new mock AI behavior is presented as real.
7. Update `GOAL.md` by removing completed tasks only after evidence exists.
