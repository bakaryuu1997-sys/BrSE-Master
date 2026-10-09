#!/usr/bin/env bash
# ============================================================
# BrSE OS — Đóng gói project + 9router để chuyển sang máy mới
# Chạy: bash scripts/package-for-transfer.sh
# Output: /tmp/brse-os-transfer.tar.gz
#
# Gói gồm: BrSE source, Chrome Extension dist, DB backup (clean dump),
# và TOÀN BỘ 9router (package + config/key) để máy mới chạy ngay.
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUTPUT="${OUTPUT:-/tmp/brse-os-transfer.tar.gz}"
STAGE="$ROOT_DIR/ninerouter"            # gitignored staging for bundled 9router
NINE_ROUTER_PKG="${NINE_ROUTER_PKG:-$HOME/.npm-global/lib/node_modules/9router}"
NINE_ROUTER_CONF="${NINE_ROUTER_CONF:-$HOME/.9router}"

echo "🔄 Đóng gói BrSE OS + 9router..."

# 1. Đảm bảo chrome-extension/dist đã build
if [ ! -d "chrome-extension/dist" ]; then
  echo "⚠️  chrome-extension/dist chưa có — build extension..."
  (cd chrome-extension && npm run build)
fi

# 2. Làm mới DB backup (clean dump) từ DB đang chạy, nếu có
if docker compose exec -T db pg_isready -U brse -d brse >/dev/null 2>&1; then
  mkdir -p backup
  docker compose exec -T db pg_dump -U brse -d brse \
    --clean --if-exists --no-owner --no-privileges > backup/brse-full-backup.sql
  TABLES="$(grep -c '^CREATE TABLE' backup/brse-full-backup.sql || echo '?')"
  echo "✅ DB backup làm mới: ${TABLES} bảng"
else
  echo "⚠️  DB không chạy — giữ backup/brse-full-backup.sql hiện có (nếu có)."
fi

# 3. Stage 9router: package (server + node_modules) + config/key thiết yếu.
#    db/ (SQLite) tự migrate lại từ db.json; bin/ + runtime/ tự tải lại; log bỏ.
rm -rf "$STAGE"
mkdir -p "$STAGE/9router-pkg" "$STAGE/dot-9router"
if [ -d "$NINE_ROUTER_PKG" ]; then
  rsync -a "$NINE_ROUTER_PKG/" "$STAGE/9router-pkg/"
  echo "✅ 9router package: $(du -sh "$STAGE/9router-pkg" | cut -f1)"
else
  echo "⚠️  Không thấy 9router package tại $NINE_ROUTER_PKG — bỏ qua."
fi
if [ -d "$NINE_ROUTER_CONF" ]; then
  # runtime/ = prebuilt native node_modules (better-sqlite3, etc.). Bundling it
  # (x64-linux, matches the target WSL) means the new machine does NOT have to
  # rebuild/download the native runtime — the #1 reason a transferred 9router
  # fails to boot offline. db/ (SQLite logs, up to hundreds of MB) is skipped:
  # it is rebuilt from db.json on first run.
  for item in db.json db.json.bak jwt-secret machine-id auth runtime; do
    [ -e "$NINE_ROUTER_CONF/$item" ] && cp -r "$NINE_ROUTER_CONF/$item" "$STAGE/dot-9router/"
  done
  echo "✅ 9router config/key/runtime: $(du -sh "$STAGE/dot-9router" | cut -f1)"
else
  echo "⚠️  Không thấy ~/.9router — bỏ qua config 9router."
fi

# 4. Tạo tar.gz (loại trừ thư mục nặng/sinh ra lúc chạy)
rm -f "$OUTPUT"
tar -czf "$OUTPUT" \
  --exclude='./.git' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/.next' \
  --exclude='./chrome-extension/node_modules' \
  --exclude='./backend/venv' \
  --exclude='./.run' \
  --exclude='./uploads/*' \
  --exclude='./transcripts/*' \
  --exclude='./memos/*' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  -C "$ROOT_DIR" .

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo ""
echo "✅ Đã tạo: $OUTPUT ($SIZE)"
echo ""
echo "📦 Gồm: Backend + seeds, Frontend, Extension dist, DB backup,"
echo "        và 9router (package + key) — máy mới chạy được mọi tính năng."
echo ""
echo "🚀 Trên máy mới: giải nén → bash scripts/setup-new-machine.sh"
