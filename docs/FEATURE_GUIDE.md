# BrSE OS Feature Guide

BrSE OS is a localhost-first cockpit for one BrSE user. Scope: daily work, not SaaS, not team/cloud/auth.

## Main Workflow

1. Open Dashboard for today, meetings, todos, risks, and quick links.
2. Use Meeting Note AI for transcript upload, summary, decisions, actions, and glossary extraction.
3. Convert meeting actions into BrSE Todo items.
4. Use Operations and Reports for project status, blockers, and stakeholder updates.
5. Use Knowledge and Glossary for reusable project context.
6. Use Chrome Extension sidecar for browser-page assistance through local API.

## Core Surfaces

- Dashboard: daily cockpit and status overview.
- Project Settings: project metadata and local configuration.
- BrSE Todo: tasks, owners, due dates, meeting-derived work.
- Operations: risks, blockers, operational notes.
- Reports: status/report drafting for BrSE communication.
- Meeting Note AI: upload/transcribe/summarize/export minutes.
- Calendar: schedule and meeting context.
- Knowledge: reusable notes and reference material.
- Power Tools: local utilities.
- Communication Tools: email/comment/chat drafting.

## Glossary Rules

- Runtime glossary terms belong to `GlossaryTerm`.
- Generic knowledge articles belong to `KnowledgeItem`.
- Meeting glossary extraction writes to `GlossaryTerm`.
- Knowledge search may link to glossary terms later, but must not become a second glossary store silently.
- Chrome Extension term matching uses backend glossary API first, local cache fallback second.
- Short abbreviations need exact/word-boundary matching to avoid false positives.

## Chrome Extension Rules

- Default API is `http://127.0.0.1:3010/api`.
- Do not silently send full page text to AI.
- Do not auto-send email, chat, or comments. Generate, preview, confirm.
- Keep logic split into `shared/`, `adapters/`, and `ui/`.
- Do not widen permissions without explicit need.
- OCR must auto-detect the source language. The editor shows exactly four text
  views: original language, Japanese, Vietnamese, and English.
- OCR original view is the copy-code view. Keep source text, punctuation,
  casing, line breaks, and approximate indentation there; translations must not
  overwrite the original text view. Preserve columns only for real code-like
  screenshots; normal web UI captures such as file lists must render in natural
  reading order without artificial indentation.
- AI Keigo inline helper on web inputs must stay compact: icon-only by default,
  with the full label in tooltip/popover so it does not cover typed text.

## Desktop App Boundary

- The Chrome Extension works inside Chrome web pages, extension popup, side panel, and extension-owned overlays only.
- It cannot inject UI into native desktop apps such as Word, Excel, Teams desktop, VS Code, or non-Chrome browsers.
- Desktop-app support needs a separate local companion design: global hotkey, clipboard capture, local overlay window, and explicit user confirmation before sending text to AI.
- Until that companion exists, describe desktop workflows as clipboard/manual handoff, not as Chrome Extension support.
- Any future desktop companion must keep data local by default, reuse `http://127.0.0.1:3010/api`, and have its own QA/security checklist.
