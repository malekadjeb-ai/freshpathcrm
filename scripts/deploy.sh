#!/bin/bash
set -e

echo "=== Fresh Path CRM — Cloudflare Workers Deploy ==="
echo ""

# 1. Generate Drizzle migrations (if schema changed)
echo "[1/5] Generating Drizzle migrations..."
npx drizzle-kit generate 2>/dev/null || echo "  No new migrations to generate."

# 2. Apply migrations to remote D1
echo "[2/5] Applying migrations to remote D1..."
npx wrangler d1 migrations apply fresh-path-crm --remote

# 3. Build with OpenNext for Cloudflare
echo "[3/5] Building for Cloudflare Workers..."
npx opennextjs-cloudflare build

# 4. Deploy to Cloudflare Workers
echo "[4/5] Deploying to Cloudflare Workers..."
npx wrangler deploy

# 5. Health check
echo "[5/5] Running health check..."
sleep 3
WORKER_URL=$(npx wrangler whoami 2>/dev/null | grep -oP 'https://[^ ]+' || echo "")
if [ -n "$WORKER_URL" ]; then
  curl -s "$WORKER_URL/api/health" | head -c 500
  echo ""
fi

echo ""
echo "=== Deploy complete! ==="
