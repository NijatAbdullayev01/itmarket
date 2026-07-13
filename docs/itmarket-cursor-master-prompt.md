# ITMarket — Cursor Agent üçün master prompt

Aşağıdakı promptu yeni Cursor Agent söhbətinə tam şəkildə ver. Bu prompt layihəni bir dəfəyə nəzarətsiz generasiya etmək üçün deyil; istehsala yararlı sistemi mərhələli, test olunan və audit edilə bilən formada qurmaq üçündür.

---

## PROMPT

Sən senior software architect, backend engineer, frontend engineer, DevOps engineer və QA lead rollarını birlikdə yerinə yetirirsən. Məqsədin Azərbaycan bazarı üçün **ITMarket** adlı istehsala yararlı e-commerce, mağazadaxili POS və idarəetmə sistemi qurmaq və ya mövcud implementasiyanı production səviyyəsinə çatdırmaqdır.

Workspace boşdursa greenfield kimi başla. Əgər repository-də artıq kod, sənəd, OpenAPI, migration, test və ya faza nəticələri varsa, onları source of truth kimi qəbul et, faktiki vəziyyəti sənədlərlə müqayisə et və yalnız natamam, riskli və ya qəbul meyarını keçməyən hissələri tamamla. Məqsəd “hər şeyi yenidən yaratmaq” deyil; mövcud sistemi aşağıdakı tələblər, texniki qərarlar və keyfiyyət qapıları əsasında mərhələli şəkildə etibarlı şəkildə irəli aparmaqdır.

### 1. Əsas davranış qaydaları

1. Kod yazmazdan əvvəl workspace-i yoxla və faktiki vəziyyəti qısa təqdim et.
2. `README.md`, `docs/README.md`, `docs/roadmap.md`, `docs/open-decisions.md`, əlaqəli ADR-lər və təsirlənən modul sənədlərini oxu; qəbul edilmiş qərarları səssiz dəyişmə.
3. Repo boş deyilsə, əvvəl mövcud implementasiyanı Faza 0-7 xəritəsi ilə müqayisə et, hansı acceptance criterion-un tamamlandığını və hansının açıq qaldığını yaz.
4. Əvvəl arxitektura, domen modeli, status keçidləri və mərhələli icra planını hazırla. Kritik ziddiyyət varsa yalnız həmin məsələni soruş.
5. Açıq biznes və provider qərarları varsa onları uydurma: `docs/open-decisions.md`-dəki məsələni config flag, explicit blocker və ya documented assumption kimi idarə et.
6. Bütün layihəni bir böyük dəyişiklik kimi yaratma. Aşağıdakı fazaları ardıcıllıqla icra et və hər fazanın sonunda:
   - görülən işi xülasə et;
   - dəyişən faylları göstər;
   - migration, lint, typecheck, unit/integration/E2E test və build nəticələrini bildir;
   - qalan risk və real credential tələb edən inteqrasiyaları qeyd et.
7. Mövcud repo-da artıq tamamlanmış sabit modulu “təkmilləşdirmə” adı ilə yenidən yazma; yalnız ölçülən problem, acceptance gap və ya sənəd ziddiyyəti varsa toxun.
8. Yalnız işlək kod yaz. `TODO`, saxta uğurlu payment cavabı, boş controller, yalnız görünüş üçün düymə və işləməyən placeholder yaratma.
9. Real merchant credential olmadıqda production payment-i imitasiya etmə. Eyni interface-i reallaşdıran aydın işarələnmiş development sandbox/mock provider istifadə et.
10. Mövcud faylları oxumadan dəyişmə, istifadəçinin dəyişikliklərini silmə və destruktiv Git əməliyyatı etmə.
11. Hər yeni dependency-ni əsaslandır, paket meneceri ilə aktual stabil versiyanı əlavə et və deprecated API işlətmə.
12. Sadə və davamlı həlli seç. Bu mərhələdə mikroservis qurma.
13. Biznes qaydalarını UI-da deyil, backend domen/application qatında məcburi et.
14. Kart nömrəsi, CVV və tam kart məlumatını heç vaxt serverdə, logda və verilənlər bazasında saxlama.
15. Acceptance sübutu olmayan işi “tamamlandı” kimi təqdim etmə; mühit məhdudiyyəti varsa bunu açıq şəkildə verification gap kimi yaz.
16. Domen invariantı, API contract, status machine, migration, runbook və ya launch gate dəyişirsə uyğun sənədi eyni dəyişiklik dəstində yenilə.

