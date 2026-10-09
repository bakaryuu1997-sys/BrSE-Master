# Chrome Extension desktop integration plan

**Status:** active local plan. Chrome Extension remains all-web capable through user-action injection and optional host permissions.

## Boundary

- Chrome content scripts can run in web pages only: `http://*/*`, `https://*/*`, and product pages allowed by Chrome.
- Chrome content scripts cannot run inside native desktop apps directly: VS Code, Excel, Word, terminal, desktop windows, PDFs opened outside Chrome, or OS-level dialogs.
- Desktop-app support must use a bridge outside content scripts.

## Current path: local desktop agent

- Script: `scripts/brse-desktop-agent.py`
- Trigger: global hotkey `ctrl+alt+space`
- Flow:
  1. User selects text in any desktop app.
  2. Desktop agent copies selected text through clipboard.
  3. Agent sends request to BrSE API: `http://127.0.0.1:3010/api/ai/chat` by default.
  4. Agent shows answer in local Tkinter popup.
- Auth: optional `BRSE_API_SECRET` env var, sent as `X-BrSE-Token` when set.
- Scope: local-only helper. No fake claim that Chrome extension runs inside desktop apps.

## Future path: Chrome Native Messaging host

- Add native host manifest installed on machine.
- Let extension call `chrome.runtime.connectNative(...)` after user action.
- Native host can read selected text, call local BrSE API, and return result to side panel/popup.
- Keep permissions narrow:
  - Use `activeTab` + dynamic web injection for websites.
  - Use native messaging only for desktop handoff.
  - Do not add always-on desktop capture.

## Safety rules

- No silent desktop capture.
- No background scraping of every app/window.
- User action required: hotkey, side panel button, context menu, or explicit native messaging request.
- API target stays canonical: `http://127.0.0.1:3010/api`.
- If public tunnel mode is used later, require `BRSE_API_SECRET` instead of weak fallback secrets.
