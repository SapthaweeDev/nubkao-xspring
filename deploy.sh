#!/usr/bin/env bash
# deploy.sh — Build and prepare Next.js standalone for Plesk Node.js hosting
# Run this script on the Plesk server after cloning / pulling the latest code.
set -euo pipefail

# ── 0. Load .env file if present ─────────────────────────────────────────────
if [ -f ".env" ]; then
  echo "[deploy] Loading environment from .env…"
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

# Check if DB vars are available (Plesk injects them into Node.js app, not shell)
_DB_AVAILABLE=true
for _VAR in DATABASE_HOST DATABASE_USER DATABASE_PASSWORD DATABASE_NAME; do
  if [ -z "${!_VAR:-}" ]; then
    _DB_AVAILABLE=false
    break
  fi
done

# ── 1. Detect package manager ─────────────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  PKG="pnpm"
  INSTALL_ARGS="install --frozen-lockfile"
else
  echo "[deploy] pnpm not found – falling back to npm"
  PKG="npm"
  INSTALL_ARGS="install --legacy-peer-deps"
fi
echo "[deploy] Using package manager: $PKG"

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "[deploy] Installing dependencies…"
$PKG $INSTALL_ARGS

# ── 3. Generate Prisma client ─────────────────────────────────────────────────
echo "[deploy] Generating Prisma client…"
npx prisma generate

# ── 4. Apply database migrations ─────────────────────────────────────────────
if [ "$_DB_AVAILABLE" = "true" ]; then
  echo "[deploy] Applying database migrations…"
  if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)
    if echo "$MIGRATE_STATUS" | grep -qi "not empty\|schema is not empty\|baseline"; then
      FIRST_MIG=$(ls prisma/migrations | sort | head -1)
      echo "[deploy] Baselining first migration against existing schema: $FIRST_MIG"
      npx prisma migrate resolve --applied "$FIRST_MIG"
    fi
    npx prisma migrate deploy
  else
    echo "[deploy] No migrations directory found – syncing schema with db push…"
    npx prisma db push
  fi
else
  echo "[deploy] WARNING: DATABASE_* vars not set in shell – skipping DB migration."
  echo "[deploy]          DB migration will use vars from Plesk when the app starts."
  echo "[deploy]          Run 'npx prisma db push' manually via SSH if needed."
fi

# ── 5. Build Next.js (standalone) ────────────────────────────────────────────
echo "[deploy] Building Next.js…"
$PKG run build

# ── 6. Copy static assets into standalone output ─────────────────────────────
echo "[deploy] Copying static assets into standalone bundle…"
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo ""
echo "✓ Build complete."
echo ""
echo "════════════════════════════════════════════════════════════════"
echo " Plesk Node.js — การตั้งค่าหลังจาก deploy เสร็จ"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📁 ขั้นตอนที่ 1 — Build & Copy ไฟล์ (ทำแล้วอัตโนมัติโดย script นี้)"
echo "  ✓ pnpm build                          → สร้าง standalone output ใน .next/standalone/"
echo "  ✓ cp -r public .next/standalone/      → copy ไฟล์ static public"
echo "  ✓ cp -r .next/static .next/standalone/.next/ → copy ไฟล์ static assets"
echo ""
echo "⚙️  ขั้นตอนที่ 2 — ตั้งค่า Plesk Node.js Application"
echo "  เปิด Plesk → Domains → <domain> → Node.js แล้วตั้งค่าดังนี้:"
echo ""
echo "  Application root:         $(pwd)"
echo "  Application startup file: .next/standalone/server.js"
echo "  Node.js version:          >= 20"
echo ""
echo "🌐 ขั้นตอนที่ 3 — Environment Variables"
echo "  เพิ่มตัวแปรเหล่านี้ใน Plesk → Node.js → Environment Variables:"
echo ""
echo "  NODE_ENV=production"
echo "  PORT=3000"
echo "  DATABASE_HOST=<host>:<port>"
echo "  DATABASE_USER=<user>"
echo "  DATABASE_PASSWORD=<password>"
echo "  DATABASE_NAME=<database>"
echo "  NEXT_PUBLIC_ADMIN_PIN=<pin>"
echo ""
echo "🔄 ขั้นตอนที่ 4 — Restart Application"
echo "  กด Restart ใน Plesk → Node.js เพื่อโหลด server ใหม่"
echo ""
echo "════════════════════════════════════════════════════════════════"
