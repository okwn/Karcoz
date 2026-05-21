#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "[karcoz] Building production images..."
docker compose -f infra/docker/docker-compose.prod.yml build --parallel
echo "[karcoz] Build complete."