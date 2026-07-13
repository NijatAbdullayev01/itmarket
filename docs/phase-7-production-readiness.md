# Faza 7 — Hardening və production readiness

**Status:** Engineering deliverable-ları implementasiya edilib. Production
buraxılışı **NO-GO** olaraq qalır: bu sənəddə göstərilən xarici və əvvəlki faza
gate-ləri real sübutla bağlanmadan qəbul meyarı keçmiş sayılmır.

## Tətbiq edilən hardening

- API exact-origin CORS, cross-site Fetch Metadata yoxlaması, CSP, HSTS,
  `nosniff`, frame və referrer qoruyucuları tətbiq edir.
- Authenticated cavablar `no-store` olur; staff/customer cookie sərhədləri və
  production mock-provider qadağası regression testlərlə qorunur.
- Production config real `METRICS_TOKEN`, HTTPS frontend origin-ləri, real
  payment provider və explicit secret tələb edir.
- API JSON body limiti `1 MiB`, URL-encoded body limiti `64 KiB`-dır.
- Swagger UI və OpenAPI HTTP endpoint-i production-da publish edilmir.
- CI frozen install, format, lint, typecheck, OpenAPI drift, migration,
  unit/integration/E2E, browser accessibility və build gate-lərini işlədir.
- Dependency audit/review, Gitleaks, CodeQL və Trivy image scan ayrı gate-dir.
- Container runtime-ları non-root istifadəçidə işləyir.

Threat-lər, qalıq risk və data classification:
[security threat model](security-threat-model.md).

## Observability contract-ı

`GET /api/v1/observability/metrics` yalnız
`Authorization: Bearer <METRICS_TOKEN>` ilə Prometheus formatı qaytarır. Yanlış
və ya olmayan token üçün endpoint `404` verir. Token URL/query-də daşınmır və
log redaction authorization header-i gizlədir.

Metriklər:

- request count və bounded `method`/`status_class` label-lı latency histogram;
- pending payment sayı və ən köhnə pending payment yaşı;
- active və vaxtı keçmiş inventory reservation sayı;
- pending/failed notification outbox sayı və ən köhnə pending job yaşı.

Alert baseline:
`infra/observability/prometheus-alerts.yml`. Platform seçildikdə scrape config,
dashboard UID-ləri, on-call receiver və test notification sübutu release
record-a əlavə edilməlidir.

## Performans rehearsal-ı

`infra/load/phase7.js` aşağıdakı büdcələri threshold kimi məcbur edir:

- catalog p95 `< 400 ms`;
- POS barcode lookup p95 `< 250 ms`;
- checkout p95 `< 1 s`;
- hər ölçülən flow üçün failure rate `< 1%`.

Production-a bənzər staging-də:

```bash
mkdir -p .artifacts/load
k6 run \
  -e BASE_URL=https://api.staging.example.invalid/api/v1 \
  -e VARIANT_ID='<synthetic-seeded-variant-id>' \
  -e DELIVERY_ZONE_ID='<synthetic-seeded-zone-id>' \
  -e STAFF_EMAIL='<synthetic-load-user>' \
  -e STAFF_PASSWORD='<secret-manager-value>' \
  -e POS_BARCODE='<synthetic-seeded-barcode>' \
  -e SUMMARY_EXPORT=.artifacts/load/phase7-summary.json \
  infra/load/phase7.js
```

Credential və seed ID-ləri repository-yə yazılmır. Test yalnız sintetik staging
datasında işlədilir. Nəticə olmadan index əlavə edilmir. Mövcud schema hot
query-lər üçün slug/SKU/barcode, status+createdAt, provider payment ID,
variant+location və order number index-lərini ehtiva edir. Threshold keçməzsə
query planı `EXPLAIN (ANALYZE, BUFFERS)` ilə artefaktlaşdırılır və yalnız ölçülən
plan əsasında yeni migration yaradılır.

Bu hostda Docker, PostgreSQL server və k6 olmadığı üçün faktiki load baseline
yaradılmayıb. Bu, production GO gate-dir; scriptin mövcudluğu nəticə əvəzi
deyil.

## Backup/restore rehearsal-ı

```bash
ENV_FILE=.env ./infra/scripts/backup-restore-rehearsal.sh
```

Script:

1. `pg_dump -Fc` yaradır və `0600`-ə uyğun umask tətbiq edir;
2. SHA-256 checksum yaradır və dərhal yoxlayır;
3. ayrıca, müvəqqəti DB-yə restore edir;
4. source/restore order, payment və inventory fingerprint-lərini müqayisə edir;
5. ledger/balance, active reservation/balance və payment/order invariant-lərini
   yoxlayır;
6. migration mövcudluğunu təsdiqləyir və restore DB-ni təmizləyir.

Dump `.artifacts/` altında qalır və production datası üçün uyğun daimi storage
hesab edilmir. Production rehearsal encrypted, access-audited, ayrı storage və
razılaşdırılmış RPO/RTO ilə aparılmalıdır.

## Accessibility və regression

Playwright + axe regression:

```bash
pnpm exec playwright install chromium
pnpm test:browser
```

Suite storefront empty/error-safe journey, landmark/focus davranışı,
backoffice staff login semantics və skip-link fokusunu yoxlayır. API integration
suite əlavə olaraq webhook spoofing, auth-boundary və brute-force backoff
ssenarilərini yoxlayır. Manual screen-reader, real mobile/device və Core Web
Vitals sübutu release checklist-də ayrıca qalır.

## Release rehearsal

Minimum release ardıcıllığı:

1. bütün CI gate-ləri yaşıl;
2. staging migration və container smoke;
3. backup/restore rehearsal və faktiki RPO/RTO;
4. k6 nəticəsi və lazım olduqda query/index tuning;
5. real provider callback/refund/reconciliation məşqi;
6. alert test notification və on-call acknowledgement;
7. rollback uyğunluğu; uyğun deyilsə yazılı forward-fix planı;
8. payment, inventory və cash-shift reconciliation;
9. release owner tərəfindən checklist və GO/NO-GO qərarı.

Detallı prosedur:
[deployment](deployment.md) və [operations runbook](operations-runbook.md).

## Bağlana bilməyən xarici gate-lər

Aşağıdakılar kodla saxtalaşdırıla bilməz və production launch-dan əvvəl real
owner/sübut tələb edir:

- Epoint merchant contract, capability, sandbox/production credential, callback
  signature və refund proseduru;
- rəsmi fiscal/e-kassa provider və hüquqi fiskal çek axını;
- Azərbaycan vergi, şəxsi məlumat, istehlakçı hüquqları, qaytarma və zəmanət
  review-u;
- real VÖEN, ünvan, receipt rekvizitləri və hüquqi mətnlər;
- hosting, WAF, secret manager, registry, on-call, dashboard və backup/PITR
  platforması;
- admin MFA launch qərarı;
- Faza 4 real provider/refund, Faza 5 return/refund və Faza 6 queued CSV/export
  və refund-aware reconciliation qəbul meyarları.

Bu gate-lər bağlanana qədər [production launch checklist](production-launch-checklist.md)
imzalana və status `GO` edilə bilməz.
