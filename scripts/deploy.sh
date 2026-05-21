#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

if [ ! -f .env ]; then
  echo "[karcoz] ERROR: .env file not found. Copy infra/docker/.env.example to .env and fill in values."
  exit 1
fi

echo "[karcoz] Deploying to production..."

# Validate
docker compose -f infra/docker/docker-compose.prod.yml config --quiet

# Pull latest (if using remote images)
# docker compose -f infra/docker/docker-compose.prod.yml pull

docker compose -f infra/docker/docker-compose.prod.yml up -d --build

echo "[karcoz] Deployment complete."
docker compose -f infra/docker/docker-compose.prod.yml ps