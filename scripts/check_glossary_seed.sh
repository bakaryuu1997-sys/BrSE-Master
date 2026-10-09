#!/usr/bin/env bash
# Validate all bundled glossary seed batches (keys, globally-unique ids and
# (jp,en) pairs). When the db container is reachable, also check that no NEW
# seed entry would collide with an existing row's (japanese, english) pair.
#
# DB-independent on purpose so it can run inside verify-brse.sh even in --quick
# mode (no stack running). Run from repo root:
#   bash scripts/check_glossary_seed.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEEDS_DIR="$ROOT_DIR/backend/app/seeds"

db_up() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose -f "$ROOT_DIR/docker-compose.yml" ps --status running db 2>/dev/null \
    | grep -q db
}

if db_up; then
  PAIRS="$(mktemp)"
  IDS="$(mktemp)"
  trap 'rm -f "$PAIRS" "$IDS"' EXIT
  docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db \
    psql -U brse -d brse -At -F $'\t' \
    -c "SELECT japanese, english FROM glossary_terms" > "$PAIRS"
  docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db \
    psql -U brse -d brse -At \
    -c "SELECT id FROM glossary_terms" > "$IDS"
  echo "db reachable: pairs=$(wc -l < "$PAIRS"), ids=$(wc -l < "$IDS")"
  python3 "$ROOT_DIR/scripts/check_glossary_seed.py" "$SEEDS_DIR" \
    --db-pairs "$PAIRS" --db-ids "$IDS"
else
  echo "db container not running -> file-only seed consistency check"
  python3 "$ROOT_DIR/scripts/check_glossary_seed.py" "$SEEDS_DIR"
fi
