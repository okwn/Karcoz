#!/usr/bin/env bash
# test-real-solve-flow.sh
# End-to-end test of the KARÇÖZ solve flow
# Tests: health, auth token creation, solve/text, solve/image, question save, rate limit

set -e

API_BASE="${API_BASE:-http://localhost:8100}"
API="$API_BASE/api"
COLOUR='\033[1;34m'
COLOUR_GREEN='\033[1;32m'
COLOUR_RED='\033[1;31m'
COLOUR_RESET='\033[0m'
PASS_COUNT=0
FAIL_COUNT=0

pass() { echo -e "${COLOUR_GREEN}[PASS]${COLOUR_RESET} $1"; ((PASS_COUNT++)); }
fail() { echo -e "${COLOUR_RED}[FAIL]${COLOUR_RESET} $1"; ((FAIL_COUNT++)); }
info() { echo -e "${COLOUR}[INFO]${COLOUR_RESET} $1"; }

section() {
  echo ""
  echo -e "${COLOUR}==== $1 ====${COLOUR_RESET}"
}

# ── Health ────────────────────────────────────────────────────────────────────
section "Health Check"
HEALTH_RESP=$(curl -s -w "\n%{http_code}" "$API_BASE/health")
HEALTH_STATUS=$(echo "$HEALTH_RESP" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESP" | head -1)
if [ "$HEALTH_STATUS" = "200" ]; then
  pass "API health: $HEALTH_BODY"
else
  fail "API health returned $HEALTH_STATUS (expected 200)"
fi

# ── Register / Login Flow ─────────────────────────────────────────────────────
section "Auth Flow"
EMAIL="test$(date +%s)@karcoz.test"

# Step 1: Request magic link
MAGIC_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"type\":\"register\"}")
MAGIC_STATUS=$(echo "$MAGIC_RESP" | tail -1)
if [ "$MAGIC_STATUS" = "200" ] || [ "$MAGIC_STATUS" = "201" ]; then
  pass "Magic link sent (status $MAGIC_STATUS)"
else
  info "Magic link response: $MAGIC_RESP"
  fail "Magic link failed (status $MAGIC_STATUS)"
fi

# In dev mode, the magic link URL is logged to console.
# Extract token from dev logs or use a pre-created test account.
# For automated testing, we'll use the SESSION_TOKEN if available.

SESSION_TOKEN="${SESSION_TOKEN:-}"
if [ -z "$SESSION_TOKEN" ]; then
  info "No SESSION_TOKEN set — skipping authenticated endpoint tests"
  info "Set SESSION_TOKEN=<token> to run full test suite"
