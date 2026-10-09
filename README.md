# BrSE OS

Personal localhost-first cockpit for BrSE work: meetings, todos, operations, reports, glossary, knowledge, and Chrome Extension sidecar.

## Start Here

- Canonical direction: [docs/PROJECT_SOURCE_OF_TRUTH.md](docs/PROJECT_SOURCE_OF_TRUTH.md)
- Active backlog: [docs/goal.md](docs/goal.md)
- Agent rules: [AGENTS.md](AGENTS.md)
- Docs index: [docs/README.md](docs/README.md)
- Verification commands: [docs/QA_RELEASE.md](docs/QA_RELEASE.md)

## Runtime Map

- App: `http://127.0.0.1:3010/app`
- Browser/Extension API: `http://127.0.0.1:3010/api`
- 9router host runtime: `http://127.0.0.1:20128/v1`
- Ollama Docker sidecar for backend: `http://host.docker.internal:11435`

Do not point the Chrome Extension at `8000/api`; use `3010/api`.

## Start Local Stack

```bash
bash scripts/start-brse-stack.sh
docker compose up -d backend frontend
```

If Qwen/Ollama is used from the Docker backend, make sure the sidecar is active:

```bash
bash scripts/start-ollama-docker-sidecar.sh
```

## Verify

```bash
cd frontend && npm run typecheck
cd ../backend && venv/bin/python -m ruff check app tests
curl -fsS 'http://127.0.0.1:3010/api/ai/status?check_runtime=true'
```

For full verification, use [docs/QA_RELEASE.md](docs/QA_RELEASE.md).

One-command gate:

```bash
bash scripts/verify-brse.sh
```
