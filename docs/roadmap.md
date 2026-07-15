# İcra yol xəritəsi

**Status:** Baseline plan  
**Planlama prinsipi:** Fazalar tarixə görə deyil, qəbul meyarına görə bağlanır. Növbəti fazaya keçid əvvəlkinin kritik quality gate-ləri tamamlandıqda edilir.

## Faza 0 — Discovery və qərarlar

**Vəziyyət:** Tamamlanıb — [Faza 0 bağlanış sübutu](phase-0-discovery-summary.md)

Məqsəd: koddan əvvəl sistem sərhədlərini və kritik invariant-ları yazılı etmək.

Deliverable-lar:

- arxitektura və domen modeli;
- order/payment/fulfillment/reservation state machine-ləri;
- əsas ADR-lər;
- risk register və production launch checklist;
- açıq biznes qərarlarının sahibi və son tarixi.

Qəbul meyarları:

- source of truth və modul ownership aydındır;
- pul, stok və idempotency invariant-ları yazılıb;
- payment/fiskal/hüquqi naməlumlar risk kimi qeydə alınıb;
- sənədlərdə saxta credential və uydurma hüquqi məlumat yoxdur.

## Faza 1 — Foundation

**Vəziyyət:** Tamamlanıb — frozen install, format, lint, typecheck, migration
və seed rehearsal, unit test, PostgreSQL/Redis integration test, API E2E,
OpenAPI drift check, application build və production Docker image smoke lokal
olaraq doğrulanıb.

Məqsəd: təmiz clone-dan deterministik işləyən monorepo və lokal infrastruktur.

Deliverable-lar:

- pnpm workspace + Turborepo;
- Next.js storefront/backoffice və NestJS API skeleton-u;
- strict TypeScript, lint, format, test və build;
- PostgreSQL, Redis, MinIO və mail catcher Docker Compose;
- Prisma migration/seed infrastrukturu;
- environment schema və `.env.example`;
- structured logging, correlation ID, error envelope, health endpoint;
- CI quality gate-ləri və production Dockerfile-lar.

Qəbul meyarları:

- sənədləşdirilmiş setup təmiz clone-da işləyir;
- install lockfile-dan deterministikdir;
- lint, typecheck, unit test və build CI-da keçir;
- readiness/liveness düzgün fərqləndirilir;
- production config-də secret çatışmırsa fail-fast olur.

## Faza 2 — Identity, catalog və inventory

**Vəziyyət:** Kod, static gate-lər, real PostgreSQL integration suite və
browser E2E acceptance tamamlanıb. Detal:
[auth/catalog/inventory modul sənədi](modules/auth-catalog-inventory.md).

Məqsəd: staff təhlükəsizliyi və satışa hazırlanan SKU/stok nüvəsi.

Deliverable-lar:

- customer/staff auth sərhədləri;
- RBAC və kritik permission-lar;
- category, brand, product, variant, barcode və media;
- location, receipt, adjustment, transfer və inventory ledger;
- backoffice CRUD və audit log.

Qəbul meyarları:

- admin variant və unikal barkod yaradır;
- warehouse icazəli məntəqəyə mal qəbul edir;
- hər quantity dəyişikliyinin movement/source-u var;
- paralel update invariantı pozmur;
- icazəsiz rol həm API, həm UI-da bloklanır;
- mutation audit testləri keçir.

## Faza 3 — Storefront, cart və COD checkout

**Vəziyyət:** Tamamlanıb — public storefront catalog, cookie ilə davamlı guest
cart, quantity update/remove, cash checkout, delivery/pickup eligibility,
timed reservation cleanup, storefront browser E2E və real PostgreSQL
acceptance suite-i lokal Docker Compose mühitində doğrulanıb. Detal:
[storefront/cart/checkout modul sənədi](modules/storefront-cart-checkout.md).

Məqsəd: payment provider-dan asılı olmadan end-to-end commerce axını.

Deliverable-lar:

- SEO və accessibility əsaslı storefront;
- search/filter/sort və product detail;
- guest/auth cart və merge;
- server-side pricing;
- delivery/pickup eligibility;
- COD order və timed stock reservation.

Qəbul meyarları:

- delivery və pickup ilə uyğun COD order yaradıla bilir;
- client qiymət və delivery fee manipulyasiyası qəbul edilmir;
- paralel checkout oversell yaratmır;
- reservation expire/cancel zamanı stok bir dəfə azad edilir;
- əsas mobil və keyboard axınları E2E testdən keçir.

## Faza 4 — Online payment və fulfillment

**Vəziyyət:** Kod səviyyəsində bağlanıb — mock provider ilə hosted checkout, signed callback,
timeout expiration, duplicate callback qoruyucuları və browser status flow
implementasiya edilib. Staff order list/detail, fulfillment transition-ları,
staff refund endpoint-i, recurring expiration/outbox jobs və cart-scoped checkout
idempotency əlavə olunub. Epoint hosted checkout, signed callback verification,
status reconciliation, reverse/refund adapter-i və env-driven installment
capability mapping qoşulub; PostgreSQL acceptance suite bu hostda doğrulanıb.
Real merchant credential və canlı sandbox rehearsal hələ açıq xarici gate-dir.
Detal:
[online payment/fulfillment modul sənədi](modules/online-payment-fulfillment.md).

Məqsəd: provider nəticələri ilə təhlükəsiz və reconciliation edilən payment axını.

