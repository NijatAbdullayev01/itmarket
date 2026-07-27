# `@itmarket/api`

ITMarket NestJS 11 modular monolith — auth/RBAC, catalog, inventory ledger, orders, payments, POS, reports və jobs üçün vahid source of truth.

- Dev port: `3001`
- API prefix: `/api/v1`
- Docs: [docs/architecture.md](../../docs/architecture.md), [docs/development.md](../../docs/development.md)

## Ops notes

- Staff TOTP MFA: `STAFF_MFA_REQUIRED` (default `false`). Secrets are encrypted
  with a key derived from `APP_SECRET` — rotating `APP_SECRET` invalidates MFA
  secrets and recovery-code checks until staff re-enroll.
- Production forbids `PAYMENT_PROVIDER=mock`, `MEDIA_STORAGE=local`, and
  `FISCAL_RECEIPT_PROVIDER=log` (rehearsal-only).
- Media: `MEDIA_STORAGE=s3` in production; responses include signed `url` for
  private object keys (opaque `objectKey` is persisted). Upload runs D-013
  gates: magic-byte sniff + `MEDIA_MALWARE_SCAN` (`local` default, optional
  `clamav` via `CLAMAV_HOST`/`CLAMAV_PORT`).
- Notification outbox retries with backoff; staff can
  `POST /api/v1/staff/notifications/outbox/:id/requeue` (`audit.read`).
- Worker: `pnpm --filter @itmarket/api start:worker` (`node dist/worker.js`).
  Set `JOBS_ENABLED=false` on API replicas in production so only the worker
  runs payment expiry / outbox / report export timers (Redis leases, not BullMQ).

```bash
pnpm --filter @itmarket/api dev
pnpm --filter @itmarket/api start:worker:dev
pnpm --filter @itmarket/api test
pnpm --filter @itmarket/api test:e2e
```
