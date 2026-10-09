#!/usr/bin/env bash
# ============================================================
# BrSE OS — Script cài đặt trên máy mới
# Chạy một lần sau khi giải nén zip: bash scripts/setup-new-machine.sh
# Yêu cầu: Docker + Docker Compose đã cài
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

section() { printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"; }

# 1. Kiểm Docker
section "Kiểm tra Docker"
docker info >/dev/null 2>&1 || { echo "❌ Docker chưa chạy. Hãy khởi động Docker Desktop rồi thử lại."; exit 1; }
echo "✅ Docker OK"

# 2. Tạo .env từ template
section "Cấu hình .env"
if [ -f ".env" ]; then
  echo "⚠️  File .env đã tồn tại — giữ nguyên (không ghi đè)."
  echo "   Nếu muốn reset, xóa .env rồi chạy lại script này."
else
  cp .env.new-machine .env
  echo "✅ Đã tạo .env từ .env.new-machine"
  echo "   → Hãy chỉnh OPENAI_API_KEY / NINE_ROUTER_API_KEY nếu có 9Router"
fi

# 2b. Khôi phục 9router (AI router + toàn bộ key) nếu được đóng gói kèm
section "Khôi phục 9router (AI router + key)"
if [ -d "ninerouter/9router-pkg" ] || [ -d "ninerouter/dot-9router" ]; then
  if command -v node >/dev/null 2>&1; then
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null || echo "⚠️  Node hiện tại < 18 — 9router cần Node >= 18."
  else
    echo "⚠️  Chưa có Node.js — cài Node >= 18 rồi chạy lại để dùng 9router (BrSE vẫn chạy được không có 9router nếu dùng Ollama/cloud)."
  fi

  if [ -d "ninerouter/9router-pkg" ]; then
    PKG_DEST="$HOME/.npm-global/lib/node_modules/9router"
    BIN_DEST="$HOME/.npm-global/bin"
    mkdir -p "$PKG_DEST" "$BIN_DEST"
    cp -a ninerouter/9router-pkg/. "$PKG_DEST/"
    ln -sf "$PKG_DEST/cli.js" "$BIN_DEST/9router"
    chmod +x "$PKG_DEST/cli.js" 2>/dev/null || true
    echo "✅ 9router package → $PKG_DEST"
    case ":$PATH:" in
      *":$BIN_DEST:"*) ;;
      *) echo "   → Thêm vào PATH: echo 'export PATH=\$HOME/.npm-global/bin:\$PATH' >> ~/.bashrc && source ~/.bashrc" ;;
    esac
  fi

  if [ -d "ninerouter/dot-9router" ]; then
    mkdir -p "$HOME/.9router"
    # -n: không ghi đè config 9router đã có trên máy (giữ key đang dùng nếu có).
    cp -rn ninerouter/dot-9router/. "$HOME/.9router/" 2>/dev/null || true
    echo "✅ 9router config/key/runtime → ~/.9router (db/ SQLite tự tạo lại từ db.json)"
    # Seed cho cả launcher PM2: ecosystem.config.js đọc DATA_DIR=.run/9router-data.
    # Nếu máy mới có PM2, start-brse-stack sẽ dùng đường đó — nên copy sẵn
    # config + runtime (native modules) vào đây để khỏi build lại. Không ảnh
    # hưởng đường CLI (đọc ~/.9router). Bỏ qua nếu đã có.
    if [ ! -d "$ROOT_DIR/.run/9router-data" ]; then
      mkdir -p "$ROOT_DIR/.run/9router-data"
      cp -rn ninerouter/dot-9router/. "$ROOT_DIR/.run/9router-data/" 2>/dev/null || true
      echo "✅ Seed .run/9router-data cho launcher PM2 (config + runtime)"
    fi
  fi
else
  echo "ℹ️  Không có gói 9router kèm theo — bỏ qua (cấu hình AI qua .env / Settings)."
fi

# 3. Build, rồi khởi động RIÊNG database trước
#    Quan trọng: backend tự chạy alembic upgrade + create_all khi khởi động
#    (xem backend/app/main.py). Nếu bật cả stack rồi mới import, backend đã tạo
#    sẵn bảng rỗng + alembic_version → import dump xung đột "already exists" và
#    đua (race) với migration → glossary trống, backend lỗi. Vì vậy nạp dữ liệu
#    vào DB sạch TRƯỚC, rồi mới khởi động backend/frontend.
section "Build BrSE OS"
docker compose build --quiet
echo "✅ Build xong"

section "Khởi động database (trước, để nạp dữ liệu sạch)"
docker compose up -d db
echo "✅ Database container đang chạy"

# 4. Chờ DB sẵn sàng
section "Chờ database sẵn sàng"
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U brse -d brse >/dev/null 2>&1; then
    echo "✅ Database sẵn sàng (${i}s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ Database không khởi động được sau 30s. Kiểm tra: docker compose logs db"
    exit 1
  fi
  sleep 1
