# Production launch checklist

**Qayda:** Hər maddə sübut linki və məsul şəxslə bağlanır. “Sonra edərik” kritik gate üçün qəbul edilmir.

**Engineering freeze (2026-07-27):** Kod və CI gate-ləri engineering tərəfindən hazırlanıb; production **NO-GO** qalır. Sahib imzası tələb olunan blocker-lər: [stakeholder-freeze-package.md](stakeholder-freeze-package.md) (D-012, D-015). D-010 və D-014 qəbul edilib. Qəbul edilmiş qərarlar: [open-decisions.md](open-decisions.md). Engineering roadmap implementasiyası: SMTP/outbox, kredit müraciətləri staff UI, satış hesabatı API (+ CSV/low-stock/recon/audit **API-only**, backoffice panelləri çıxarılıb), MFA TOTP, S3 media, review moderation — canlı merchant/hosting sübutu olmadan GO verilmir. D-007: stok transferi scope xaricindədir. Delivery zone/pickup CRUD və online qismən refund UI da çıxarılıb (API qalır).

## Release idarəsi

- [ ] Release scope və acceptance criteria təsdiqlənib.
- [ ] Release owner və incident commander müəyyən edilib.
- [ ] Deploy, rollback/forward-fix və communication planı review olunub.
- [ ] Staging production-a uyğun artifact ilə test edilib.
- [ ] Dəyişiklik freeze və maintenance window qərarı verilib.

## Kod və CI

- [ ] Frozen lockfile install keçir.
- [ ] Lint, typecheck, unit, integration və kritik E2E testləri keçir.
- [ ] Production build və container start smoke testi keçir.
- [ ] OpenAPI spec və generated client arasında drift yoxdur.
- [ ] Kritik flaky/skip edilmiş test yoxdur.
- [ ] Dependency, secret və container scan-də açıq exploitable kritik/yüksək finding yoxdur.
- [ ] Image digest və git SHA release record-da saxlanır.

## Database

- [ ] Migration staging-də representative data ilə ölçülüb.
- [ ] Lock/downtime riski və timeout müəyyən edilib.
- [ ] Expand/contract compatibility əvvəlki və yeni app versiyası ilə yoxlanıb.
- [ ] Backfill bounded, restart edilə bilən və müşahidə olunandır.
- [ ] Pre-deploy backup/PITR sağlamdır.
- [ ] Restore rehearsal razılaşdırılmış RPO/RTO daxilində uğurludur.
- [ ] Post-migration invariant/reconciliation query-ləri hazırdır.

## Security

- [ ] Threat model son arxitekturaya uyğundur.
- [ ] Customer/staff auth boundary negative testləri keçir (`phase7.e2e-spec`: customer→staff və staff→customer).
- [ ] Authorization matrix kritik endpoint-ləri əhatə edir.
- [ ] CSRF, CORS, CSP və security header-lər production domain-lərində yoxlanıb (Origin gate smoke daxil).
- [ ] `TRUST_PROXY_HOPS` etibarlı reverse-proxy sayına bərabərdir; forged `X-Forwarded-For` rate-limit bucket-ini dilut etmir (0 = birbaşa expose).
- [ ] Edge + app layered rate limit aktivdir (login / cart / checkout / payment webhook).
- [ ] Rate limit və body/upload limit aktivdir.
- [ ] Object storage anonymous access bloklanıb.
- [ ] Log redaction secret, token, PAN/CVV və PII fixture-ları ilə test edilib.
- [ ] Production secret-ləri secret manager-dən gəlir (diskdə `.env` yox); rotation owner: APP_SECRET, `CATALOG_REVALIDATE_SECRET` (opsional), payment keys, Redis, SMTP, MFA, `METRICS_TOKEN`.
- [ ] Backup restore rehearsal uğurlu (`ENV_FILE=.env ./infra/scripts/backup-restore-rehearsal.sh` və ya ekvivalent PITR drill).
- [x] Admin/staff MFA: production-da `STAFF_MFA_REQUIRED=true` (D-011 qəbul); staff enrollment deploy-dan əvvəl tamamlanmalıdır.
- [ ] Vulnerability disclosure/incident escalation prosesi müəyyən edilib.

