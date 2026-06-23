#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Interxchange — Database Backup Script
# ──────────────────────────────────────────────
# Automates pg_dump of the Interxchange database.
# Designed to be run via cron (daily).
#
# Setup:
#   sudo cp deploy/backup.sh /usr/local/bin/interxchange-backup
#   sudo chmod +x /usr/local/bin/interxchange-backup
#   sudo crontab -e  # add: 0 3 * * * /usr/local/bin/interxchange-backup
# ──────────────────────────────────────────────

BACKUP_DIR="/var/backups/interxchange"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/interxchange_${TIMESTAMP}.sql.gz"
LATEST_LINK="${BACKUP_DIR}/interxchange_latest.sql.gz"

# Source .env from project root (for DB credentials)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    # shellcheck source=/dev/null
    . "$PROJECT_DIR/.env"
    set +a
fi

DB_USER="${POSTGRES_USER:-interxchange}"
DB_PASS="${POSTGRES_PASSWORD:-interxchange}"
DB_NAME="${POSTGRES_DB:-interxchange}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5433}"

echo "=========================================="
echo "  Interxchange — Database Backup"
echo "=========================================="
echo "  Database : ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "  Backup   : ${BACKUP_FILE}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform the dump
echo "--- Running pg_dump ---"
PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_FILE}" \
    2>&1

echo ""
echo "--- Backup completed ---"
echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Update latest symlink
ln -sf "$BACKUP_FILE" "$LATEST_LINK"

# Clean up old backups
echo ""
echo "--- Cleaning backups older than ${RETENTION_DAYS} days ---"
find "$BACKUP_DIR" -name "interxchange_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "interxchange_*.sql.gz" -type f | wc -l | xargs echo "  Remaining backups:"

echo ""
echo "=========================================="
echo "  Backup Complete"
echo "=========================================="
