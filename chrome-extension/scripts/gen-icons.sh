#!/usr/bin/env bash
# Sinh bộ icon PNG 16/32/48/128 từ icon.svg (cần mạng để cài sharp).
# Chạy: bash scripts/gen-icons.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

command -v node >/dev/null || { echo "❌ Cần Node.js"; exit 1; }

if ! node -e "require.resolve('sharp')" 2>/dev/null; then
  echo "📦 Cài sharp..."
  npm i -D sharp
fi

mkdir -p icons
node -e "
const s=require('sharp');
Promise.all([16,32,48,128].map(n=>s('icon.svg').resize(n,n).png().toFile('icons/icon-'+n+'.png')))
  .then(()=>console.log('✅ Đã tạo icons/icon-{16,32,48,128}.png'))
  .catch(e=>{console.error('❌',e.message);process.exit(1)});
"
cat <<'EOF'

➡️  Thêm vào manifest.json:
  "icons": { "16":"icons/icon-16.png","32":"icons/icon-32.png","48":"icons/icon-48.png","128":"icons/icon-128.png" },
  "action": { ..., "default_icon": { "16":"icons/icon-16.png","32":"icons/icon-32.png","48":"icons/icon-48.png","128":"icons/icon-128.png" } }

Rồi: npm run build
EOF
