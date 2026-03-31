#!/usr/bin/env bash
# deploy.sh — Build and prepare Next.js standalone for Plesk Node.js hosting
# Run this script on the Plesk server after cloning / pulling the latest code.
set -euo pipefail

# ── 1. Ensure pnpm is available ───────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "[deploy] pnpm not found – installing via corepack…"
  corepack enable
  corepack prepare pnpm@latest --activate
fi

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "[deploy] Installing dependencies…"
pnpm install --frozen-lockfile

# ── 3. Generate Prisma client ─────────────────────────────────────────────────
echo "[deploy] Generating Prisma client…"
npx prisma generate

# ── 4. Apply database migrations ─────────────────────────────────────────────
echo "[deploy] Applying database migrations…"
npx prisma migrate deploy

# ── 5. Build Next.js (standalone) ────────────────────────────────────────────
echo "[deploy] Building Next.js…"
pnpm build

# ── 6. Copy static assets into standalone output ─────────────────────────────
echo "[deploy] Copying static assets into standalone bundle…"
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo ""
echo "✓ Build complete."
echo ""
echo "Plesk Node.js settings:"
echo "  Application root:         $(pwd)"
echo "  Application startup file: .next/standalone/server.js"
echo "  Node.js version:          >= 20"
echo ""
echo "Set the following environment variables in Plesk → Node.js → Environment Variables:"
echo "  NODE_ENV=production"
echo "  PORT=3000"
echo "  DATABASE_HOST=<host>:<port>"
echo "  DATABASE_USER=<user>"
echo "  DATABASE_PASSWORD=<password>"
echo "  DATABASE_NAME=<database>"
echo "  NEXT_PUBLIC_ADMIN_PIN=<pin>"
