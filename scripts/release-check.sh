#!/usr/bin/env bash
#
# scripts/release-check.sh
# ============================
# Release-grade validation script for KARÇÖZ.
# Runs all quality gates before a release.
#
# Usage:
#   pnpm release-check
#   bash scripts/release-check.sh
#
# Exits non-zero if any gate fails.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

GITHUB_ACTIONS="${GITHUB_ACTIONS:-false}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pass=0
fail=0

function banner() {
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  KARÇÖZ Release Check — $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""
}

function gate() {
  local name="$1"
  local cmd="$2"
  local timeout="${3:-300}"

  echo -e "${YELLOW}[GATE]${NC} $name"
  echo "  $ cmd"
  local stdout stderr exitcode
  stdout=$(mktemp)
  stderr=$(mktemp)

  set +e
  timeout "$timeout" bash -c "$cmd" > "$stdout" 2> "$stderr"
  exitcode=$?
  set -e

  if [ $exitcode -eq 0 ]; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    pass=$((pass + 1))
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC} (exit $exitcode)"
    if [ -s "$stderr" ]; then
      echo -e "  --- stderr ---"
      sed 's/^/  /' "$stderr" >&2
    fi
    if [ -s "$stdout" ]; then
      echo -e "  --- stdout ---"
      sed 's/^/  /' "$stdout"
    fi
    fail=$((fail + 1))
    return 1
  fi
}

banner

# ── Gate 1: frozen lockfile install ─────────────────────────────────────────
gate "pnpm install" \
  "pnpm install"

# ── Gate 2: typecheck ────────────────────────────────────────────────────────
gate "pnpm typecheck" \
  "pnpm typecheck" 600

# ── Gate 3: lint ─────────────────────────────────────────────────────────────
gate "pnpm lint" \
  "pnpm lint"

# ── Gate 4: unit tests ───────────────────────────────────────────────────────
gate "pnpm test" \
  "pnpm test" 300

# ── Gate 5: build ────────────────────────────────────────────────────────────
gate "pnpm build" \
  "pnpm build" 300

# ── Gate 6: eval (mock mode) ────────────────────────────────────────────────
gate "pnpm eval" \
  "pnpm eval" 300

# ── Gate 7: docker compose config ───────────────────────────────────────────
gate "docker compose config" \
  "docker compose -f infra/docker/docker-compose.yml config --quiet"

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Results${NC}"
echo -e "${CYAN}============================================${NC}"
echo -e "  Passed: ${GREEN}${pass}${NC}"
echo -e "  Failed: ${RED}${fail}${NC}"
echo ""

if [ $fail -gt 0 ]; then
  echo -e "${RED}Release check FAILED — fix failures before releasing.${NC}"
  exit 1
else
  echo -e "${GREEN}All gates passed — ready to release.${NC}"
  exit 0
fi