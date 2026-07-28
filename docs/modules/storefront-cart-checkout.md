# Storefront, cart və cash checkout

**Status:** Tamamlanıb; static gate-lər, storefront browser E2E və real
PostgreSQL acceptance suite-i lokal Docker Compose mühitində doğrulanıb.

## Public storefront catalog

- Public endpoint-lər `/api/v1/storefront/catalog` altındadır və yalnız
  `ACTIVE` category/product/variant məlumatını qaytarır.
- Məhsul listi search, category, brand və limitli pagination qəbul edir.
- Storefront qiyməti server contract-dan oxuyur; checkout zamanı qiymət cart-dan
  deyil, yenidən DB-dəki aktiv variant qiymətindən hesablanır.
- Product detail structured data üçün SKU, qiymət, valyuta və availability
  məlumatı verir. Şəkil object key-ləri public bucket URL kimi təqdim edilmir.

## Guest cart

- Guest cart serverdə `Cart` və `CartItem` kimi saxlanır; `guestToken` cart
  capability secret-idir (UUID təkbaşına kifayət deyil).
- DB-də token **SHA-256 hash** kimi `guestTokenHash` sahəsində saxlanır;
  plaintext `guestToken` sütunu yalnız legacy dual-read/migrate üçün qalır və
  uğurlu yoxlamadan sonra `null` edilir. Client/header hələ də plaintext token
  göndərir; müqayisə timing-safe hash ilə aparılır.
- Cart oxu/mutate/checkout və `payments/options` `X-Cart-Guest-Token` header
  tələb edir; `GET /cart/:id` cavabında token qaytarılmır (yalnız create).
- Storefront `cartId` və `guestToken` dəyərlərini HTTP-only cookie-də saxlayır;
  istifadəçi məhsul detail, səbət və checkout arasında query string-dən asılı
  qalmadan eyni guest səbəti ilə davam edir.
- Səbət item-i variant/SKU səviyyəsindədir. Product özü satış vahidi deyil.
- Səbətə əlavə/yeniləmə zamanı quantity `available = onHand - reserved`
  limitini aşa bilməz; artıq miqdar `409 Insufficient available stock`
  qaytarır. Beləliklə ödənişə gedən digər sifarişlərin rezervi səbət
  miqdarında da nəzərə alınır.
- Cart `ACTIVE`, `CHECKED_OUT` və `ABANDONED` statuslarını saxlayır. Checkout
  tamamlanmış cart-a yeni item yazmaq `409` qaytarır.
- Storefront səbətdə quantity yeniləmə və sətir silmə əməliyyatlarını ayrıca
  server action-larla edir; checkout tamamlandıqdan sonra aktiv `cartId`
  cookie-si təmizlənir, amma `guestToken` saxlanır ki, növbəti add-to-cart zamanı
  checkout olunmuş səbətə ilişmədən yeni `ACTIVE` səbət rotasiya oluna bilsin.

## Delivery və pickup eligibility

- Delivery/pickup seçimləri `/api/v1/storefront/fulfillment/options` endpoint-i
  ilə verilir.
- Delivery fee yalnız backend-də hesablanır. `freeDeliveryMinimum` keçildikdə
  fee `0.00` qaytarılır.
- Seed / default `BAKU` zonası: standart haqq **10.00 AZN**, pulsuz çatdırılma
  həddi **500.00 AZN** (`fee` / `freeDeliveryMinimum`). Digər zonalar və pickup
  məntəqələri `GET/POST/PATCH /api/v1/fulfillment/…` (**API-only**; backoffice
  zone/pickup UI çıxarılıb) və ya seed/migration ilə idarə olunur. Storefront
  «Çatdırılma və ödəmə» səhifəsi eyni Bakı həddini müştəri mətnində əks etdirir.
- Delivery checkout üçün `administrativeArea` məcburidir; request bu sahə
  olmadan və ya zonanın coverage siyahısına düşmədən qəbul edilmir.
- Delivery checkout zamanı seçilmiş `DeliveryZone` ünvanın
  `administrativeArea` sahəsini həqiqətən əhatə etmirsə request `400`
  qaytarılır; client yalnız zona ID göndərməklə eligibility-ni aşa bilmir.
- Pickup seçimi `PickupLocation`-ı inventory `Location` ilə bağlayır; pickup
  order həmin location-dan rezerv edir.
- Delivery order ilk versiyada aktiv `WAREHOUSE` və ya `STORE` location-dan
  `available = onHand - reserved` üzrə tam quantity yetən ilk məntəqədən
  rezerv edir (yalnız `onHand > 0` kifayət etmir). Multi-location split hələ
  əlavə edilməyib.

## Cash checkout və reservation

- Cash checkout `/api/v1/storefront/checkout/cash` endpoint-indədir və
  `Idempotency-Key` tələb edir.
- **D-004:** Çatdırılmada (DELIVERY) nağd COD yoxdur — `cashCheckout` delivery
  üçün yalnız `INSTALLMENT` (offline taksit baxışı) qəbul edir; adi nağd yalnız
  `PICKUP` üçündür. Delivery kart/taksit online axını ayrıca
  `/checkout/online` üzərindən gedir.
