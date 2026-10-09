#!/usr/bin/env bash
set -euo pipefail

port="${OLLAMA_DOCKER_PORT:-11435}"
host="${OLLAMA_DOCKER_HOST:-0.0.0.0:${port}}"
log_file=".run/ollama-${port}.log"

mkdir -p .run

if ss -ltn | grep -q ":${port}\\b"; then
  echo "Ollama Docker sidecar is already listening on ${port}."
else
  if command -v systemd-run >/dev/null 2>&1 && systemctl --user status >/dev/null 2>&1; then
    systemd-run --user \
      --unit=brse-ollama-docker \
      --setenv="OLLAMA_HOST=${host}" \
      /usr/local/bin/ollama serve >/dev/null
  else
    OLLAMA_HOST="${host}" nohup ollama serve >"${log_file}" 2>&1 &
  fi
  sleep 1
fi

OLLAMA_HOST="http://127.0.0.1:${port}" ollama list