Deliverable-lar:

- `PaymentProvider` port-u;
- non-production mock və real sandbox adapter;
- redirect/3DS, signed webhook, refund/cancel;
- duplicate/out-of-order event handling;
- reconciliation job;
- fulfillment state machine və notification outbox.

Qəbul meyarları:

- success, failure, timeout və duplicate callback ssenariləri doğrulanıb;
- amount/currency/order mismatch avtomatik paid etmir;
- idempotent create/refund işləyir;
- payment failure/expiration reservation-ı təhlükəsiz azad edir;
- production mock provider ilə start etmir;
- real provider credential yoxdursa status açıq şəkildə sandbox-dır.

## Faza 5 — POS və cash register

**Vəziyyət:** Kod səviyyəsində bağlanıb — cash register, shift open/close, discrepancy approval,
barcode lookup, cash/card/installment POS sale, original sale item-lərinə bağlı POS return/refund,
A4 və termal receipt görünüşü, `FiscalReceiptProvider` port-u və idempotent stock
decrement implementasiya edilib; PostgreSQL acceptance suite doğrulanıb. Rəsmi fiscal
provider credential-ları ayrıca xarici gate-dir. Detal:
[POS/cash-register modul sənədi](modules/pos-cash-register.md).

Məqsəd: mağazada sürətli, audit edilən və duplicate yaratmayan satış.

Deliverable-lar:

- keyboard/scanner-first POS;
- shift open/close və cash movement;
- cash və external-terminal-confirmed card sale;
- receipt görünüşü;
- return/refund authorization;
- eyni inventory core ilə stock decrement.

Qəbul meyarları:

- scan-to-cart və keyboard checkout performans hədəfinə uyğundur;
- sale/payment/stock/receipt atomikdir;
- retry duplicate sale yaratmır;
- shift fərqi hesablanır və audit olunur;
- return original item quantity-ni keçmir;
- qeyri-fiskal çap fiskal çek kimi təqdim edilmir.

## Faza 6 — Reports

**Vəziyyət:** Başlanıb — report API-si, `Asia/Baku` date-range helper-i,
sales/channel/payment/cashier/product breakdown-ları, refund-aware net-sales,
low-stock və inventory movement report-ları, həmçinin persisted CSV export
queue/worker implementasiya edilib. PostgreSQL acceptance suite bu hostda
doğrulanıb; low-stock report limit/threshold sırası düzəldilib. Detal:
[reports modul sənədi](modules/reports.md).

Məqsəd: source transaction-larla reconciliation olunan əməliyyat və maliyyə görünüşü.

Deliverable-lar:

- günlük/aylıq satış;
- kanal, payment method, cashier, product və status breakdown;
- low stock və movement report;
- queued CSV export;
- `Asia/Baku` date filters.

Qəbul meyarları:

- seed edilmiş sale/refund dataset-i ilə total-lar tam uyğun gəlir;
- DST/timezone sərhədləri test olunur;
- export request timeout-u daxilində limitsiz data yükləmir;
- report icazələri API-də məcbur edilir.

## Faza 7 — Hardening və production readiness

**Vəziyyət:** Engineering implementasiyası tamamlanıb — security/CI
hardening, qorunan Prometheus metrics, alert baseline, load profile,
backup/restore invariant rehearsal, deployment/runbook və Playwright+axe
regression əlavə edilib. Formal production acceptance **NO-GO**-dur: bu hostda
Docker/k6 rehearsal sübutu yoxdur, əvvəlki fazaların açıq qəbul meyarları və real
merchant/fiscal/hüquqi/platform təsdiqləri bağlanmayıb. Detal:
[Faza 7 production readiness](phase-7-production-readiness.md).

Məqsəd: ölçülən, bərpa edilən və hüquqi/operational gate-ləri keçən buraxılış.

Deliverable-lar:

- threat model finding-lərinin bağlanması;
- dependency/container scan;
- load test və index tuning;
- backup/restore sınağı;
- dashboards, alert-lər və on-call runbook;
- deployment və migration rehearsal;
- accessibility və E2E regression;
- hüquq, maliyyə, fiscal və merchant təsdiqləri.

Qəbul meyarları:

- kritik/yüksək security finding açıq deyil;
- production-a bənzər mühitdə restore ölçülüb;
- rollback/forward-fix və payment reconciliation məşqi edilib;
- performans büdcələri ölçülüb;
- launch checklist release owner tərəfindən imzalanıb.

## Cross-cutting Definition of Done

Hər feature üçün:

- acceptance criteria və failure halları yazılıb;
- biznes qaydası backend-də məcbur edilir;
- validation, authorization və lazım olan audit mövcuddur;
- migration/index review olunub;
- unit və integration test, kritik axında E2E var;
- OpenAPI/generated contract yenilənib;
- loading, empty, error və accessibility halları nəzərə alınıb;
- lint, typecheck, test və production build keçir;
- loglarda secret/PII yoxdur;
- təsirlənən docs/runbook eyni PR-da yenilənib.

## Prioritet qaydası

İş sıralaması:

1. data loss, pul/stok səhvi və security riski;
2. release blocker;
3. əsas user journey;
4. operational visibility;
5. performans yalnız ölçü ilə;
6. rahatlıq və kosmetik təkmilləşdirmə.

Scope-a yeni böyük capability əlavə edilərkən mövcud fazanın qəbul meyarı zəiflədilməməlidir.
