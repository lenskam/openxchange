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

# ── Step 3: Build and start services ──────────
echo ""
echo "--- Building and starting Docker services ---"
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" up -d --build
echo "[OK] Services started"

# ── Step 4: Run database migrations ───────────
echo ""
echo "--- Running database migrations ---"
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" exec -T backend alembic upgrade head
echo "[OK] Migrations applied"

# ── Step 5: Reload Nginx ──────────────────────
echo ""
echo "--- Reloading Nginx ---"
sudo nginx -t && sudo systemctl reload nginx
echo "[OK] Nginx reloaded"

# ── Step 6: Status summary ────────────────────
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