## Payment

- [ ] Merchant müqaviləsi və aktiv capability-lər təsdiqlənib.
- [ ] Production credential sandbox-dan ayrıdır.
- [ ] Provider-hosted checkout istifadə olunur; PAN/CVV sistemdən keçmir.
- [ ] Callback signature real provider sənədinə görə test edilib.
- [ ] Success, failure, cancel, timeout, duplicate və out-of-order ssenariləri keçir.
- [ ] Amount/currency/order mismatch paid yaratmır.
- [ ] Idempotent create/callback/refund işləyir.
- [ ] Reconciliation job, alert və manual runbook hazırdır.
- [ ] Refund permission və limitləri Finance tərəfindən təsdiqlənib.
- [ ] Production `MockPaymentProvider` config-i startup-da bloklanır.

## Inventory və order

- [ ] Paralel checkout oversell integration/load testi keçir.
- [ ] Reservation timeout Product tərəfindən təsdiqlənib.
- [ ] Payment failure/cancel/expiry stok reservation-ını bir dəfə azad edir.
- [ ] Inventory ledger-balance reconciliation keçir.
- [ ] Order/payment/fulfillment state transition testləri tamdır.
- [ ] Order item, address və totals snapshot doğrulanıb.
- [ ] Manual adjustment permission, reason və audit tələb edir.

## Storefront

- [ ] Mobil, planşet və desktop əsas journey-lər yoxlanıb.
- [ ] Keyboard, focus, contrast və screen-reader əsasları review olunub.
  - [ ] SEO metadata, canonical, sitemap, robots və product structured data yoxlanıb (bax: `docs/seo.md`):
  - [ ] Locale cookie (`en`/`ru`) indexable meta-nı dəyişmir (AZ title/description/`og:locale`).
  - [ ] Cookie olmadan UI dili ziyarətçinin `Accept-Language`-nə uyğunlaşır: `az` → AZ, `ru` → RU, başqa dil → EN; `<html lang>` uyğundur (a11y).
  - [ ] `/sitemap.xml` index; `/sitemap/0.xml` kateqoriya/brend `?page=` URL-lərini (yalnız məhsulu olanlar), `/sitemap/1…N.xml` ACTIVE məhsulları əhatə edir; RSS sitemap-də yoxdur.
  - [ ] Kateqoriya/brend `?page=` overflow → 404 + noindex.
  - [ ] `/robots.txt` private path-ləri disallow edir; production-da `STOREFRONT_ORIGIN` təyin olunub (fail-closed yox).
  - [ ] Məhsul səhifəsində Product və ya ProductGroup JSON-LD (multi-image) + `og:type=product` (layout conflict yox); Offer URL-də `?variant=`; H1 = display title; `availableByOrder` → `BackOrder`; shipping/return siyasəti real qaydalara uyğundur (10 AZN / ≥1500 pulsuz; FreeReturn yox).
  - [ ] Slug rename və `/?brand=`/`/?category=` konsolidasiya 308 redirect verir.
  - [ ] `/faq` FAQPage; `/blog` Blog; `/blog/{slug}` BlogPosting + cover + `h1→h2` + `og:type=article` + image; `/blog/rss.xml` oxunur.
  - [ ] Merchant feed `/feeds/google-merchant.xml`: variant `g:link`, `g:product_type`, `g:google_product_category`, `g:shipping` (10 AZN), `g:additional_image_link` (qalereya), real şəkil, `identifier_exists` yalnız GTIN+MPN yoxdursa; truncate header yox; GSC/Merchant validation.
  - [ ] Indexable kateqoriya/brend/top məhsullarda CMS `seoTitle` + `seoDescription` (+ intro) doldurulub (Backoffice **Kataloq → SEO** coverage + «Boş SEO-ları doldur»; OOS `availableByOrder` audit).
  - [ ] (opsional) `GOOGLE_SITE_VERIFICATION` / `TWITTER_SITE` / `IMAGE_REMOTE_HOSTS` / `STORE_GEO_*` prod-da təyin olunub.
