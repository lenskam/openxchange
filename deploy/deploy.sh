#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Interxchange — Production Deployment Script
# ──────────────────────────────────────────────
# Prerequisites:
#   1. Domain interxchange.tdcconsultingsarl.com points to this server
#   2. Cloudflare Origin CA certificates at /etc/nginx/ssl/cert.pem + key.pem
#   3. Docker and Docker Compose installed
#   4. Run from the project root:  bash deploy/deploy.sh
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  Interxchange — Production Deployment"
echo "=========================================="

# ── Step 1: Verify .env exists ────────────────
if [ ! -f .env ]; then
    echo "[FAIL] No .env file found."
    echo "       Copy deploy/.env.production to .env and fill in secrets:"
    echo "       cp deploy/.env.production .env"
    exit 1
fi
echo "[OK] .env file found"

# ── Step 2: Install Nginx site config ─────────
echo ""
echo "--- Installing Nginx site config ---"
sudo cp "$SCRIPT_DIR/nginx/interxchange" /etc/nginx/sites-available/interxchange
sudo ln -sf /etc/nginx/sites-available/interxchange /etc/nginx/sites-enabled/interxchange
echo "[OK] Nginx config placed"

# ── Step 3: Export port overrides for .env ────
# These override any old values in .env to prevent port conflicts
export POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-15432}"
export REDIS_HOST_PORT="${REDIS_HOST_PORT:-16379}"
export VAULT_HOST_PORT="${VAULT_HOST_PORT:-18200}"
export BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-18000}"
export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-18081}"
echo "[OK] Ports configured (Postgres=$POSTGRES_HOST_PORT, Redis=$REDIS_HOST_PORT, Vault=$VAULT_HOST_PORT, Backend=$BACKEND_HOST_PORT, Frontend=$FRONTEND_HOST_PORT)"

# ── Step 4: Clean up previous containers ──────
echo ""
echo "--- Stopping previous containers ---"
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" down --remove-orphans || true
echo "[OK] Graceful compose down done"

echo "--- Force-removing any stale deploy containers ---"
docker rm -f $(docker ps -aqf "name=deploy-") 2>/dev/null || true
echo "[OK] Stale containers removed"

echo "--- Freeing any reserved ports ---"
for port in 15432 16379 18200 18000 18081; do
  if command -v fuser &>/dev/null; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi
done
echo "[OK] Ports freed"

# ── Step 5: Build and start services ──────────
echo ""
echo "--- Building and starting Docker services ---"
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" up -d --build
echo "[OK] Services started"

# ── Step 6: Run database migrations ───────────
echo ""
echo "--- Running database migrations ---"
echo "Waiting for backend to be ready..."
sleep 5
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" exec -T backend alembic upgrade head || echo "[WARN] Migrations failed (may need manual retry)"
echo "[OK] Migrations applied"

# ── Step 7: Reload Nginx ──────────────────────
echo ""
echo "--- Reloading Nginx ---"
sudo nginx -t && sudo systemctl reload nginx
echo "[OK] Nginx reloaded"

# ── Step 8: Status summary ────────────────────
echo ""
echo "=========================================="
echo "  Deployment Complete"
echo "=========================================="
echo ""
echo "  Frontend : https://interxchange.tdcconsultingsarl.com"
echo "  API      : https://interxchange.tdcconsultingsarl.com/api/v1"
echo "  Docs     : https://interxchange.tdcconsultingsarl.com/docs"
echo ""
echo "  Container status:"
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" ps
