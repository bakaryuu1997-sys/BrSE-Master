# BrSE OS UI Redesign — "Graphite & Coral" (single theme)

**Date:** 2026-06-26 JST
**Status:** design approved (color direction + scope), pending spec review
**Owner surface:** `frontend/` only. No backend / Chrome Extension changes.

## 1. Problem

The current default theme ("obsidian") is a heavy purple/indigo "cosmic" look:
saturated violet glows, sweep gradients and a dot grid layered on the body. The
user finds it eye-straining, low-contrast, and generic ("every AI builds this blue
look"). Goal: replace it with a **distinctive, calm, high-readability** palette that
avoids the navy/indigo/cyan cliché.

## 2. Decision summary

- **One theme only:** Graphite & Coral (dark). Remove the theme switcher and all
  other `[data-theme]` variants (`obsidian`, `botanical`, `sakura`, `sunset`).
- **Full recolor (3 layers):** CSS tokens + Tailwind hardcoded hex + a sweep of
  ~60 hardcoded blue/violet utility-class usages in components.
- **Flatten the background:** remove cosmic glow / sweep / dot-grid; flat graphite
  with at most a near-invisible vertical gradient.
- Scope is **visual only** — no layout/markup/behavior changes, no new screens.

## 3. Palette — Graphite & Coral

Neutral graphite base (no blue tint) + coral identity, amber secondary, teal success.

| Role | Token(s) | Value |
| --- | --- | --- |
| App background | `--background` | `#121316` |
| Body gradient | `--body-gradient-start/mid/end` | `#15161a` / `#121316` / `#0f1013` |
| Cosmic layers | `--body-glow-a/b/c`, `--body-sweep-a/b`, `--body-dot` | `transparent` (flattened) |
| Surface / card | `--surface` | `#1c1d21` |
| Surface hover | `--surface-hover` | `#232429` |
| Panel bg / strong | `--brse-panel-bg` / `-strong` | `rgba(28,29,33,.78)` / `rgba(18,19,22,.92)` |
| Border | `--border` | `rgba(255,255,255,.08)` |
| Panel border / strong | `--brse-panel-border` / `-strong` | `rgba(255,255,255,.10)` / `rgba(255,107,94,.20)` |
| Hairline / control border | `--brse-hairline-border` / `--brse-control-border` | `rgba(255,255,255,.07)` / `rgba(255,255,255,.14)` |
| Text primary / ink | `--text-primary` / `--ink` | `#ededf0` / `#f3f3f5` |
| Text muted | `--text-muted` | `#a2a3aa` |
| **Primary (coral)** | `--primary` / `--primary-hover` / `--primary-rgb` | `#ff6b5e` / `#ff8266` / `255,107,94` |
| Accent (amber) | `--accent` / `--cyan-rgb` | `#ffb454` / `255,180,84` |
| Success (teal-green) | `--matcha-rgb` | `78,201,165` |
| Warning (amber) | `--amber-rgb` | `255,180,84` |
| Danger (coral-red) | `--vermilion-rgb` | `255,93,108` |
| Secondary coral | `--fuchsia-rgb` | `255,138,125` |

**Category accents** (`--brse-ui-*`, used for chips/icons across the app) remapped
to a cohesive non-blue set:

| Token | Old | New |
| --- | --- | --- |
| `--brse-ui-blue` | `#60a5fa` | `#4ec9a5` (teal) |
| `--brse-ui-cyan` | `#22d3ee` | `#ffb454` (amber) |
| `--brse-ui-sakura` | `#f472b6` | `#ff8da3` (rose) |
| `--brse-ui-violet` | `#a78bfa` | `#e08a5b` (terracotta) |
| `--brse-ui-green` | `#34d399` | `#6cc24a` |
| `--brse-ui-amber` | `#f59e0b` | `#ffb454` |
| `--brse-ui-red` | `#f43f5e` | `#ff5d6c` |

**Nav tokens:** active bg → `rgba(255,107,94,.12)` (coral tint), hover bg →
`rgba(255,255,255,.05)`, nav shadow → `0 10px 28px rgba(0,0,0,.35)` (drop cyan glow).

Note: token *names* are kept (e.g. `--cyan-rgb`) and only their *values* change, so
every `text-accent` / `bg-primary` / shared `brse-*` class recolors automatically.

## 4. Changes by file

### 4.1 `frontend/app/globals.css` (biggest lever)
- Collapse the multiple `[data-theme=...]` blocks into a single `:root` using the
  table above. Delete `botanical` / `sakura` / `sunset` / `obsidian` variant blocks.
- Flatten body background: remove glow/sweep/dot layers (set those tokens
  `transparent`); keep a subtle vertical graphite gradient only.
- Audit any hardcoded violet/indigo/cyan hex inside `globals.css` component classes
  (`brse-button-primary`, `brse-tab`, gradients, glows) → coral/amber.

### 4.2 `frontend/tailwind.config.ts`
- `violet #8b5cf6 → #ff6b5e`, `fuchsia #d946ef → #ff8a7d`, `sky/info #0ea5e9 → #ffb454`.
- `brand-gradient`: `#818cf8→#a855f7` ⇒ `#ff6b5e→#ffb454`.
- `aurora` background-image: indigo+fuchsia radials ⇒ faint coral+amber (or remove).
- `glow-*` box-shadows + `pulseGlow` keyframe: `rgba(99,102,241)/(129,140,248)/cyan`
  ⇒ coral `rgba(255,107,94, …)`.

### 4.3 Component sweep (~60 usages, 22 files)
Remap hardcoded `*-{violet,purple,indigo,fuchsia,cyan,sky,blue}-NNN` utility classes
to the new palette by semantic intent (brand → coral, secondary → amber, positive →
teal). Prefer token-based classes (`text-primary`, `text-accent`, `text-success`)
where the intent is semantic; use explicit coral/amber/teal only for decorative
accents. Heaviest files: `app/app/slides/page.tsx` (13), `features/keigo/*` (~24
across panels/meter), `components/**` (scattered 1–2 each).

### 4.4 Theme switcher removal
- Stop rendering `ThemeSwitcher` (find usage in header/layout) and remove the
  theme-init logic that sets `data-theme` / reads `localStorage["brse-theme"]`.
- `:root` already carries the only theme, so no `data-theme` attribute is needed.
- Delete `frontend/components/ThemeSwitcher.tsx` (and its i18n keys if now unused).

### 4.5 Cleanup
- Remove the throwaway preview files `frontend/public/theme-preview.html` and
  `theme-preview-2.html` before finishing.

## 5. Phasing (each phase independently verifiable)
1. **Tokens + background** (`globals.css`) — collapse to single `:root`, flatten bg.
2. **Tailwind hex** (`tailwind.config.ts`).
3. **Switcher removal** (layout/header + delete component).
4. **Component color sweep** (the 22 files).
5. **Cleanup** preview files.

## 6. Verification
- After each phase: `cd frontend && npm run typecheck`, then focused
  `npx eslint <changed files>`.
- Visual: rebuild/restart the Docker frontend (or `npm run dev`) and eyeball
  Dashboard + 3–4 representative screens (Todo, Knowledge, Keigo, Slides) for
  leftover blue/violet and contrast.
- Final gate before handoff: `bash scripts/verify-brse.sh --skip-runtime`.
- Grep guard: `(text|bg|border|from|to|via|ring)-(violet|purple|indigo|fuchsia|cyan|sky|blue)-[0-9]`
  over `frontend/{app,components,features}` should return only intentional matches.

## 7. Rollback
Pure visual/token change on a feature branch. Rollback = revert the branch; no data,
API, or schema impact. Old themes recoverable from git history if ever wanted.

## 8. Out of scope (YAGNI)
- No light theme (single dark theme chosen). A light "Sand Paper" variant can be a
  later slice if needed.
- No layout, spacing, typography-scale, or component-structure redesign.
- No Chrome Extension or backend restyle.
