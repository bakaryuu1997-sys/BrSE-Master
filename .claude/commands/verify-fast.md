---
description: Run the fast BrSE verification gate (quick mode)
---

Run the fast verification gate:

```bash
bash scripts/verify-brse.sh --quick
```

Use this for a quick confidence check during iteration. For TypeScript-only
frontend changes, prefer the even-cheaper `cd frontend && npm run typecheck`
first per the `AGENTS.md` verification ladder.

Report the exact command and a concise pass/fail summary. If a stage fails, show
the relevant output and stop.
