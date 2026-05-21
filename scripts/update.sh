#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

COMPOSE="-f infra/docker/docker-compose.prod.yml"

echo "[karcoz] Pulling latest changes..."
git pull

echo "[karcoz] Pulling Docker images..."
docker $COMPOSE pull

echo "[karcoz] Rebuilding and restarting services..."
docker $COMPOSE up -d --build

echo "[karcoz] Update complete."
docker $COMPOSE ps