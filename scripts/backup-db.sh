#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/infra/docker/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/karcoz_db_${TIMESTAMP}.sql.gz"

echo "[karcoz] Backing up database to ${BACKUP_FILE}..."
docker exec karcoz_db pg_dump -U karcoz karcoz_db | gzip > "$BACKUP_FILE"
echo "[karcoz] Backup complete: ${BACKUP_FILE}"
ls -lh "$BACKUP_FILE"