done

# 5. Import dữ liệu (glossary 2200+ từ + toàn bộ dữ liệu) vào DB sạch
#    Dump tạo bằng pg_dump --clean --if-exists nên tự DROP rồi CREATE lại, an
#    toàn cả khi chạy lại. ON_ERROR_STOP=1 để lỗi thật sự thì dừng ngay thay vì
#    nạp nửa vời rồi báo "thành công" giả.
section "Import dữ liệu (glossary + notes)"
if [ -f "backup/brse-full-backup.sql" ]; then
  if docker compose exec -T db psql -v ON_ERROR_STOP=1 -U brse -d brse < backup/brse-full-backup.sql; then
    GLOSSARY_COUNT=$(docker compose exec -T db psql -U brse -d brse -At -c "SELECT count(*) FROM glossary_terms" 2>/dev/null || echo "?")
    echo "✅ Import dữ liệu thành công — Glossary: ${GLOSSARY_COUNT} thuật ngữ"
  else
    echo "❌ Import thất bại. Xem lỗi phía trên / docker compose logs db"
    exit 1
  fi
else
  echo "⚠️  Không tìm thấy backup/brse-full-backup.sql — tạo schema trống bằng migration."
fi

# 5b. Khởi động phần còn lại (backend chạy migration = no-op vì DB đã ở head)
section "Khởi động backend + frontend"
docker compose up -d
echo "✅ Stack đang chạy"

# 6. Kiểm tra API
section "Kiểm tra API"
sleep 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:3010/api/health 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ API http://127.0.0.1:3010/api — OK"
else
  echo "⚠️  API chưa phản hồi (HTTP $HTTP). Đợi thêm 10s rồi thử lại..."
  sleep 10
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:3010/api/health 2>/dev/null || echo "000")
  [ "$HTTP" = "200" ] && echo "✅ API OK" || echo "⚠️  API HTTP $HTTP — xem: docker compose logs frontend"
fi

# 7. Khởi động 9router (AI router) nếu đã khôi phục package
#    Dùng CLI (cli.js), KHÔNG chạy thẳng app/server.js. Chỉ CLI mới nạp key từ
#    ~/.9router/db.json vào SQLite runtime (ensureSqliteRuntime), build env
#    runtime và dùng custom-server.js. Chạy thẳng server.js thì server vẫn lên
#    nhưng KHÔNG có key → mọi request AI hỏng. nohup (không TTY) + --skip-update
#    => CLI tự chạy nền, không hỏi menu tương tác.
section "Khởi động 9router (AI router)"
NR_CLI="$HOME/.npm-global/lib/node_modules/9router/cli.js"
if curl -fsS "http://127.0.0.1:20128/v1/models" >/dev/null 2>&1; then
  echo "✅ 9router đã chạy ở :20128"
elif [ -f "$NR_CLI" ] && command -v node >/dev/null 2>&1; then
  mkdir -p "$ROOT_DIR/.run"
  nohup node "$NR_CLI" --port 20128 --host 0.0.0.0 --no-browser --skip-update \
    >"$ROOT_DIR/.run/9router.log" 2>&1 &
  echo "⏳ Đang khởi động 9router (qua CLI, nạp key từ ~/.9router)..."
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:20128/v1/models" >/dev/null 2>&1; then
      echo "✅ 9router online tại :20128 (key đã nạp)"; break
    fi
    sleep 1
  done
  curl -fsS "http://127.0.0.1:20128/v1/models" >/dev/null 2>&1 \
    || echo "⚠️  9router chưa phản hồi sau 30s — xem $ROOT_DIR/.run/9router.log"
else
  echo "ℹ️  Bỏ qua 9router (thiếu package hoặc Node). AI vẫn dùng được qua Ollama/cloud trong Settings."
fi

section "Hoàn tất!"
cat <<'EOF'

🎉 BrSE OS đã sẵn sàng!

  🌐 Web app:  http://127.0.0.1:3010/app
  📡 API:      http://127.0.0.1:3010/api
  🤖 9router:  http://127.0.0.1:20128/v1  (AI router + key đã nạp)

  ▶️  Lần sau khởi động đầy đủ (DB + backend + frontend + 9router):
     bash scripts/start-brse-stack.sh

  📦 Chrome Extension:
     1. Mở chrome://extensions (hoặc coccoc://extensions)
     2. Bật "Developer mode" (góc trên phải)
     3. Bấm "Load unpacked" → chọn thư mục chrome-extension/dist/

  ⚙️  Cấu hình Extension sau khi load:
     - API URL: http://127.0.0.1:3010/api  (đã là mặc định)
     - Secret token: để trống (nếu chưa đặt BRSE_API_SECRET trong .env)
     - Bấm Save → dùng ngay

  📖 Xem thêm: docs/DEVELOPER_GUIDE.md

EOF
