#!/usr/bin/env bash
# Build and reload the live PM2 stack with minimal downtime.
# Never run `pnpm dev` on this host while production is serving.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

cd "${ROOT}"

echo "==> Building apps (api + storefront + backoffice)"
pnpm --filter @itmarket/api build
pnpm --filter @itmarket/storefront build
pnpm --filter @itmarket/backoffice build

mkdir -p /var/log/itmarket

echo "==> Ordered PM2 reload"
bash "${ROOT}/scripts/reload-live-stack.sh"

# CSS must be real CSS, not HTML from a missing standalone static copy.
css_path="$(
  curl -sf -m 5 http://127.0.0.1:3002/ |
    sed -n 's/.*href="\(\/_next\/static\/chunks\/[^"]*\.css\)".*/\1/p' |
    head -1
)"
if [ -n "${css_path}" ]; then
  ctype="$(curl -sI -m 5 "http://127.0.0.1:3002${css_path}" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2; exit}')"
  case "${ctype}" in
    text/css*) echo "Backoffice CSS OK (${css_path})" ;;
    *)
      echo "ERROR: backoffice CSS content-type is '${ctype:-missing}' for ${css_path}" >&2
      exit 1
      ;;
  esac
fi

echo "==> Deploy complete"