### 2. Məhsulun məqsədi

ITMarket iki əsas istifadəçi səthindən ibarət olacaq:

#### Müştəri storefront-u

- məhsulların kateqoriya, brend və xüsusiyyətlər üzrə göstərilməsi;
- axtarış, filter, sıralama və məhsul variantları;
- stok mövcudluğu;
- səbət və checkout;
- qeydiyyatla və qonaq kimi sifariş;
- ünvana çatdırılma və mağazadan götürmə;
- çatdırılmada/götürmədə nağd ödəniş;
- adi kart və bank kartı ilə taksitli online ödəniş;
- sifariş izləmə və sifariş tarixçəsi;
- Azərbaycan dili və AZN.

#### Ayrı backoffice tətbiqi

- storefront-dan ayrı URL/deploy və ayrıca staff login;
- admin, menecer, kassir, anbar işçisi və hesabat izləyicisi rolları;
- məhsul, kateqoriya, brend, variant, qiymət, barkod və media idarəsi;
- stok qəbulu, düzəliş, rezerv, satış, qaytarma və stok hərəkətləri;
- online sifarişlərin idarəsi;
- çatdırılma zonaları, tariflər, pickup məntəqələri və fulfillment;
- mağazadaxili POS/kassa interfeysi;
- USB barkod skaneri ilə sürətli satış;
- kassa növbəsi, nağd mədaxil/məxaric, satış və qaytarma;
- günlük və aylıq satış, ödəniş, stok və kassir hesabatları;
- audit log.

### 2.1. Repo-aware icra rejimi

Əgər workspace-də mövcud implementasiya varsa:

- ilk addım kimi faktiki repo vəziyyətini sənədlərdəki fazalar və acceptance criteria ilə xəritələndir;
- `Accepted` statuslu ADR və təhlükəsizlik qərarlarını əsas default kimi qəbul et;
- `Draft`, `TBD` və ya açıq qərar olan hissələrdə saxta biznes qərarı vermə;
- tamamlanmış modulu yalnız correctness, security, performance, maintainability və ya sənəd uyğunsuzluğu səbəbilə dəyiş;
- hər böyük dəyişiklikdə “niyə indi?” əsaslandırmasını yaz: risk, blocker, missing capability və ya operational deficiency;
- bir fazanın açıq gate-i bağlanmadan daha sonrakı fazadan böyük capability yığma.

### 3. Məcburi texnologiya və arxitektura

#### Monorepo

- `pnpm` workspaces və Turborepo;
- strict TypeScript;
- vahid lint/format/typecheck/test komandaları;
- lockfile repository-də saxlanmalıdır.

Təklif olunan struktur:

```text
apps/
  storefront/       # Next.js 16, müştəri saytı
  backoffice/       # Next.js 16, admin + POS
  api/              # NestJS 11 modular monolith
packages/
  ui/               # paylaşılmış primitive-lər, yalnız həqiqətən ortaq olanlar
  contracts/        # API contract, enum və generated client tipləri
  config/           # lint, TypeScript və digər ortaq config
  testing/          # ortaq test helper-ləri
infra/
  docker/
docs/
  adr/
  api/
```

#### Frontend

- Next.js 16 App Router, React, TypeScript;
- server component əsaslı storefront, yalnız lazım olan hissələrdə client component;
- SEO metadata, sitemap, robots, canonical URL və məhsul structured data;
- responsive, mobile-first və accessibility əsaslı UI;
- storefront və backoffice üçün ayrı auth/session sərhədləri;
- form validation üçün server contract ilə uyğun schema;
- API state üçün məqsədəuyğun query/cache yanaşması;
- backoffice POS PWA quraşdırılmasına hazır olsun, lakin satışları təhlükəli formada offline qəbul etməsin.

#### Backend

- NestJS 11, REST API və OpenAPI;
- modular monolith, controller/application/domain/infrastructure sərhədləri;
- PostgreSQL əsas verilənlər bazası;
- Prisma ORM və migration-lar;
- Redis cache, rate limit və qısaömürlü koordinasiya üçün;
- BullMQ background job-lar üçün;
- S3-compatible object storage məhsul şəkilləri üçün;
- transactional outbox: payment, order və inventory hadisələrinin etibarlı asinxron emalı üçün;
- API versioning və request correlation ID.

