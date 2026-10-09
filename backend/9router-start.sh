#!/bin/bash
set -euo pipefail
export TERM=dumb

if command -v 9router >/dev/null 2>&1; then
  exec 9router -p 20128 -n --skip-update
fi

exec npx --yes 9router@latest -p 20128 -n --skip-update
