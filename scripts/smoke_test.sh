#!/usr/bin/env bash
# JagoRoute MVP Smoke Test — end-to-end verification
# Usage: bash scripts/smoke_test.sh
# Exit code 0 = all checks passed, non-zero = first failure
set -e

API="http://localhost:8000/api/v1"
GW="http://localhost:8000/gateway/v1"
PASS=0
FAIL=0
TOKEN=""
API_KEY=""

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "  JagoRoute MVP Smoke Test"
echo "  $(date -Iseconds 2>/dev/null || echo '')"
echo "========================================"
echo ""

# 1. Health check
echo "1. Backend health..."
HTTP_CODE=$(curl -s -X GET "$API/health" -w "\n%{http_code}" 2>/dev/null | tail -1)
check "Health endpoint returns 200" "$([ "$HTTP_CODE" = "200" ] && echo 0 || echo 1)"

# 2. Login
echo "2. Auth: local-login..."
LOGIN_RESP=$(curl -s -X POST "$API/auth/local-login" \
  -H "Content-Type: application/json" \
  -d '{"password": "123456"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
check "Login returns access_token" "$([ -n "$TOKEN" ] && echo 0 || echo 1)"

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 3. Auth me
echo "3. Auth: /auth/me..."
ME_RESP=$(curl -s "$API/auth/me" -H "$AUTH_HEADER")
ME_EMAIL=$(echo "$ME_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null || true)
check "Auth me returns user email" "$([ -n "$ME_EMAIL" ] && echo 0 || echo 1)"

# 4. Hardware list
echo "4. Hardware list..."
HW_COUNT=$(curl -s "$API/hardware" -H "$AUTH_HEADER" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
check "Hardware list has devices ($HW_COUNT)" "$([ "$HW_COUNT" -ge 3 ] && echo 0 || echo 1)"

# 5. Routes list
echo "5. Routes list..."
ROUTE_COUNT=$(curl -s "$API/routes" -H "$AUTH_HEADER" | python3 -c "import sys,json; rs=json.load(sys.stdin); print(len(rs))" 2>/dev/null || echo "0")
check "Routes list has entries ($ROUTE_COUNT)" "$([ "$ROUTE_COUNT" -ge 1 ] && echo 0 || echo 1)"

# 6. API keys list
echo "6. API keys list..."
KEY_COUNT=$(curl -s "$API/keys" -H "$AUTH_HEADER" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
check "API keys exist ($KEY_COUNT)" "$([ "$KEY_COUNT" -ge 1 ] && echo 0 || echo 1)"

# 7. Get API key for gateway test
echo "7. Get API key..."
# Try to get the first full key by creating a new test key
KEY_RESP=$(curl -s -X POST "$API/keys" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name": "smoke-test-'"$(date +%s)"'"}')
API_KEY=$(echo "$KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])" 2>/dev/null || true)
check "Created API key for gateway" "$([ -n "$API_KEY" ] && echo 0 || echo 1)"

GW_HEADER="Authorization: Bearer $API_KEY"

# 8. Gateway call
echo "8. Gateway: all-sensors..."
GW_RESP=$(curl -s -w "\n%{http_code}" "$GW/all-sensors" -H "$GW_HEADER" 2>/dev/null || echo "")
GW_HTTP=$(echo "$GW_RESP" | tail -1)
GW_BODY=$(echo "$GW_RESP" | sed '$d')
GW_STATUS=$(echo "$GW_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || true)
check "Gateway returns success ($GW_STATUS)" "$([ "$GW_STATUS" = "success" ] && echo 0 || echo 1)"

# 9. Verify gateway data has multiple devices
GW_DATA_COUNT=$(echo "$GW_BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',{})))" 2>/dev/null || echo "0")
check "Gateway aggregated $GW_DATA_COUNT devices" "$([ "$GW_DATA_COUNT" -ge 2 ] && echo 0 || echo 1)"

# 10. Request logs
echo "9. Request logs..."
LOG_COUNT=$(curl -s "$API/logs" -H "$AUTH_HEADER" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
check "Request logs have entries ($LOG_COUNT)" "$([ "$LOG_COUNT" -ge 1 ] && echo 0 || echo 1)"

# 11. Log stats
echo "10. Log stats..."
STATS_RESP=$(curl -s "$API/logs/stats?range=24h" -H "$AUTH_HEADER")
SUCCESS_RATE=$(echo "$STATS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success_rate',0))" 2>/dev/null || echo "0")
check "Log stats returns success_rate ($SUCCESS_RATE%)" "$([ "$SUCCESS_RATE" != "0" ] && echo 0 || echo 1)"

# 12. Frontend health
echo "11. Frontend..."
FE_CODE=$(curl -s -I http://localhost:3000/login 2>/dev/null | head -1 | grep -o '[0-9]\{3\}' || echo "000")
check "Frontend /login returns 200" "$([ "$FE_CODE" = "200" ] && echo 0 || echo 1)"

# 13. Mock devices
echo "12. Mock devices..."
ESP_RESP=$(curl -s http://localhost:8000/mock-devices/esp32/sensors 2>/dev/null || echo "")
ESP_TEMP=$(echo "$ESP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('temperature',''))" 2>/dev/null || true)
check "Mock ESP32 returns temperature ($ESP_TEMP)" "$([ -n "$ESP_TEMP" ] && echo 0 || echo 1)"

echo ""
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  echo "  ❌ SMOKE TEST FAILED"
  exit 1
else
  echo "  ✅ ALL CHECKS PASSED"
  exit 0
fi
