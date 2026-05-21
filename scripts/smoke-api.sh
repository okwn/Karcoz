#!/usr/bin/env bash
# KARÇÖZ API Smoke Tests
# Usage: bash scripts/smoke-api.sh [BASE_URL]
# Default BASE_URL: http://localhost:8132

set -e

BASE_URL="${1:-http://localhost:8132}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

passed=0
failed=0

check() {
  local name="$1"
  local command="$2"
  echo -n "  $name... "
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((passed++))
  else
    echo -e "${RED}FAIL${NC}"
    ((failed++))
  fi
}

echo "============================================"
echo "  KARÇÖZ API Smoke Tests"
echo "  Base URL: $BASE_URL"
echo "============================================"

echo ""
echo "1. Health Check"
check "GET /health returns 200" \
  "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/health' | grep -q 200"

echo ""
echo "2. Solve Route (mock mode)"
check "POST /api/solve/text returns 400 without auth" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/solve/text' -H 'Content-Type: application/json' -d '{}' | grep -q 400"
check "POST /api/solve/text returns 200 with valid body" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/solve/text' -H 'Content-Type: application/json' -d '{\"text\":\"What is 2+2?\"}' | grep -q 200"

echo ""
echo "3. Billing Route (auth required)"
check "GET /api/billing/plan returns 401 without auth" \
  "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/api/billing/plan' | grep -q 401"
check "POST /api/billing/change-plan returns 401 without auth" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/billing/change-plan' -H 'Content-Type: application/json' -d '{\"plan\":\"pro\"}' | grep -q 401"

echo ""
echo "4. Question History (auth required)"
check "GET /api/questions/history returns 401 without auth" \
  "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/api/questions/history' | grep -q 401"

echo ""
echo "5. Auth Routes"
check "POST /api/auth/magic-link returns 400 for invalid email" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/auth/magic-link' -H 'Content-Type: application/json' -d '{\"email\":\"not-an-email\"}' | grep -q 400"
check "POST /api/auth/magic-link returns 200 for valid email (no reveal)" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/auth/magic-link' -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\"}' | grep -q 200"

echo ""
echo "6. Rate Limiting"
check "Rate limited after many requests (429)" \
  "for i in \$(seq 1 110); do curl -s -o /dev/null '$BASE_URL/health'; done && curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/health' | grep -q 429" || \
  echo -e "  ${YELLOW}SKIP${NC} (rate limit not configured in test env)"

echo ""
echo "============================================"
echo "  Results: ${GREEN}$passed passed${NC}, ${RED}$failed failed${NC}"
echo "============================================"

if [ $failed -gt 0 ]; then
  exit 1
fi
exit 0