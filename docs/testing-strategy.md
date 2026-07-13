# Test strategiyası

**Status:** Accepted baseline  
**Məqsəd:** pul, stok, authorization və əsas satış axınlarında regressiyanı production-dan əvvəl tapmaq.

## Prinsiplər

1. Test biznes riskinə uyğun seçilir, coverage faizinə görə deyil.
2. Pul və stok yalnız mock unit testlə təsdiqlənmir; real PostgreSQL integration testi məcburidir.
3. Testlər deterministikdir: clock, timezone, random ID və provider cavabları idarə olunur.
4. Hər test müstəqildir və paralel icraya hazırdır.
5. Production schema migration-ları test DB-yə eyni qaydada tətbiq olunur.
6. Flaky test söndürülmür; karantinə alınsa sahibi, səbəbi və son tarixi qeyd edilir.

## Test qatları

### Static checks

- TypeScript strict typecheck
- lint və format check
- dependency/license və secret scan
- OpenAPI/generated client drift check
- Prisma migration/schema validation

### Unit test

Framework, DB və network olmadan:

- money arithmetic, rounding və discount limitləri;
- delivery fee və eligibility;
- order/payment/fulfillment transition matrix;
- inventory balance invariantı;
- permission policy;
- cash shift expected amount;
- report date range və `Asia/Baku` sərhədi;
- barcode scanner buffer/parser.

Unit test sürətli olmalı və domain qərarını aydın göstərməlidir.

### Integration test

Real PostgreSQL və lazım olduqda Redis/queue ilə:

- repository mapping və DB constraint-lər;
- transaction rollback;
- eyni SKU üçün paralel reservation və oversell;
- idempotency key yarışları;
- duplicate/out-of-order payment event;
- reservation expiration ilə payment callback yarışı;
- refund limiti və inventory return;
- POS sale/payment/stock atomikliyi;
- shift close zamanı concurrent sale bloklanması;
- audit və outbox record-un eyni transaction-da yaranması;
- migration-ın boş və representative data üzərində tətbiqi.

Test container-lər CI-da təcrid edilmiş və versiyası pin edilmiş olmalıdır.

### Contract test

- OpenAPI response/input schema uyğunluğu;
- generated TypeScript client compile testi;
- payment provider adapter fixture-ları;
- webhook signature valid/invalid fixture-ları;
- notification/object storage port davranışı.

Real provider sandbox qeyri-deterministikdirsə merge gate deyil, scheduled smoke test kimi işlədilir.

### E2E

Kritik browser/API journey-ləri:

- storefront: product → cart → delivery/pickup → COD order;
- storefront: sandbox redirect → signed callback → paid order;
- customer yalnız öz order/addresses məlumatını görür;
- admin: product → variant → barcode → stock receipt;
- cashier: shift open → scan → cash/card sale → receipt → close;
- refund permission və POS return;
- günlük/aylıq report seed transaction-larla uyğun gəlir;
- hər staff rolu icazəsiz endpoint və route-dan bloklanır.

E2E testlər kritik happy path və ən təhlükəli failure path-ları əhatə etməlidir; bütün UI kombinasiyalarını E2E-yə daşımaq olmaz.

### Non-functional

- catalog, barcode lookup və checkout load test;
- accessibility automated check + əsas journey manual keyboard review;
- container/dependency vulnerability scan;
- backup restore rehearsal;
- migration duration və lock observation;
- əsas səhifələr üçün Core Web Vitals ölçümü.

## Kritik ssenari matrisi

### Inventory

- İki paralel checkout son vahidi eyni anda ala bilmir.
- Eyni reservation release iki dəfə quantity dəyişmir.
- Payment success və expiry yarışı yalnız bir terminal nəticə verir.
- Transfer source-u mənfiyə salmır və destination-a iki dəfə yazmır.
- Adjustment reason, actor və audit olmadan qəbul edilmir.

### Payment

- Duplicate create eyni business result qaytarır.
- Invalid signature state dəyişmir.
- Amount/currency mismatch state dəyişmir və alert/event yaradır.
- Callback redirect-dən əvvəl və sonra gələ bilir.
- Timeout avtomatik `FAILED` sayılmır.
- Partial refund-lar paid amount-u keçmir.
- Production mock provider config-i fail-fast edir.

### POS/cash

- Eyni scan quantity-ni artırır.
- Idempotent retry ikinci sale yaratmır.
- Closed/başqa kassir shift-i ilə satış bloklanır.
- Sale uğursuz olarsa stock və payment partial qalmır.
- Shift closing zamanı yeni sale qəbul edilmir.
- Return original sold/remaining quantity-ni keçmir.

### Authorization

Hər kritik use-case üçün ən az:

- icazəli rol uğurludur;
- authenticated, amma icazəsiz rol `403` alır;
- unauthenticated request `401` alır;
- başqa müştərinin resursu data sızdırmır;
- revoked/deactivated session qəbul edilmir.

## Test data

- Factory-lər minimum valid entity yaradır.
- Test ID-ləri real VÖEN, telefon, email və merchant məlumatını təqlid etmir.
- Money fixture-ları rounding boundary-ləri əhatə edir.
- Clock injection ilə month/day boundary yaradılır.
- Seed data development demo və test fixture məqsədini ayırır.
- Production dump testə gətirilmir; zəruridirsə əvvəl formal anonymization aparılır.

## CI mərhələləri

Hər PR:

```text
install --frozen-lockfile
static checks
unit tests
integration tests
build
selected E2E
security scans
```

Main/release branch:

```text
full E2E
migration rehearsal
container scan
scheduled provider smoke (credential varsa)
```

Load test hər PR-da deyil; release candidate və performansa təsir edən dəyişikliklərdə işlədilir.

## Coverage siyasəti

Global faiz tək keyfiyyət göstəricisi deyil. Aşağıdakılarda branch coverage yüksək olmalı və hər transition/failure açıq test edilməlidir:

- money və discount;
- inventory mutation;
- order/payment/fulfillment state machine;
- idempotency;
- permission policy;
- refund və cash shift reconciliation.

Yeni kritik branch testsiz qalırsa PR coverage faizi dəyişməsə belə merge edilməməlidir.

## Flaky test siyasəti

Flaky test aşkarlandıqda:

1. failure artifact və seed saxlanır;
2. root cause clock, shared state, network və ya race kimi təsnif edilir;
3. release təhlükəsi varsa test suite-dən səssiz çıxarılmır;
4. karantin label-i, sahibi və düzəltmə tarixi qoyulur;
5. eyni risk üçün müvəqqəti manual gate müəyyən edilir.

## Exit criteria

Feature bitmiş sayılır, əgər:

- acceptance və risk ssenariləri testə çevrilib;
- local və CI nəticələri keçir;
- test production davranışına uyğun səviyyədədir;
- failure zamanı diaqnostika üçün artifact/log var;
- dəyişən contract və runbook yenilənib.
