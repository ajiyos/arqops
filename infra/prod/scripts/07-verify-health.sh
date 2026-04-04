#!/usr/bin/env bash
# Backend liveness on 127.0.0.1:8080; optional VERIFY_APP_URL / VERIFY_API_URL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }

echo "=== Backend localhost:8080 ==="
if curl -sf --connect-timeout 5 http://127.0.0.1:8080/actuator/health/liveness >/dev/null; then
  echo "OK: liveness"
else
  fail "127.0.0.1:8080 not reachable"
fi

if [[ -n "${VERIFY_APP_URL:-}" ]]; then
  echo "=== VERIFY_APP_URL ==="
  curl -sfI --connect-timeout 10 "$VERIFY_APP_URL" | head -5 || fail "$VERIFY_APP_URL"
  echo "OK: $VERIFY_APP_URL"
fi

if [[ -n "${VERIFY_API_URL:-}" ]]; then
  echo "=== VERIFY_API_URL ==="
  curl -sfI --connect-timeout 10 "$VERIFY_API_URL" | head -5 || fail "$VERIFY_API_URL"
  echo "OK: $VERIFY_API_URL"
fi