- Retry üçün əsas qoruyucu `cartId` üzrə unique order əlaqəsidir: eyni cart
  təkrar göndərilərsə mövcud order qaytarılır, ikinci order yaranmır.
- Checkout `Serializable` transaction daxilində:
  1. cart və aktiv variantları oxuyur;
  2. delivery/pickup hədəfini validate edir;
  3. order, immutable item snapshot-ları, address və status history yaradır;
  4. `inventory_balances` sətrini `FOR UPDATE` ilə kilidləyir;
  5. `reserved` quantity-ni artırır və `StockReservation` yazır;
  6. cart statusunu `CHECKED_OUT` edir və audit log yaradır.
- `InventoryBalance` DB check-i `on_hand - reserved >= 0` invariantını saxlayır.
- `StockReservation` `ACTIVE`, `RELEASED`, `CONSUMED`, `EXPIRED` statuslarına
  malikdir; reservation TTL bitdikdə `PENDING_PAYMENT`, hələ fulfillment-ə
  götürülməmiş COD (`CONFIRMED`) və taksit baxışındakı (`UNDER_REVIEW`)
  order-lərin rezervi scheduled job vasitəsilə bir dəfə `EXPIRED` olur və stok
  təhlükəsiz azad edilir.

## Storefront UI

- Ana səhifə real public catalog API-dən oxuyur və dinamik render olunur.
- Storefront ana səhifəsi search ilə yanaşı category, brand və sort filter-ləri
  təqdim edir; məhsul siyahısı server contract-dan gələn aktiv katalogla
  sinxron qalır.
- Product detail server action ilə guest cart yaradır və item əlavə edir.
- Cart səhifəsi fulfillment option-larını backend-dən alır və cash checkout
  yaradır.
- Checkout formu `administrativeArea` dəyişəndə delivery option-larını yenidən
  backend eligibility cavabından yükləyir və uyğun olmayan zone seçimini
  avtomatik təmizləyir.
- Cart səhifəsində səbət sətirlərinin quantity-si dəyişdirilə, silinə və pickup
  nağd (COD) və ya delivery kart/taksit axını form üzərindən tamamlana bilir.
- Checkout formu çatdırılma növünü (`STANDART` / `TƏCİLİ`) qeyd edir; ayrıca
  çatdırılma tarixi/saatı seçimi UI-da tələb olunmur.
- Hesab panelində müştəri aktiv sifarişi səbəblə ləğv edə bilir; ödənilmiş
  online sifariş (`CONFIRMED` + `PAID`) ləğv ediləndə avtomatik full refund
  orkestri işləyir ([ADR-0006](../adr/0006-customer-paid-order-cancellation.md)).
  Eyni səbəb modal komponenti backoffice staff ləğvində də istifadə olunur.
- Online kart/taksit seçimləri checkout formunda aktivdir; provider-hosted mock
  payment səhifəsinə yönləndirir və taksit seçimi UI-da backend contract-i ilə
  uyğun məcbur edilir.
- `INSTALLMENT` (hissə-hissə) checkout və kredit müraciəti üçün Azərbaycan
  şəxsi **FIN kodu** məcburidir: 7 simvol (`A–Z` / `0–9`), serverdə
  normalize/uppercase edilir və `Order.finCode` (və ya `CreditApplication.finCode`)
  kimi saxlanır. Digər ödəniş üsullarında FIN göndərilməməlidir.

## Verification

Yazılmış acceptance suite:

- cash delivery checkout stok quantity-ni `reserved` kimi saxlayır;
- online checkout ödəniş başlayan kimi stoku rezerv edir və fulfillment
  `RESERVED` olur; ödəniş `PAID` olduqda rezerv `CONSUMED` olur və qalıq
  cədvəlində «rezerv» sıfırlanır (ödənilməyəndə isə release/expire);
- pickup cash checkout stok rezervini pickup location-da yaradır;
- eyni cart retry ikinci reservation/order yaratmır;
- eyni tək stok vahidi üçün ikinci cart checkout-u `409` ilə bloklanır;
- rezerv olunmuş stok üçün digər səbətə əlavə `409` ilə bloklanır;
- köhnə `guestToken` checkout olunmuş səbətə işarə etsə belə yeni `ACTIVE` səbət
  rotasiya olunmuş token ilə yaradılır;
- stale COD reservation TTL bitdikdə order `CANCELLED`, reservation `EXPIRED`
  olur və `reserved` stok bir dəfə azalır;
- delivery zone coverage mismatch checkout-u `400` ilə bloklayır;
- Playwright storefront suite boş səbət accessibility-sini, desktop delivery
  COD axınını (yalnız pickup), online card checkout status axınını və mobil
  pickup COD axınını
  doğrulayır.

İcra statusu:

- storefront browser E2E keçir;
- repo typecheck, storefront package lint-i və Faz 3 API integration suite-i
  keçir;
- real verification lokal Docker Compose üzərində `postgres` və `redis`
  xidmətləri ilə doğrulanıb;
- repository-level `pnpm lint` Faz 3 scope-u üçün təmizdir.