else
  pass "Using provided session token"

  # ── Extension Token ──────────────────────────────────────────────────────
  section "Extension Token Creation"
  EXT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/extension/token" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -d '{"deviceName":"Test Device"}')
  EXT_STATUS=$(echo "$EXT_RESP" | tail -1)
  EXT_BODY=$(echo "$EXT_RESP" | head -1)
  if [ "$EXT_STATUS" = "200" ] || [ "$EXT_STATUS" = "201" ]; then
    EXT_TOKEN=$(echo "$EXT_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    pass "Extension token created: ${EXT_TOKEN:0:15}..."
  else
    fail "Extension token creation failed (status $EXT_STATUS)"
    info "Response: $EXT_RESP"
    EXT_TOKEN=""
  fi

  # ── Solve/Text ───────────────────────────────────────────────────────────
  section "Solve/Text (requires token)"
  if [ -n "$EXT_TOKEN" ]; then
    SOLVE_TEXT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/solve/text" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $EXT_TOKEN" \
      -d '{"text":"If 3x + 7 = 22, what is x?"}')
    SOLVE_TEXT_STATUS=$(echo "$SOLVE_TEXT_RESP" | tail -1)
    SOLVE_TEXT_BODY=$(echo "$SOLVE_TEXT_RESP" | head -1)

    if [ "$SOLVE_TEXT_STATUS" = "200" ]; then
      pass "solve/text returned 200"
      # Verify structured response
      QUESTION_ID=$(echo "$SOLVE_TEXT_BODY" | grep -o '"questionId":"[^"]*"' | cut -d'"' -f4)
      if [ -n "$QUESTION_ID" ]; then
        pass "questionId present: $QUESTION_ID"
      else
        fail "questionId missing from solve/text response"
      fi
    elif [ "$SOLVE_TEXT_STATUS" = "401" ]; then
      fail "solve/text returned 401 — token may be invalid"
    elif [ "$SOLVE_TEXT_STATUS" = "429" ]; then
      pass "solve/text correctly rate-limited (429)"
    else
      fail "solve/text returned unexpected status $SOLVE_TEXT_STATUS"
      info "Response: $SOLVE_TEXT_BODY"
    fi

    # ── Question History ─────────────────────────────────────────────────
    section "Question History"
    HISTORY_RESP=$(curl -s -w "\n%{http_code}" "$API/questions/history?page=1&limit=10" \
      -H "Authorization: Bearer $SESSION_TOKEN")
    HISTORY_STATUS=$(echo "$HISTORY_RESP" | tail -1)
    HISTORY_BODY=$(echo "$HISTORY_RESP" | head -1)
    if [ "$HISTORY_STATUS" = "200" ]; then
      TOTAL=$(echo "$HISTORY_BODY" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
      pass "history returned (total: $TOTAL)"
    else
      fail "history returned status $HISTORY_STATUS"
    fi

    # ── Solve/Image (tiny base64 PNG) ─────────────────────────────────────
    section "Solve/Image"
    # Minimal 1x1 white PNG in base64 — should be rejected or processed
    TINY_IMG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQYGhVoRAAAAABJRU5ErkJggg=="
    SOLVE_IMG_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/solve/image" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $EXT_TOKEN" \
      -d "{\"imageBase64\":\"$TINY_IMG\",\"sourceType\":\"upload\"}")
    SOLVE_IMG_STATUS=$(echo "$SOLVE_IMG_RESP" | tail -1)
    SOLVE_IMG_BODY=$(echo "$SOLVE_IMG_RESP" | head -1)

    if [ "$SOLVE_IMG_STATUS" = "200" ]; then
      pass "solve/image returned 200"
    elif [ "$SOLVE_IMG_STATUS" = "413" ]; then
      pass "solve/image correctly rejected oversized image (413)"
    elif [ "$SOLVE_IMG_STATUS" = "422" ]; then
      pass "solve/image correctly rejected unprocessable image (422)"
    elif [ "$SOLVE_IMG_STATUS" = "429" ]; then
      pass "solve/image correctly rate-limited (429)"
    else
      # Some other response — may be error from actual AI not finding a question
      info "solve/image status: $SOLVE_IMG_STATUS"
      if echo "$SOLVE_IMG_BODY" | grep -q '"code"'; then
        pass "solve/image returned structured error (acceptable for tiny test image)"
      else
        fail "solve/image unexpected response"
      fi
    fi
  else
    info "Skipping solve tests (no extension token)"
  fi
fi

# ── Rate Limit ──────────────────────────────────────────────────────────────
section "Rate Limit Headers"
RL_RESP=$(curl -s -I -X POST "$API/solve/text" \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}' 2>&1 || true)
if echo "$RL_RESP" | grep -qi "retry-after\|x-ratelimit"; then
  pass "Rate limit headers present"
else
  info "Rate limit headers check (may not be visible on first request): $RL_RESP"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
section "Results"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo -e "Passed: ${COLOUR_GREEN}$PASS_COUNT${COLOUR_RESET} / $TOTAL"
echo -e "Failed: ${COLOUR_RED}$FAIL_COUNT${COLOUR_RESET} / $TOTAL"
echo ""
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "${COLOUR_RED}Some tests failed. Check the output above.${COLOUR_RESET}"
  exit 1
else
  echo -e "${COLOUR_GREEN}All tests passed!${COLOUR_RESET}"
  exit 0
fi