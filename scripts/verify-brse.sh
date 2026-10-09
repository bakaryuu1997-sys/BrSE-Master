#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_RUNTIME=1
RUN_BUILD=1

for arg in "$@"; do
  case "$arg" in
    --skip-runtime)
      RUN_RUNTIME=0
      ;;
    --skip-build)
      RUN_BUILD=0
      ;;
    --quick)
      RUN_RUNTIME=0
      RUN_BUILD=0
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: bash scripts/verify-brse.sh [--quick] [--skip-build] [--skip-runtime]

Default:
  - Frontend lint, typecheck, test, build
  - Backend Ruff, pytest collection, pytest
  - Chrome Extension tests, JavaScript syntax check, build
  - Project shell/Python script syntax checks
  - Local runtime smoke for 3010 API, Ollama sidecar, and 9router

Options:
  --quick         Skip build and runtime smoke.
  --skip-build    Skip frontend production build.
  --skip-runtime  Skip localhost runtime smoke.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

section() {
  printf '\n== %s ==\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 127
  fi
}

require_cmd npm
require_cmd node
require_cmd python3
require_cmd rg
require_cmd curl

section "Frontend lint"
(cd "$ROOT_DIR/frontend" && npm run lint)

section "Frontend typecheck"
(cd "$ROOT_DIR/frontend" && npm run typecheck)

section "Frontend tests"
(cd "$ROOT_DIR/frontend" && npm run test)

if [ "$RUN_BUILD" -eq 1 ]; then
  section "Frontend production build"
  (cd "$ROOT_DIR/frontend" && npm run build)
fi

section "Backend Ruff"
(cd "$ROOT_DIR/backend" && venv/bin/python -m ruff check app tests)

section "Backend pytest collection"
(cd "$ROOT_DIR/backend" && venv/bin/python -m pytest --collect-only)

section "Backend tests"
(cd "$ROOT_DIR/backend" && venv/bin/python -m pytest)

section "Chrome Extension JavaScript syntax"
(cd "$ROOT_DIR" && rg --files chrome-extension/src -g '*.js' | xargs -r -n1 node --check)

section "Chrome Extension tests"
(cd "$ROOT_DIR/chrome-extension" && npm run test)

if [ "$RUN_BUILD" -eq 1 ]; then
  section "Chrome Extension production build"
  (cd "$ROOT_DIR/chrome-extension" && npm run build)
fi

section "Shared API contract"
(cd "$ROOT_DIR" && node scripts/check-api-contract.cjs)

section "Glossary seed consistency"
(cd "$ROOT_DIR" && bash scripts/check_glossary_seed.sh)

section "Project script syntax"
(cd "$ROOT_DIR" && bash -n scripts/*.sh)
(cd "$ROOT_DIR" && python3 -m py_compile scripts/brse-desktop-agent.py scripts/patch_sqlite_aliases.py)

if [ "$RUN_RUNTIME" -eq 1 ]; then
  section "Ollama Docker sidecar"
  (cd "$ROOT_DIR" && bash scripts/start-ollama-docker-sidecar.sh)

  section "Frontend API proxy health"
  curl -fsS 'http://127.0.0.1:3010/api/health' >/dev/null

  section "AI runtime status"
  curl -fsS 'http://127.0.0.1:3010/api/ai/status?check_runtime=true' | python3 -c '
import json
import sys

data = json.load(sys.stdin)
if not data.get("runtime_reachable"):
    raise SystemExit(f"AI runtime is not reachable: {data}")
print(json.dumps({
    "provider": data.get("provider"),
    "model": data.get("model"),
    "runtime_reachable": data.get("runtime_reachable"),
    "runtime_model_available": data.get("runtime_model_available"),
}, ensure_ascii=False))
'

  section "AI chat smoke"
  curl -fsS \
    -X POST 'http://127.0.0.1:3010/api/ai/chat' \
    -H 'Content-Type: application/json' \
    -d '{"message":"Tra loi ngan bang tieng Viet: ping ok?"}' | python3 -c '
import json
import sys

data = json.load(sys.stdin)
reply = data.get("reply") or ""
if not reply.strip():
    raise SystemExit(f"AI chat returned empty reply: {data}")
print(json.dumps({
    "provider": data.get("provider"),
    "model": data.get("model"),
    "reply_preview": reply[:80],
}, ensure_ascii=False))
'

  section "9router model list"
  curl -fsS 'http://127.0.0.1:20128/v1/models' >/dev/null
fi

section "BrSE verification complete"
