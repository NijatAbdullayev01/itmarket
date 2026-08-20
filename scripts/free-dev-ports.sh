#!/usr/bin/env bash
set -uo pipefail

# Dev uses ports 4000/4002/4010 to avoid conflict with production PM2 stack (3001/3002/3010)
PORTS=(4010 4000 4002)
LIVE_PM2_APPS=(itmarket-api itmarket-storefront itmarket-backoffice)

live_pm2_apps_online() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return 1
  fi

  local names
  names="$(printf '%s,' "${LIVE_PM2_APPS[@]}")"
  names="${names%,}"

  pm2 jlist 2>/dev/null | node -e '
    const wanted = new Set(process.argv[1].split(","));
    const apps = JSON.parse(require("fs").readFileSync(0, "utf8") || "[]");
    for (const app of apps) {
      const status = app.pm2_env?.status;
      if (!wanted.has(app.name)) continue;
      if (status === "online" || status === "launching" || status === "stopping") {
        process.exit(0);
      }
    }
    process.exit(1);
  ' "${names}" 2>/dev/null
}

abort_if_live_stack_running() {
  if [ "${ALLOW_KILL_LIVE:-}" = "1" ]; then
    echo "ALLOW_KILL_LIVE=1 set; not protecting live itmarket-* PM2 apps."
    return 0
  fi

  if live_pm2_apps_online; then
    echo "Production PM2 stack detected. Dev will use ports 4000/4002/4010 instead of 3001/3002/3010."
    echo "Production and development can run in parallel without conflicts."
    return 0
  fi
}

stop_pm2_apps_on_ports() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi

  local port_list
  port_list="$(printf '%s,' "${PORTS[@]}")"
  port_list="${port_list%,}"

  # Match by argv -p/--port OR by PORT env (production ecosystem uses env).
  pm2 jlist 2>/dev/null | node -e '
    const ports = new Set(process.argv[1].split(",").map(Number));
    const apps = JSON.parse(require("fs").readFileSync(0, "utf8") || "[]");

    for (const app of apps) {
      const env = app.pm2_env || {};
      const args = env.args || [];
      const portFlagIndex = args.findIndex((arg) => arg === "-p" || arg === "--port");
      const fromArgs = portFlagIndex >= 0 ? Number(args[portFlagIndex + 1]) : NaN;
      const fromEnv = Number(env.PORT ?? env.env?.PORT);
      const port = Number.isFinite(fromArgs) ? fromArgs : fromEnv;

      if (!Number.isFinite(port) || !ports.has(port)) {
        continue;
      }

      if (env.status === "online" || env.status === "launching") {
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

collect_pm2_pids() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi

  pm2 jlist 2>/dev/null | node -e '
    const apps = JSON.parse(require("fs").readFileSync(0, "utf8") || "[]");
    for (const app of apps) {
      if (Number.isInteger(app.pid) && app.pid > 0) {
        console.log(String(app.pid));
      }
    }
  ' 2>/dev/null
}

# Orphan `nest start --watch` (no listen yet) can race turbo on rebuild.
# Never kill PM2-managed processes — production API is `node apps/api/dist/main.js`.
# Do not pkill `turbo` / parent shell — their argv often contains "turbo dev".
stop_orphan_dev_watchers() {
  local repo_root
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  local -A protected=()
  local pid=""
  while IFS= read -r pid; do
    [ -n "${pid}" ] && protected["${pid}"]=1
  done < <(collect_pm2_pids)

  local patterns=(
    "${repo_root}/.*/nest\\.js start --watch"
    "${repo_root}/apps/api/dist/main"
    "${repo_root}/apps/.*/next/dist/bin/next"
  )

  local pattern
  for pattern in "${patterns[@]}"; do
    while IFS= read -r pid; do
      if [ -n "${pid}" ] && [ -z "${protected[${pid}]:-}" ]; then
        kill "${pid}" 2>/dev/null || true
      fi
    done < <(pgrep -f "${pattern}" 2>/dev/null || true)
  done
}

abort_if_live_stack_running
stop_pm2_apps_on_ports
stop_orphan_dev_watchers

sleep 0.5

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
