---
description: Run the full BrSE verification gate and report results
---

Run the full project verification gate:

```bash
bash scripts/verify-brse.sh
```

This runs frontend (eslint, typecheck, vitest, build), backend (ruff, pytest),
Chrome Extension (syntax, vitest, build), the API contract check, and runtime
smoke tests.

Report back the exact command run and a concise pass/fail summary per stage. If
anything fails, show the relevant output and stop — do not "fix" unrelated code
to make the gate pass. Follow the verification ladder in `AGENTS.md`: prefer the
smallest check that proves a change; only run this full gate before handoff or
for cross-cutting changes.
