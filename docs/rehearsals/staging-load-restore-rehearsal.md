# Staging load və backup/restore rehearsal

**Status:** Scriptlər hazır; staging host D-015-dən sonra icra olunur  
**Son yenilənmə:** 2026-07-27

## Load rehearsal

```bash
mkdir -p .artifacts/load
k6 run \
  -e BASE_URL="https://api.staging.example/api/v1" \
  -e VARIANT_ID='<synthetic-seeded-variant-id>' \
  -e DELIVERY_ZONE_ID='<synthetic-seeded-zone-id>' \
  -e STAFF_EMAIL='<synthetic-load-user>' \
  -e STAFF_PASSWORD='<secret-manager-value>' \
  -e POS_BARCODE='<synthetic-seeded-barcode>' \
  -e SUMMARY_EXPORT=.artifacts/load/phase7-summary.json \
  infra/load/phase7.js
```

Büdcələr: catalog p95 `< 400 ms`, POS barcode `< 250 ms`, checkout `< 1 s`, failure `< 1%`.

## Backup/restore rehearsal

```bash
ENV_FILE=.env.staging ./infra/scripts/backup-restore-rehearsal.sh
```

Script `pg_dump -Fc`, checksum, ayrı DB-yə restore və ledger/payment/order fingerprint yoxlamalarını aparır. Dump `.artifacts/` altındadır — production daimi storage deyil.

## Sübut artefaktları

- `.artifacts/load/phase7-summary.json`
- `.artifacts/backup-rehearsal/*.dump` + checksum
- script stdout (fingerprint OK)

Bu artefaktlar olmadan [production-launch-checklist.md](../production-launch-checklist.md) performans və restore maddələri bağlanmır.
