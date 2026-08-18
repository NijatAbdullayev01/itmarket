#!/usr/bin/env bash
# Boot / adopt the live PM2 daemon without duplicating healthy apps.
# Used by systemd (pm2-root) and safe to run while production is online.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ECOSYSTEM="${ROOT}/deploy/ecosystem.config.cjs"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found in PATH" >&2
  exit 1
fi

if pm2 ping >/dev/null 2>&1; then
  # Daemon already running (common after manual start). Adopt + heal; do not kill.
  bash "${ROOT}/scripts/ensure-live-stack.sh"
  exit $?
fi

if [ -f /root/.pm2/dump.pm2 ]; then
  pm2 resurrect
else
  pm2 start "${ECOSYSTEM}"
fi

# Brief settle, then health-heal any app that failed to bind.
sleep 2
bash "${ROOT}/scripts/ensure-live-stack.sh"
exit $?