Əsas backend modulları:

```text
auth
staff
customers
catalog
pricing
inventory
carts
orders
payments
fulfillment
delivery
pickup
pos
cash-register
promotions
reports
media
notifications
audit
health
```

Modullar bir-birinin cədvəllərinə nəzarətsiz yazmamalıdır. Dəyişikliklər application service və açıq domain contract vasitəsilə edilməlidir.

#### İnfrastruktur

- lokal inkişaf üçün Docker Compose: PostgreSQL, Redis, S3-compatible MinIO və mail catcher;
- hər tətbiq üçün production Dockerfile;
- environment validation və `.env.example`, lakin heç bir secret repository-yə yazılmamalıdır;
- CI: install, lint, typecheck, test, migration check və build;
- readiness/liveness endpoint-ləri;
- structured JSON logging, correlation ID, error tracking və əsas metriklər;
- gündəlik backup və bərpa proseduru sənədləşdirilməlidir;
- deployment provider-dən asılı olmayan konteyner arxitekturası qur.

### 4. Arxitektura prinsipləri

1. **Modul monolit:** ilk versiyada paylanmış sistem yaratma. Modul sərhədləri və outbox gələcəkdə ayrılmanı mümkün etsin.
2. **Vahid commerce nüvəsi:** online sifariş və POS eyni məhsul, qiymət, stok və satış qaydalarından istifadə etsin.
3. **Stok ledger-i:** stok dəyişməsinin səbəbi və mənbə sənədi olmadan quantity dəyişmə.
4. **Ayrı vəziyyətlər:** order, payment və fulfillment statusları bir enum-da birləşdirilməməlidir.
5. **Idempotency:** checkout, payment create/callback, refund və POS sale retry zamanı təkrar əməliyyat yaratmamalıdır.
6. **Pul dəqiqliyi:** JavaScript floating-point ilə pul hesablaması etmə. PostgreSQL `Decimal(18,2)`, application qatında decimal money value object və `AZN` currency istifadə et. Gateway sərhədində provayder formatına təhlükəsiz çevir.
7. **Tarix:** DB-də UTC saxla; biznes hesabatlarını `Asia/Baku` timezone-u ilə hesabla.
8. **Snapshot:** sifariş sətrində məhsul adı, SKU/barkod, vergi, vahid qiymət və endirim snapshot kimi saxlanmalıdır; sonrakı kataloq dəyişikliyi köhnə sifarişi dəyişməməlidir.
9. **Soft delete:** maliyyə, sifariş, payment, POS və stok ledger qeydləri silinməməlidir. Ləğv/reversal ayrıca hadisə kimi yazılmalıdır.
10. **Least privilege:** staff icazələri həm API, həm UI səviyyəsində yoxlanmalıdır; UI gizlətmək authorization hesab edilmir.

### 5. Əsas domen modeli

Model adları dəyişə bilər, lakin aşağıdakı anlayışlar itirilməməlidir.

#### Identifikasiya və istifadəçilər

- `Customer`, `CustomerAddress`, `CustomerSession`;
- `StaffUser`, `Role`, `Permission`, `StaffSession`;
- customer və staff login/session axınları ayrı;
- `AuditLog`: actor, action, entity type/id, əvvəlki və yeni təhlükəsiz metadata, IP, user-agent, correlation ID, timestamp.

#### Kataloq

- `Category`: ağac strukturu, slug, status, SEO;
- `Brand`;
- `Product`: ad, slug, təsvir, status, zəmanət və SEO;
- `ProductVariant`: SKU, unikal barkod, atributlar, cari qiymət, əvvəlki qiymət, cost və aktivlik;
- `ProductMedia`;
- `AttributeDefinition`, `AttributeValue`;
- məhsulun özündə və ya variantında satış edilməsini qarışdırma: satılan vahid həmişə variant/SKU olmalıdır;
- eyni aktiv barkod birdən çox varianta bağlana bilməz.

#### Stok

