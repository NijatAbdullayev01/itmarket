#!/usr/bin/env bash
# Reload live apps in dependency order to avoid admin ECONNREFUSED flashes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ECOSYSTEM="${ROOT}/deploy/ecosystem.config.cjs"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

wait_url() {
  local url="$1"
  local label="$2"
  local i
  for i in $(seq 1 120); do
    if curl -sf -m 6 -o /dev/null "${url}"; then
      echo "${label} ready ($((i * 2))s)"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: ${label} not ready: ${url}" >&2
  return 1
}

echo "==> Applying ecosystem config (no process bounce yet if unchanged)"
# Update env/limits in dump; restart sequentially below.
pm2 startOrReload "${ECOSYSTEM}" --update-env --only itmarket-api
wait_url "http://127.0.0.1:3001/api/v1" "api"

pm2 startOrReload "${ECOSYSTEM}" --update-env --only itmarket-storefront
wait_url "http://127.0.0.1:3010/" "storefront"

pm2 startOrReload "${ECOSYSTEM}" --update-env --only itmarket-backoffice
wait_url "http://127.0.0.1:3002/" "backoffice"

pm2 save --force
pm2 reset all >/dev/null 2>&1 || true
pm2 status
echo "==> Ordered reload complete"
