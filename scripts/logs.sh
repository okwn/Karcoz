#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

COMPOSE="-f infra/docker/docker-compose.prod.yml"

if [ "$1" = "--api" ]; then
  docker $COMPOSE logs -f api
elif [ "$1" = "--db" ]; then
  docker $COMPOSE logs -f db
elif [ "$1" = "--redis" ]; then
  docker $COMPOSE logs -f redis
elif [ "$1" = "--web" ]; then
  docker $COMPOSE logs -f web
else
  docker $COMPOSE logs -f
fi