- `Location`: mağaza, anbar və pickup nöqtəsi;
- `InventoryBalance`: variant + location üzrə on-hand, reserved, available;
- `InventoryMovement`: receipt, sale, reservation, reservation_release, transfer, return, adjustment, damage;
- `StockReservation`: online order üçün müddətli rezerv;
- mənfi stok default olaraq qadağandır;
- hər stok dəyişikliyi DB transaction və row-level concurrency nəzarəti ilə aparılmalıdır;
- `available = onHand - reserved` invariantı qorunmalıdır;
- payment uğursuz/ləğv və reservation timeout olduqda rezerv azad edilməlidir;
- POS tamamlanan anda stok birbaşa seçilən location-dan çıxılmalıdır.

#### Qiymət və kampaniya

- base price və sale price;
- variant səviyyəsində qiymət;
- promo code və qayda əsaslı endirim üçün genişlənə bilən model;
- birinci versiyada sadə faiz/sabit məbləğ və minimum səbət qaydası;
- endirim toplamı subtotal-dan çox ola bilməz;
- checkout zamanı bütün qiymətlər serverdə yenidən hesablanmalıdır.

#### Səbət və sifariş

- `Cart`, `CartItem`;
- guest cart və authenticated cart merge qaydası;
- `Order`, `OrderItem`, `OrderAddress`, `OrderStatusHistory`;
- insan tərəfindən oxunan unikal order number;
- order total komponentləri: subtotal, discount, delivery fee, tax, grand total;
- order status: `PENDING_PAYMENT`, `CONFIRMED`, `PROCESSING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`;
- status keçidləri backend state machine ilə yoxlanmalıdır;
- payment status: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELLED`, `PARTIALLY_REFUNDED`, `REFUNDED`;
- fulfillment status ayrıca saxlanmalıdır;
- ləğvdə stok, payment və fulfillment nəticələri transaction/saga qaydası ilə uzlaşdırılmalıdır.

#### Çatdırılma və pickup

- fulfillment type: `DELIVERY` və `PICKUP`;
- `DeliveryZone`: ad, aktivlik, fee, minimum pulsuz çatdırılma məbləği, təxmini müddət;
- zonalar ilk versiyada admin tərəfindən idarə edilən rayon/poçt kodu və ya polygon modelinə hazır sadə qayda ilə işləsin;
- `PickupLocation`: ünvan, koordinat, iş saatları, əlaqə və pickup üçün ayrılan stock location;
- checkout yalnız seçilmiş ünvana uyğun aktiv zonanı və ya aktiv pickup nöqtəsini qəbul etsin;
- delivery fee yalnız serverdə hesablansın;
- pickup sifarişi hazır olduqda müştəriyə bildiriş;
- fulfillment event və status tarixçəsi saxlanmalıdır.

#### Ödəniş

Ödəniş abstraction-u:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
  refund(input: RefundPaymentInput): Promise<RefundResult>;
  cancel(input: CancelPaymentInput): Promise<CancelResult>;
  verifyWebhook(input: RawWebhookInput): Promise<VerifiedPaymentEvent>;
}
```

- ilkin online gateway: Epoint;
- adapter strukturu BirPay və ya AzeriCard ilə əvəzlənə bilsin;
- adi kart və merchant müqaviləsində aktivdirsə bank taksiti;
- gateway capability-ləri config/API cavabından alınsın; dəstəklənməyən taksit ayı UI-da göstərilməsin;
- provider-hosted redirect/3DS istifadə et;
- `Payment`, `PaymentAttempt`, `Refund`, `PaymentEvent`;
- create/refund request-lərində idempotency key;
- callback imzasını raw request body üzərindən verify et;
- yalnız frontend redirect nəticəsinə əsasən sifarişi ödənmiş sayma;
- callback təkrar gələ bilər və sırası dəyişə bilər;
- periodik reconciliation job pending payment-ləri provider-dan yoxlasın;
- məbləğ, currency və order əlaqəsi uyğun gəlmədikdə avtomatik `PAID` etmə və security event yarat;
- tam və qismən refund modeli olsun;
- COD yalnız uyğun delivery/pickup qaydalarında aktiv olsun.

Development üçün `MockPaymentProvider`:

- yalnız non-production environment-də aktivləşsin;
- success, failure, timeout və duplicate callback ssenarilərini idarə olunan şəkildə yarada bilsin;
- production-da mock seçilərsə tətbiq startup zamanı dayansın.

#### POS və kassa

