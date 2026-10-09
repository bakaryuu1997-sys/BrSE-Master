#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.run"
# Paths default to the current user's $HOME so the stack is portable across
# machines/usernames (still overridable via env for non-standard installs).
NINE_ROUTER_BIN="${NINE_ROUTER_BIN:-$HOME/.npm-global/bin/9router}"
NINE_ROUTER_SERVER="${NINE_ROUTER_SERVER:-$HOME/.npm-global/lib/node_modules/9router/app/server.js}"
NINE_ROUTER_APP_DIR="${NINE_ROUTER_APP_DIR:-$HOME/.npm-global/lib/node_modules/9router/app}"
NINE_ROUTER_PORT="${NINE_ROUTER_PORT:-20128}"
NINE_ROUTER_HOST="${NINE_ROUTER_HOST:-0.0.0.0}"
NINE_ROUTER_DATA_DIR="${NINE_ROUTER_DATA_DIR:-$LOG_DIR/9router-data}"
NINE_ROUTER_RUNTIME="${NINE_ROUTER_RUNTIME:-$NINE_ROUTER_DATA_DIR/runtime}"
NINE_ROUTER_LEGACY_DATA_DIR="${NINE_ROUTER_LEGACY_DATA_DIR:-$HOME/.9router}"
NINE_ROUTER_SHIM_DIR="$LOG_DIR/9router-shims"

mkdir -p "$LOG_DIR"
mkdir -p "$NINE_ROUTER_DATA_DIR"
mkdir -p "$NINE_ROUTER_SHIM_DIR"

# Start Ollama serve if not already running
echo "[BrSE] Checking Ollama service..."
if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1 || curl -s http://host.docker.internal:11434/api/tags >/dev/null 2>&1; then
  echo "[BrSE] Ollama service is online."
else
  echo "[BrSE] Ollama service not detected on port 11434. Please ensure either Ollama on Windows or WSL Ollama service is running."
fi

cat >"$NINE_ROUTER_SHIM_DIR/npm" <<'SH'
#!/usr/bin/env bash
echo "[BrSE] Skip optional 9router native runtime install in autostart mode." >&2
exit 1
SH
chmod +x "$NINE_ROUTER_SHIM_DIR/npm"
if [ -f "$NINE_ROUTER_LEGACY_DATA_DIR/db.json" ] && [ ! -f "$NINE_ROUTER_DATA_DIR/db.json" ]; then
  # Mirror the decryption-critical config (not just db.json) into the redirected
  # DATA_DIR so encrypted provider keys still decrypt; the db/ SQLite store
  # re-migrates from db.json on first start.
  for item in db.json db.json.bak jwt-secret machine-id auth; do
    [ -e "$NINE_ROUTER_LEGACY_DATA_DIR/$item" ] \
      && cp -r "$NINE_ROUTER_LEGACY_DATA_DIR/$item" "$NINE_ROUTER_DATA_DIR/" 2>/dev/null || true
  done
fi
export DATA_DIR="$NINE_ROUTER_DATA_DIR"
export NODE_PATH="${NODE_PATH:-$NINE_ROUTER_RUNTIME/node_modules:$NINE_ROUTER_APP_DIR/node_modules}"
export PATH="$NINE_ROUTER_SHIM_DIR:$PATH"

echo "[BrSE] Starting Docker services..."
cd "$ROOT_DIR"

# Wait for Docker daemon to be ready (critical on cold system boot)
echo "[BrSE] Waiting for Docker daemon to be ready..."
for i in {1..30}; do
  if docker info >/dev/null 2>&1; then
    echo "[BrSE] Docker daemon is ready."
    break
  fi
  echo "[BrSE] Docker daemon not ready yet, waiting 1s..."
  sleep 1
done

docker compose up -d db backend frontend

# Cloudflare tunnel is opt-in: it exposes the app publicly, so it does not start
# by default. Enable it explicitly when you want remote access.
if [ "${BRSE_ENABLE_TUNNEL:-0}" = "1" ]; then
  echo "[BrSE] BRSE_ENABLE_TUNNEL=1 -> starting Cloudflare tunnel (profile: tunnel)."
  docker compose --profile tunnel up -d cloudflared
else
  echo "[BrSE] Cloudflare tunnel disabled (set BRSE_ENABLE_TUNNEL=1 to expose the app publicly)."
fi

# Unified autostart using PM2 if available to prevent port collisions
PM2_BIN="/home/bakaryuu/.nvm/versions/node/v22.22.0/bin/pm2"
if [ ! -x "$PM2_BIN" ] && command -v pm2 >/dev/null 2>&1; then
  PM2_BIN="$(command -v pm2)"
fi

if [ -x "$PM2_BIN" ]; then
  echo "[BrSE] PM2 detected! Orchestrating 9router and sidecar using scripts/ecosystem.config.js..."
  "$PM2_BIN" start "$ROOT_DIR/scripts/ecosystem.config.js"
  exit 0
fi

if curl -fsS "http://127.0.0.1:${NINE_ROUTER_PORT}/v1/models" >/dev/null 2>&1; then
  echo "[BrSE] 9router already online at :${NINE_ROUTER_PORT}."
  exit 0
fi

echo "[BrSE] Starting 9router at :${NINE_ROUTER_PORT}..."
# Prefer the 9router CLI: it runs ensureSqliteRuntime (builds the SQLite runtime
# from ~/.9router/db.json so API keys load) and picks custom-server.js. Launching
# app/server.js directly only works when the runtime was already built (present
# on this machine, absent on a fresh machine), so it is a legacy fallback.
if [ -x "$NINE_ROUTER_BIN" ]; then
  nohup "$NINE_ROUTER_BIN" -p "$NINE_ROUTER_PORT" -H "$NINE_ROUTER_HOST" -n --skip-update --log >"$LOG_DIR/9router.log" 2>&1 &
elif [ -f "$NINE_ROUTER_SERVER" ]; then
  (
    cd "$NINE_ROUTER_APP_DIR"
    if command -v setsid >/dev/null 2>&1; then
      PORT="$NINE_ROUTER_PORT" HOSTNAME="$NINE_ROUTER_HOST" DATA_DIR="$NINE_ROUTER_DATA_DIR" NODE_PATH="$NODE_PATH" \
        setsid -f node --max-old-space-size=6144 "$NINE_ROUTER_SERVER" >"$LOG_DIR/9router.log" 2>&1
    else
      PORT="$NINE_ROUTER_PORT" HOSTNAME="$NINE_ROUTER_HOST" DATA_DIR="$NINE_ROUTER_DATA_DIR" NODE_PATH="$NODE_PATH" \
        nohup node --max-old-space-size=6144 "$NINE_ROUTER_SERVER" >"$LOG_DIR/9router.log" 2>&1 &
    fi
  )
else
  nohup npx --yes 9router@latest -p "$NINE_ROUTER_PORT" -H "$NINE_ROUTER_HOST" -n --log >"$LOG_DIR/9router.log" 2>&1 &
fi

echo "[BrSE] Waiting for 9router..."
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${NINE_ROUTER_PORT}/v1/models" >/dev/null 2>&1; then
    echo "[BrSE] 9router online."
    exit 0
  fi
  sleep 1
done

echo "[BrSE] 9router did not become ready. Check $LOG_DIR/9router.log"
exit 1
