# KARÇÖZ Deployment Scripts

#!/bin/bash
# Run from project root: bash scripts/dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "[karcoz] Starting development environment..."

# Validate docker compose config
echo "[karcoz] Validating docker-compose.yml..."
docker compose -f infra/docker/docker-compose.yml config --quiet

echo "[karcoz] Building images..."
docker compose -f infra/docker/docker-compose.yml build --parallel

echo "[karcoz] Starting services..."
docker compose -f infra/docker/docker-compose.yml up -d

echo "[karcoz] Waiting for services to be healthy..."
sleep 5

docker compose -f infra/docker/docker-compose.yml ps

echo ""
echo "[karcoz] Dev environment running."
echo "  API:     http://localhost:8132"
echo "  Web:     http://localhost:3100"
echo "  Database: localhost:5433"
echo "  Redis:    localhost:6380"
echo ""
echo "  Logs:    docker compose -f infra/docker/docker-compose.yml logs -f"
echo "  Stop:    docker compose -f infra/docker/docker-compose.yml down"