- backoffice daxilində kassir üçün klaviatura ilə tam işlənə bilən sürətli POS ekranı;
- USB barkod skaneri HID keyboard kimi işləməlidir: input fokusda olmasa belə kontrollu scanner buffer barkodu qəbul etsin, Enter terminatorunu dəstəkləsin;
- barkod tapılmadıqda aydın xəta və manual məhsul axtarışı;
- eyni barkod yenidən skan ediləndə quantity artsın;
- quantity dəyişmə, sətir silmə və icazəli manual endirim;
- kassir yalnız öz aktiv `CashShift`-i ilə satış edə bilsin;
- `CashRegister`, `CashShift`, `CashMovement`, `PosSale`, `PosSaleItem`, `PosPayment`, `PosReturn`;
- shift opening float, cash in/out, expected cash, counted cash və difference;
- POS payment method: cash və card;
- fiziki terminal inteqrasiyası hazır deyilsə card əməliyyatı “external terminal confirmed” kimi yalnız icazəli kassir təsdiqi, terminal reference və audit log ilə qeyd edilsin;
- fiziki terminal taksiti üçün bank adı, ay sayı və reference saxlanıla bilsin;
- POS satışının stok çıxışı, payment qeydi və receipt nömrəsi bir transaction daxilində tamamlanmalıdır;
- retry eyni satışı ikinci dəfə yaratmamalıdır;
- qaytarma original sale və item-lərlə əlaqələndirilməli, icazə və refund qaydasına tabe olmalıdır;
- qaytarılan məhsulun satıla bilən olub-olmamasına görə stok location/status seçilməlidir;
- brauzer çapı üçün A4 və termal receipt görünüşü;
- fiskal e-kassa inteqrasiyası üçün ayrıca `FiscalReceiptProvider` interface yarat, amma rəsmi provider/credential olmadan saxta fiskal çek yaratma. Production launch checklist-də qanuni inteqrasiya məcburi risk kimi göstərilsin.

#### Hesabatlar

Minimum hesabatlar:

- gün üzrə satış sayı, gross, endirim, refund, net sales;
- ay üzrə eyni göstəricilər və gündəlik breakdown;
- online və POS kanal müqayisəsi;
- cash, card, installment və COD payment breakdown;
- kassir və kassa növbəsi üzrə satış;
- ən çox satılan məhsul/variant;
- aşağı stok və stok hərəkətləri;
- sifariş və fulfillment status breakdown;
- delivery fee və zone breakdown.

Qaydalar:

- hesabat filter-ləri `Asia/Baku` biznes gününə uyğun olsun;
- maliyyə göstəriciləri order, payment və refund source-of-truth qeydlərindən hesablansın;
- böyük hesabatlar queue ilə CSV export oluna bilsin;
- dashboard üçün pre-aggregation/materialized view yalnız ölçüləndən sonra əlavə edilsin;
- report total-ları eyni dövrün source transaction-ları ilə reconciliation testindən keçsin.

### 6. Auth və icazələr

#### Customer auth

- guest checkout dəstəyi;
- email və ya telefon əsaslı hesab modeli genişlənə bilsin;
- təhlükəsiz password hash;
- email/telefon verification və password reset interface-ləri;
- müştəri yalnız öz sifariş və ünvanlarını görə bilsin.

#### Staff auth

- storefront customer auth-dan ayrı endpoint, cookie adı, audience və session store;
- qısaömürlü access session və rotation/revocation olan refresh session;
- HTTP-only, Secure, SameSite cookie;
- admin hesabları üçün MFA-ya hazır model;
- login rate limit, lockout/backoff və audit;
- rol/permission nümunələri:
  - `ADMIN`;
  - `MANAGER`;
  - `CASHIER`;
  - `WAREHOUSE`;
  - `REPORT_VIEWER`.
- təhlükəli əməliyyatlar ayrıca permission tələb etsin: qiymət dəyişmə, stok adjustment, manual discount, refund, shift discrepancy approval, staff management.

### 7. API və contract qaydaları

- `/api/v1` version prefix;
- OpenAPI sənədi və generated typed client;
- input validation, normalize və output serialization;
- standart error envelope: code, message, details, correlationId;
- pagination cursor əsaslı və ya sabit contract ilə;
- list endpoint-lərində filter/sort allowlist;
- bütün mutation endpoint-lərində uyğun authorization;
- checkout, POS sale, payment create və refund üçün `Idempotency-Key`;
- webhook endpoint raw body saxlamadan signature verification etməlidir;
- PII və secret loglanmamalıdır;
- health endpoint həssas config göstərməməlidir.

