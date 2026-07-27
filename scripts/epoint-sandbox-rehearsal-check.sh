#!/usr/bin/env bash
# Validates local/staging env readiness for Epoint sandbox rehearsal.
# Does not call the merchant API or print secret values.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

fail=0

require_nonempty() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "FAIL: $name is empty" >&2
    fail=1
  else
    echo "OK: $name is set"
  fi
}

require_nonempty PAYMENT_PROVIDER
require_nonempty STOREFRONT_ORIGIN
require_nonempty EPOINT_PUBLIC_KEY
require_nonempty EPOINT_PRIVATE_KEY

if [[ "${PAYMENT_PROVIDER:-}" != "epoint" ]]; then
  echo "FAIL: PAYMENT_PROVIDER must be epoint for sandbox rehearsal (current: ${PAYMENT_PROVIDER:-unset})" >&2
  fail=1
else
  echo "OK: PAYMENT_PROVIDER=epoint"
fi

if [[ -n "${EPOINT_INSTALLMENT_MONTHS:-}" ]]; then
  echo "OK: EPOINT_INSTALLMENT_MONTHS configured"
else
  echo "WARN: EPOINT_INSTALLMENT_MONTHS unset (installment offer disabled)"
fi

echo
echo "Next: follow docs/rehearsals/epoint-sandbox-rehearsal.md with merchant credentials."
exit "$fail"
