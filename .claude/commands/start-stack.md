---
description: Start the full local BrSE stack (db, backend, frontend, cloudflared)
---

Start the local stack:

```bash
bash scripts/start-brse-stack.sh
```

This brings up the Docker services (db, backend, frontend, cloudflared), starts
9router on port 20128, and checks Ollama on 11434. It waits for the Docker
daemon on cold boot and uses PM2 when available.

Notes:
- The script can take a while on first boot while Docker warms up — do not
  assume failure if it is still waiting on the daemon.
- After it reports ready, the browser app is at `http://127.0.0.1:3010/app` and
  the API proxy at `http://127.0.0.1:3010/api`.
- If Ollama is not running, start the sidecar with
  `bash scripts/start-ollama-docker-sidecar.sh`.

Report what came up and any service that failed its health check.