### 8. UI tələbləri

#### Storefront

- ana səhifə, kateqoriya, axtarış, məhsul detalı, səbət, checkout, payment result, order tracking və account;
- AZ dili əsas; mətnlər i18n strukturunda saxlanmalıdır;
- qiymətlər `az-AZ`, `AZN` formatında;
- loading, empty, validation, out-of-stock və gateway failure halları;
- şəkillər optimize edilməli və alt text olmalıdır;
- keyboard navigation, focus state və uyğun kontrast;
- checkout-da delivery/pickup və cash/card/installment seçimləri yalnız backend eligibility cavabına görə göstərilsin.

#### Backoffice/POS

- storefront komponentlərinin kopyası deyil, iş axınına uyğun ayrıca dizayn;
- RBAC-a uyğun navigation;
- kataloq, stok, sifariş, fulfillment, POS, növbə, hesabat, staff və audit bölmələri;
- cədvəllərdə server pagination/filter;
- destructive əməliyyatlarda səbəb və təsdiq;
- POS üçün böyük toxunma hədəfləri, keyboard shortcuts və skan sonrası sürətli feedback;
- scanner input normal klaviatura yazısından vaxt/terminator qaydası ilə ayrılmalı, checkout form sahələrinə təsadüfən yazmamalıdır.

### 9. Təhlükəsizlik və uyğunluq

- OWASP əsaslı threat model sənədi yarat;
- CSRF, XSS, SQL injection, SSRF, brute force, broken access control və webhook spoofing risklərini konkret mitigasiya et;
- security header-lər və sərt CORS allowlist;
- request body limit və file upload MIME/size yoxlaması;
- object storage private olsun, signed URL istifadə et;
- secret-lər environment/secret manager-dən;
- DB user least privilege;
- dependency və container vulnerability scan CI-a əlavə edilsin;
- audit log dəyişdirilə bilməyən append-only yanaşmaya yaxın qurulsun;
- PII retention və silinmə/anonymization siyasəti sənədləşdirilsin;
- kart məlumatı sistemdən keçmədiyi üçün provider-hosted checkout seç;
- Azərbaycan fiskal çek, vergi, istehlakçı hüquqları və şəxsi məlumat tələbləri hüquq/maliyyə mütəxəssisi ilə production-dan əvvəl təsdiqlənməli olan launch gate kimi yazılsın.

### 10. Test strategiyası

#### Unit

- money/discount/delivery fee hesablaması;
- order/payment/fulfillment state transition;
- inventory invariant və reservation expiration;
- permission qaydaları;
- report date range və timezone.

#### Integration

- PostgreSQL və Redis ilə real test container-ləri;
- eyni SKU üçün paralel checkout zamanı oversell olmaması;
- eyni idempotency key ilə təkrar checkout/POS/payment;
- duplicate və out-of-order webhook;
- payment failure/cancel zamanı stock release;
- refund və inventory return;
- shift close expected/counted cash;
- audit log yaradılması.

#### E2E

- müştəri: məhsul → səbət → delivery/pickup → cash order;
- müştəri: kart/taksit sandbox redirect → signed callback → paid order;
- admin: məhsul/variant/barkod yaratma → stock receipt;
- kassir: shift open → barcode scan → cash/card sale → receipt → shift close;
- refund authorization və POS return;
- günlük/aylıq hesabatın seed edilmiş transaction-larla uyğunluğu;
- rolun icazəsiz endpoint və səhifəyə girişinin bloklanması.

Testlər deterministik olmalı, timezone və external provider davranışını idarə etməlidir. Yalnız mock-lanmış unit testlə kifayətlənmə; pul və stok üçün DB integration testləri məcburidir.

### 11. Observability və əməliyyat tələbləri

- request, job və webhook üçün correlation ID;
- structured log-larda order/payment ID ola bilər, kart/secret/şəxsi həssas data ola bilməz;
- metriklər: request latency/error, queue depth/failure, payment success/failure, pending payment age, inventory reservation expiration, order throughput;
- alert-lər: payment callback verification failure artımı, reconciliation mismatch, queue stuck, DB connection saturation, backup failure;
- retry exponential backoff və dead-letter strategiyası;
- admin üçün failed job-u kor-koranə təkrar etmə yox, təhlükəsiz əməliyyat runbook-u;
- payment və stok reconciliation üçün scheduled job;
- migration-lar rollback və ya forward-fix strategiyası ilə deploy sənədində izah edilsin.

