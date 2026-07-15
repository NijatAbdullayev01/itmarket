#!/usr/bin/env bash
set -euo pipefail

API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001/api/v1}"
HEALTH_URL="${API_URL%/}/health/live"
MAX_ATTEMPTS="${WAIT_FOR_API_ATTEMPTS:-90}"
SLEEP_SECONDS="${WAIT_FOR_API_INTERVAL:-1}"

echo "Waiting for API at ${HEALTH_URL}..."

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "API is ready (attempt ${attempt}/${MAX_ATTEMPTS})."
    exit 0
  fi
  sleep "${SLEEP_SECONDS}"
done

echo "Timed out waiting for API at ${HEALTH_URL} after ${MAX_ATTEMPTS} attempts." >&2
exit 1