- [ ] Loading, empty, out-of-stock, validation və provider failure halları işləyir.
- [ ] AZN/`az-AZ` formatı və Azərbaycan dili mətnləri review olunub.
- [ ] Privacy/cookie və hüquqi mətnlər real hüquq sahibi tərəfindən verilib.

## Backoffice və POS

- [ ] RBAC navigation ilə yanaşı API-də də məcbur edilir.
- [ ] Scanner fokuslu/fokussuz və manual keyboard ssenarilərində test edilib.
- [ ] Network interruption retry duplicate sale yaratmır.
- [ ] Shift open/closing/close və cash difference ssenariləri keçir.
- [ ] External terminal card confirmation reference/audit tələb edir.
- [ ] Return original sale/item və permission ilə məhdudlaşır.
- [ ] Browser receipt fiskal çek kimi yanlış təqdim edilmir.
- [ ] Mağaza operator təlimi və offline/network fallback proseduru təsdiqlənib.

## Hüquqi və maliyyə gate-ləri

- [ ] Azərbaycan vergi və fiskal çek tələbləri mütəxəssis tərəfindən təsdiqlənib.
- [x] Rəsmi e-kassa/fiscal provider POS inteqrasiyası: D-010 ilə scope xaricində qəbul edilib (ayrıca cihaz; sənəd nömrəsi `externalTerminalReference`).
- [ ] VÖEN, ünvan, əlaqə və receipt rekvizitləri real biznes sahibi tərəfindən verilib.
- [x] Şəxsi məlumat retention: D-014 ilə daimi saxlama qəbul edilib (avtomatik anonymization/silinmə yoxdur). Privacy/cookie mətnləri və third-party processing siyahısı ayrıca review olunmalıdır.
- [ ] İstehlakçı hüquqları, qaytarma, zəmanət və delivery şərtləri təsdiqlənib.
- [ ] Heç bir hüquqi mətn və rekvizit developer tərəfindən uydurulmayıb.

## Observability və operations

- [ ] Structured log, correlation ID və release SHA görünür.
- [ ] HTTP, DB, queue, payment, inventory və backup dashboard-ları hazırdır.
- [ ] Alert-lər doğru on-call kanalına test notification göndərib.
- [ ] Queue DLQ/replay və payment/inventory reconciliation runbook-u sınaqdan keçirilib.
- [ ] Provider, DB, Redis və object storage outage davranışı məşq edilib.
- [ ] Capacity, connection pool və worker concurrency limitləri müəyyən edilib.
- [ ] Status communication və incident severity prosesi hazırdır.

## Performans

- [ ] Catalog read p95 hədəfi ölçülüb.
- [ ] POS barcode lookup p95 hədəfi ölçülüb.
- [ ] Checkout p95 hədəfi ölçülüb.
- [ ] N+1 və limitsiz list/export yoxdur.
- [ ] Core Web Vitals representative cihaz/şəbəkədə ölçülüb.
- [ ] Load nəticələrinə uyğun index və capacity planı review olunub.

## Go / no-go

Launch yalnız bu şərtlərlə `GO` ola bilər:

- kritik gate-lərin hamısı bağlıdır;
- qalıq risklər owner və yazılı qəbul qərarı daşıyır;
- data integrity/security şübhəsi yoxdur;
- rollback/forward-fix və on-call hazırdır;
- merchant, fiscal, hüquqi və maliyyə təsdiqləri mövcuddur.

Qərar qeydi:

```text
Release:
Tarix:
Qərar: GO / NO-GO
Release owner:
Engineering:
Security:
Operations:
Product/Finance/Legal:
Qalıq risklər:
Sübut linkləri:
```