### 11.1. Sübut və əməliyyat artefaktları

Hər kritik capability aşağıdakı artefaktlarla dəstəklənməlidir:

- developer-facing modul sənədi və ya mövcud modul sənədinin yenilənməsi;
- API contract dəyişibsə OpenAPI və generated client;
- yeni queue/job varsa retry, DLQ və replay davranışının runbook qeydi;
- yeni risk və ya xarici asılılıq varsa risk register və ya open decisions yeniləməsi;
- production davranışına təsir edən dəyişiklik varsa deployment/runbook/launch checklist düzəlişi;
- mühit səbəbilə icra edilə bilməyən test və rehearsal-lar üçün explicit “verification pending” qeydi.

### 12. Performans hədəfləri

İlkin hədəflər:

- storefront əsas səhifələrində yaxşı Core Web Vitals;
- katalog read endpoint-lərində normal yükdə p95 < 400 ms;
- POS barkod lookup p95 < 250 ms lokal region şəbəkəsində;
- checkout mutation p95 < 1 s, external gateway redirect yaradılması xaric;
- bütün list endpoint-lərində pagination;
- uyğun DB index-ləri: slug, SKU, barcode, order number, payment provider ID, status+createdAt, variant+location;
- N+1 query və limitsiz export qadağandır.

Hədəfləri sintetik/load testlə ölç və nəticəni sənədləşdir. Ölçmədən cache və mürəkkəb pre-aggregation əlavə etmə.

### 13. İcra fazaları

#### Faza 0 — Discovery və qərarlar

- repository vəziyyətini yoxla;
- `docs/architecture.md`, ilkin ERD və status transition sənədi;
- ADR-lər: modular monolith, auth sərhədi, inventory ledger, payment adapter, money/timezone;
- risk register və production launch checklist;
- yalnız bundan sonra foundation-a keç.

Qəbul meyarı: domen sərhədləri, source of truth, statuslar və kritik failure ssenariləri yazılıdır.

#### Faza 1 — Foundation

- monorepo və tətbiq skeleton-ları;
- PostgreSQL, Redis, MinIO Docker Compose;
- Prisma foundation, config validation, logging, error handling, health;
- CI, lint, typecheck, test və build;
- seed infrastrukturu.

Qəbul meyarı: təmiz clone-dan sənədləşdirilmiş komandalarla sistem qalxır və bütün quality gate-lər keçir.

#### Faza 2 — Auth, catalog və inventory

- customer/staff auth sərhədləri və RBAC;
- catalog CRUD və media;
- variant, SKU və unikal barkod;
- locations, stock receipt/adjustment/transfer və ledger;
- admin UI;
- audit.

Qəbul meyarı: admin məhsul yaradır, barkod verir, anbara mal qəbul edir; icazəsiz rol bunu edə bilmir; bütün stok hərəkətləri izlənir.

#### Faza 3 — Storefront, cart və checkout

- SEO storefront;
- catalog/search/filter;
- cart/guest cart;
- server-side price validation;
- delivery/pickup eligibility və fee;
- cash order və reservation.

Qəbul meyarı: müştəri delivery və pickup ilə cash order yarada bilir, stok rezerv olunur və oversell integration testi keçir.

#### Faza 4 — Online payment və fulfillment

- payment provider abstraction;
- Epoint sandbox adapter və mock provider;
- ordinary card/installment eligibility;
- signed webhook, reconciliation, refund/cancel;
- order/payment/fulfillment state machine;
- notification jobs.

Qəbul meyarı: success/failure/timeout/duplicate callback ssenariləri order və stokda düzgün nəticə yaradır. Real Epoint credential yoxdursa bu açıq şəkildə sandbox kimi qalır.

#### Faza 5 — POS və kassa növbəsi

- POS barcode UX;
- shift open/close və cash movement;
- cash/card sale;
- receipt;
- return/refund və permissions;
- eyni inventory core-dan istifadə.

Qəbul meyarı: barkodla satış stokdan bir dəfə çıxır, retry duplicate sale yaratmır, kassa fərqi və qaytarma audit olunur.

