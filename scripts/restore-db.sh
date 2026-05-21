#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/infra/docker/backups"

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Available backups:"
  ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (no backups found)"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo "[karcoz] ERROR: Backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}"
  exit 1
fi

echo "[karcoz] Restoring database from ${BACKUP_FILE}..."
gunzip -c "$BACKUP_DIR/$BACKUP_FILE" | docker exec -i karcoz_db psql -U karcoz karcoz_db
echo "[karcoz] Restore complete."