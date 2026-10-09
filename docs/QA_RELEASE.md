# BrSE OS QA And Release Guide

## Fast Gate

```bash
bash scripts/verify-brse.sh --quick
```

## Full Gate

```bash
bash scripts/verify-brse.sh
```

## Manual Commands

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm test
```

Backend:

```bash
cd backend
venv/bin/python -m ruff check app tests
venv/bin/python -m pytest --collect-only
venv/bin/python -m pytest
```

Extension syntax:

```bash
for file in $(rg --files chrome-extension/src -g '*.js'); do node --check "$file"; done
```

API contract:

```bash
node scripts/check-api-contract.cjs
```

Runtime smoke:

```bash
curl -fsS 'http://127.0.0.1:3010/api/ai/status?check_runtime=true'
```

## Test Matrix

- Dashboard loads at `http://127.0.0.1:3010/app`.
- Meeting upload, summary, decisions, actions, export, recovery paths work.
- Todo accepts manual and meeting-derived tasks.
- Operations and Reports preserve project data.
- Knowledge and Glossary search return expected records.
- Chrome Extension calls `http://127.0.0.1:3010/api`, not backend port `8000`.
- AI status reports 9router/Ollama routing clearly.

Chrome Extension manual reload:

- Reload unpacked extension from `chrome://extensions` using `chrome-extension/dist`.
- Test Quick Memo, page summary, YouTube no-caption fallback, double/triple click behavior, glossary highlight, sidepanel chat, and model switch.
- Test OCR on English text, Japanese text, and source code screenshots. The OCR
  editor must show four tabs: original language, Japanese, Vietnamese, English.
  English screenshots must still have a Japanese translation tab, and source-code
  captures must keep copyable original code spacing in the original tab.
- Record the URL, selected model, browser console status, and pass/fail result.
- Do not claim native desktop app support from this QA pass; desktop workflows are clipboard/manual handoff until a separate companion exists.

## Visual QA

Check main screens at desktop, tablet, and narrow widths:

- Dashboard
- Meeting Note AI
- Todo
- Operations
- Reports
- Calendar
- Knowledge/Glossary
- Communication Tools
- Chrome Extension popup/side panel

Stop release on broken layout, hidden primary action, unreadable text, uncontrolled overflow, or route error.

## Stop Rules

Stop and fix before release if:

- `scripts/verify-brse.sh` fails.
- API contract check fails.
- Browser/extension uses `8000/api`.
- AI feature reports success with empty/unusable content.
- OCR hardcodes the original language to Japanese, loses the original text/code
  view, or replaces copyable source text with a translation.
- Destructive data migration lacks backup/export and rollback note.
- Chrome Extension is described as working inside native desktop apps.