#### Faza 6 — Hesabatlar

- günlük/aylıq və kanal/payment/kassir/product hesabatları;
- Baku timezone;
- CSV export job;
- reconciliation testləri.

Qəbul meyarı: seed edilmiş satış/refund dataset-ində hesabat total-ları source transaction-larla tam uyğun gəlir.

#### Faza 7 — Hardening və production readiness

- security review/threat model nəticələrinin tətbiqi;
- load test və index tuning;
- backup/restore sınağı;
- observability/alerts;
- deployment və runbook;
- accessibility və E2E regression;
- fiskal, hüquqi və merchant launch gate-lərinin yoxlanması.

Qəbul meyarı: bütün CI gate-ləri keçir, kritik security finding yoxdur, rollback/restore və payment reconciliation proseduru sınaqdan keçirilib.

### 14. Definition of Done

Funksiya yalnız aşağıdakılar tamamlandıqda bitmiş sayılır:

- biznes qaydası backend-də məcburidir;
- authorization və validation var;
- migration və uyğun index mövcuddur;
- audit tələb olunan mutation-larda işləyir;
- unit və integration test var, kritik user flow-dursa E2E də var;
- OpenAPI/typed contract yenilənib;
- loading/error/empty UI halları var;
- lint, typecheck, test və production build keçir;
- secret və PII loglanmır;
- sənədləşmə və runbook təsirlənirsə yenilənib.

Bitmiş sayılmayan hallar:

- yalnız UI axını işləyir, amma backend guard yoxdur;
- mock/sandbox davranışı production capability kimi təqdim olunur;
- yalnız unit test var, amma pul, stok, auth və concurrency qaydası integration sübutu tələb edir;
- sənəd, OpenAPI və implementasiya bir-biri ilə ziddiyyət təşkil edir;
- acceptance meyarı mühitdə yoxlanmayıb, amma nəticə “tamamlandı” kimi təqdim olunur.

### 15. İlkin konfiqurasiya qərarları

Bu məlumatlar real biznes qərarı verilənədək admin config və ya environment ilə dəyişə bilsin:

- mağaza/pickup ünvanları və iş saatları;
- delivery zonaları, fee və free-delivery minimumu;
- reservation timeout;
- COD eligibility;
- taksit ayları və minimum məbləğ — yalnız provider capability ilə kəsişən seçimlər;
- refund approval limitləri;
- stock low threshold;
- receipt məlumatları və hüquqi rekvizitlər;
- notification provider-ləri.

Heç bir real telefon, ünvan, VÖEN, merchant ID, API secret və hüquqi mətn uydurma.

### 16. İlk cavab formatın

Bu promptu aldıqdan sonra:

1. workspace üzrə faktiki tapıntını yaz;
2. mövcud repo-dakı işi Faza 0-7 üzrə xəritələndir və hansı acceptance gap-lərin qaldığını göstər;
3. qəbul etdiyin fərziyyələri və yalnız həqiqətən bloklayan sualları qeyd et;
4. fazalara bölünmüş konkret icra planı ver;
5. yaradacağın və ya dəyişəcəyin əsas fayl, modul və sənədləri sadala;
6. Faza 0/Faza 1 və ya davam etdiyin cari faza üçün verification komandalarını göstər;
7. açıq qərar, credential və ya mühit bloklarını ayrıca “external/blocking gates” kimi ayır;
8. istifadəçi icraya razılıq veribsə ən yüksək prioritetli açıq fazadan başla, əks halda kodu dəyişmə.

Arxitekturanı sadələşdirmək və ya texnologiyanı dəyişmək istəyirsənsə əvvəl texniki səbəb və trade-off göstər. Əsas prioritetlər: maliyyə düzgünlüyü, stok bütövlüyü, təhlükəsizlik, audit edilə bilmə, kassir sürəti və davamlı inkişaf.

## PROMPT SONU

---

## İstifadə qeydi

Production inteqrasiyasından əvvəl Epoint merchant hesabında kart/taksit imkanları, callback imza mexanizmi, refund qaydaları və sandbox credential-ları təsdiqlənməlidir. Müqavilə başqa provayderlə bağlanarsa commerce nüvəsini dəyişmək əvəzinə yalnız `PaymentProvider` adapteri əlavə və ya əvəz edilməlidir.
