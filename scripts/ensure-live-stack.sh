#!/usr/bin/env bash
# Keep the live PM2 stack healthy. Safe to run from cron every minute.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ECOSYSTEM="${ROOT}/deploy/ecosystem.config.cjs"
LOG_DIR="${ITMARKET_LOG_DIR:-/var/log/itmarket}"
LOG_FILE="${LOG_DIR}/ensure-live-stack.log"
LOCK_FILE="${TMPDIR:-/tmp}/itmarket-ensure-live-stack.lock"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

APPS="itmarket-api itmarket-storefront itmarket-backoffice"

app_url() {
  case "$1" in
    itmarket-api) echo "http://127.0.0.1:3001/api/v1" ;;
    itmarket-storefront) echo "http://127.0.0.1:3010/" ;;
    itmarket-backoffice) echo "http://127.0.0.1:3002/" ;;
    *) echo "" ;;
  esac
}

mkdir -p "${LOG_DIR}"

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >>"${LOG_FILE}"
}

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  exit 0
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "ERROR: pm2 not found"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  log "ERROR: curl not found"
  exit 1
fi

if ! pm2 ping >/dev/null 2>&1; then
  log "PM2 daemon down; starting from dump/ecosystem"
  if [ -f /root/.pm2/dump.pm2 ]; then
    pm2 resurrect >/dev/null 2>&1 || pm2 start "${ECOSYSTEM}" >/dev/null 2>&1 || true
  else
    pm2 start "${ECOSYSTEM}" >/dev/null 2>&1 || true
  fi
  sleep 3
fi

healthy() {
  local url="$1"
  curl -sf -m 4 -o /dev/null "${url}"
}

app_status() {
  local name="$1"
  pm2 jlist 2>/dev/null | node -e '
    const name = process.argv[1];
    const apps = JSON.parse(require("fs").readFileSync(0, "utf8") || "[]");
    const app = apps.find((row) => row.name === name);
    process.stdout.write(app?.pm2_env?.status || "missing");
  ' "${name}" 2>/dev/null || echo missing
}

ensure_app() {
  local name="$1"
  local url
  url="$(app_url "${name}")"
  local status

  if [ -z "${url}" ]; then
    log "${name}: unknown app"
    return 1
  fi

  status="$(app_status "${name}")"

  if [ "${status}" != "online" ] && [ "${status}" != "launching" ]; then
    log "${name}: status=${status}; starting from ecosystem"
    pm2 describe "${name}" >/dev/null 2>&1 \
      && pm2 restart "${name}" --update-env >/dev/null 2>&1 \
      || pm2 start "${ECOSYSTEM}" --only "${name}" >/dev/null 2>&1 \
      || true
    sleep 2
  fi

  if ! healthy "${url}"; then
    log "${name}: healthcheck failed for ${url}; restarting"
    pm2 restart "${name}" --update-env >/dev/null 2>&1 || \
      pm2 start "${ECOSYSTEM}" --only "${name}" >/dev/null 2>&1 || true
    sleep 3
    if healthy "${url}"; then
      log "${name}: recovered"
    else
      log "${name}: still unhealthy after restart"
      return 1
    fi
  fi
  return 0
}

# API first — Next apps proxy/fetch it.
failed=0
for app in itmarket-api itmarket-storefront itmarket-backoffice; do
  ensure_app "${app}" || failed=1
done

pm2 save --force >/dev/null 2>&1 || true

if [ "${failed}" = "0" ]; then
  log "OK: api+storefront+backoffice healthy"
else
  log "WARN: one or more apps unhealthy after ensure"
fi

exit "${failed}"
