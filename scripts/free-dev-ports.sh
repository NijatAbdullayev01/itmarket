#!/usr/bin/env bash
set -uo pipefail

# Storefront dev uses 3010 so it does not conflict with other local apps on 3000.
PORTS=(3010 3001 3002)

stop_pm2_apps_on_ports() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi

  local port_list
  port_list="$(printf '%s,' "${PORTS[@]}")"
  port_list="${port_list%,}"

  pm2 jlist 2>/dev/null | node -e '
    const ports = new Set(process.argv[1].split(",").map(Number));
    const apps = JSON.parse(require("fs").readFileSync(0, "utf8") || "[]");

    for (const app of apps) {
      const args = app.pm2_env?.args || [];
      const portFlagIndex = args.findIndex((arg) => arg === "-p" || arg === "--port");
      const port = portFlagIndex >= 0 ? Number(args[portFlagIndex + 1]) : NaN;

      if (!Number.isFinite(port) || !ports.has(port)) {
        continue;
      }

      if (app.pm2_env?.status === "online" || app.pm2_env?.status === "launching") {
        console.log(`${app.name}\t${port}`);
      }
    }
  ' "${port_list}" 2>/dev/null | while IFS=$'\t' read -r name port; do
    if [ -n "${name}" ]; then
      echo "Stopping PM2 app ${name} on port ${port}"
      pm2 stop "${name}" >/dev/null 2>&1 || true
    fi
  done
}

collect_port_pids() {
  local port="$1"

  if ! command -v ss >/dev/null 2>&1; then
    echo "ss command not found; skipping port cleanup for ${port}." >&2
    return 0
  fi

  ss -tlnp 2>/dev/null |
    grep ":${port} " |
    sed -n 's/.*pid=\([0-9]\+\).*/\1/p' |
    sort -u
}

free_port() {
  local port="$1"
  local pid=""

  mapfile -t pids < <(collect_port_pids "${port}")

  if [ "${#pids[@]}" -eq 0 ]; then
    return 0
  fi

  echo "Freeing port ${port} (PID: ${pids[*]})"
  for pid in "${pids[@]}"; do
    [ -n "${pid}" ] && kill "${pid}" 2>/dev/null || true
  done

  sleep 0.5

  mapfile -t pids < <(collect_port_pids "${port}")
  if [ "${#pids[@]}" -eq 0 ]; then
    return 0
  fi

  echo "Force freeing port ${port} (PID: ${pids[*]})"
  for pid in "${pids[@]}"; do
    [ -n "${pid}" ] && kill -9 "${pid}" 2>/dev/null || true
  done
}

stop_pm2_apps_on_ports

for port in "${PORTS[@]}"; do
  free_port "${port}"
done

sleep 0.5

for port in "${PORTS[@]}"; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "Warning: port ${port} is still in use."
  fi
done

exit 0
