#!/usr/bin/env bash

set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
DUMP_DIR="${DUMP_DIR:-$ROOT_DIR/.artifacts/backup-rehearsal}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RESTORE_DB=""
START_TS="$(date +%s)"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Set ENV_FILE=/path/to/.env or create $ROOT_DIR/.env first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for required_var in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Required variable $required_var is missing in $ENV_FILE" >&2
    exit 1
  fi
done

mkdir -p "$DUMP_DIR"

COMPOSE_ARGS=(--env-file "$ENV_FILE")
DUMP_FILE="$DUMP_DIR/${POSTGRES_DB}-${RUN_ID}.dump"
RESTORE_DB="${POSTGRES_DB}_restore_${RUN_ID//[^0-9]/}"

query_database() {
  local database="$1"
  local sql="$2"
  docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc \
    'DB="$1"; SQL="$2"; PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$DB" -v ON_ERROR_STOP=1 -Atc "$SQL"' \
    _ "$database" "$sql"
}

cleanup() {
  if [[ -n "$RESTORE_DB" ]]; then
    docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc \
      'RESTORE_DB="$1"; PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --if-exists "$RESTORE_DB"' \
      _ "$RESTORE_DB" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

echo "==> Checking PostgreSQL readiness"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

FINGERPRINT_SQL='
select concat_ws(
  '"'"'|'"'"',
  (select count(*) from orders),
  (select coalesce(sum(grand_total), 0)::text from orders),
  (select count(*) from payments),
  (select coalesce(sum(amount), 0)::text from payments),
  (select count(*) from inventory_movements),
  (select coalesce(sum(quantity_delta), 0)::text from inventory_movements),
  (select coalesce(sum(on_hand), 0)::text from inventory_balances),
  (select coalesce(sum(reserved), 0)::text from inventory_balances)
);'
SOURCE_FINGERPRINT="$(query_database "$POSTGRES_DB" "$FINGERPRINT_SQL")"

echo "==> Creating compressed backup at $DUMP_FILE"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  >"$DUMP_FILE"
sha256sum "$DUMP_FILE" >"$DUMP_FILE.sha256"
sha256sum --check "$DUMP_FILE.sha256"

echo "==> Creating restore database $RESTORE_DB"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc \
  'RESTORE_DB="$1"; PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$RESTORE_DB"' \
  _ "$RESTORE_DB"

echo "==> Restoring backup into $RESTORE_DB"
docker compose "${COMPOSE_ARGS[@]}" exec -T postgres sh -lc \
  'RESTORE_DB="$1"; PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --clean --if-exists --no-owner --no-privileges' \
  _ "$RESTORE_DB" <"$DUMP_FILE"

echo "==> Comparing source and restored commerce fingerprints"
RESTORE_FINGERPRINT="$(query_database "$RESTORE_DB" "$FINGERPRINT_SQL")"
if [[ "$SOURCE_FINGERPRINT" != "$RESTORE_FINGERPRINT" ]]; then
  echo "Restore fingerprint does not match source" >&2
  exit 1
fi

INVARIANT_SQL='
select concat_ws(
  '"'"'|'"'"',
  (
    select count(*)
    from inventory_balances b
    left join (
      select variant_id, location_id, sum(quantity_delta) as movement_total
      from inventory_movements
      group by variant_id, location_id
    ) m using (variant_id, location_id)
    where b.on_hand <> coalesce(m.movement_total, 0)
       or b.reserved < 0
       or b.reserved > b.on_hand
  ),
  (
    select count(*)
    from inventory_balances b
    left join (
      select variant_id, location_id, sum(quantity) as active_total
      from stock_reservations
      where status = '"'"'ACTIVE'"'"'
      group by variant_id, location_id
    ) r using (variant_id, location_id)
    where b.reserved <> coalesce(r.active_total, 0)
  ),
  (
    select count(*)
    from payments p
    join orders o on o.id = p.order_id
    where p.amount <> o.grand_total or p.currency <> o.currency
  )
);'
INVARIANT_RESULT="$(query_database "$RESTORE_DB" "$INVARIANT_SQL")"
if [[ "$INVARIANT_RESULT" != "0|0|0" ]]; then
  echo "Restored database invariant verification failed: $INVARIANT_RESULT" >&2
  exit 1
fi

MIGRATION_COUNT="$(query_database "$RESTORE_DB" 'select count(*) from "_prisma_migrations";')"
if [[ "$MIGRATION_COUNT" -lt 1 ]]; then
  echo "Restored database has no applied Prisma migrations" >&2
  exit 1
fi

ELAPSED="$(( $(date +%s) - START_TS ))"

echo "==> Backup/restore rehearsal completed"
echo "Dump file: $DUMP_FILE"
echo "Dump checksum: $DUMP_FILE.sha256"
echo "Restore database: $RESTORE_DB"
echo "Commerce fingerprint: $RESTORE_FINGERPRINT"
echo "Elapsed seconds: $ELAPSED"
