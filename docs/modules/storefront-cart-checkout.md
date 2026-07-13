# Storefront, cart və cash checkout

**Status:** Başlanıb; static gate-lər keçir. Real PostgreSQL acceptance suite-i
hostda Docker olmadığı üçün icra edilməyib.

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
- Səbət item-i variant/SKU səviyyəsindədir. Product özü satış vahidi deyil.
- Cart `ACTIVE`, `CHECKED_OUT` və `ABANDONED` statuslarını saxlayır. Checkout
  tamamlanmış cart-a yeni item yazmaq `409` qaytarır.

## Delivery və pickup eligibility

- Delivery/pickup seçimləri `/api/v1/storefront/fulfillment/options` endpoint-i
  ilə verilir.
- Delivery fee yalnız backend-də hesablanır. `freeDeliveryMinimum` keçildikdə
  fee `0.00` qaytarılır.
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
  hazırdır; expiration/release job-u Faza 4 fulfillment/payment işində
  tamamlanmalıdır.

## Storefront UI

- Ana səhifə real public catalog API-dən oxuyur və dinamik render olunur.
- Product detail server action ilə guest cart yaradır və item əlavə edir.
- Cart səhifəsi fulfillment option-larını backend-dən alır və cash checkout
  yaradır.
- Online kart/taksit UI-da aktiv deyil; bu Faza 4-də provider-hosted payment
  axını ilə əlavə edilməlidir.

## Verification

Yazılmış acceptance suite:

- cash delivery checkout stok quantity-ni `reserved` kimi saxlayır;
- eyni cart retry ikinci reservation/order yaratmır;
- eyni tək stok vahidi üçün ikinci cart checkout-u `409` ilə bloklanır.

İcra statusu:

- `lint`, `typecheck`, unit test və build static gate-ləri keçir;
- `test:integration` real PostgreSQL tələb edir və Docker olmayan hostda
  bloklanır.
