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

- Guest cart serverdə `Cart` və `CartItem` kimi saxlanır; `guestToken` yalnız
  opaque identifier-dir.
- Storefront `cartId` və `guestToken` dəyərlərini HTTP-only cookie-də saxlayır;
  istifadəçi məhsul detail, səbət və checkout arasında query string-dən asılı
  qalmadan eyni guest səbəti ilə davam edir.
- Səbət item-i variant/SKU səviyyəsindədir. Product özü satış vahidi deyil.
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
- Delivery checkout üçün `administrativeArea` məcburidir; request bu sahə
  olmadan və ya zonanın coverage siyahısına düşmədən qəbul edilmir.
- Delivery checkout zamanı seçilmiş `DeliveryZone` ünvanın
  `administrativeArea` sahəsini həqiqətən əhatə etmirsə request `400`
  qaytarılır; client yalnız zona ID göndərməklə eligibility-ni aşa bilmir.
- Pickup seçimi `PickupLocation`-ı inventory `Location` ilə bağlayır; pickup
  order həmin location-dan rezerv edir.
- Delivery order ilk versiyada aktiv `WAREHOUSE` və ya `STORE` location-dan
  tam quantity mövcuddursa rezerv edir. Multi-location split hələ əlavə
  edilməyib.

## Cash checkout və reservation

- Cash checkout `/api/v1/storefront/checkout/cash` endpoint-indədir və
  `Idempotency-Key` tələb edir.
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
  malikdir; reservation TTL bitdikdə həm `PENDING_PAYMENT`, həm də hələ
  fulfillment-ə götürülməmiş COD order-lərin rezervi scheduled job vasitəsilə bir
  dəfə `EXPIRED` olur və stok təhlükəsiz azad edilir.

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
- Cart səhifəsində səbət sətirlərinin quantity-si dəyişdirilə, silinə və həm
  delivery, həm pickup COD axını form üzərindən tamamlana bilir.
- Online kart/taksit seçimləri checkout formunda aktivdir; provider-hosted mock
  payment səhifəsinə yönləndirir və taksit seçimi UI-da backend contract-i ilə
  uyğun məcbur edilir.

## Verification

Yazılmış acceptance suite:

- cash delivery checkout stok quantity-ni `reserved` kimi saxlayır;
- pickup cash checkout stok rezervini pickup location-da yaradır;
- eyni cart retry ikinci reservation/order yaratmır;
- eyni tək stok vahidi üçün ikinci cart checkout-u `409` ilə bloklanır;
- köhnə `guestToken` checkout olunmuş səbətə işarə etsə belə yeni `ACTIVE` səbət
  rotasiya olunmuş token ilə yaradılır;
- stale COD reservation TTL bitdikdə order `CANCELLED`, reservation `EXPIRED`
  olur və `reserved` stok bir dəfə azalır;
- delivery zone coverage mismatch checkout-u `400` ilə bloklayır;
- Playwright storefront suite boş səbət accessibility-sini, desktop delivery
  COD axınını, online card checkout status axınını və mobil pickup COD axınını
  doğrulayır.

İcra statusu:

- storefront browser E2E keçir;
- repo typecheck, storefront package lint-i və Faz 3 API integration suite-i
  keçir;
- real verification lokal Docker Compose üzərində `postgres` və `redis`
  xidmətləri ilə doğrulanıb;
- repository-level `pnpm lint` Faz 3 scope-u üçün təmizdir.
