#!/usr/bin/env bash
set -uo pipefail

PORTS=(3000 3001 3002)

for port in "${PORTS[@]}"; do
  if ! command -v ss >/dev/null 2>&1; then
    echo "ss command not found; skipping port cleanup for ${port}."
    continue
  fi

  mapfile -t pids < <(
    ss -tlnp 2>/dev/null |
      grep ":${port} " |
      sed -n 's/.*pid=\([0-9]\+\).*/\1/p' |
      sort -u
  )

  if [ "${#pids[@]}" -eq 0 ]; then
    continue
  fi

  echo "Freeing port ${port} (PID: ${pids[*]})"
  for pid in "${pids[@]}"; do
    [ -n "${pid}" ] && kill "${pid}" 2>/dev/null || true
  done
done

sleep 0.5

for port in "${PORTS[@]}"; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "Warning: port ${port} is still in use."
  fi
done

exit 0
