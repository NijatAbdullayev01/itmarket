# Online payment və fulfillment

**Status:** Başlanıb; mock provider ilə hosted checkout, signed callback,
pending-payment timeout, duplicate callback qoruyucuları və mock remote-status
reconciliation implementasiya edilib. Staff order operations, fulfillment
transition-ları və Redis lease ilə işləyən recurring expiration/outbox/report
worker-ləri əlavə olunub. Real Epoint sandbox adapter-i merchant sənədi və
credential-ları gözləyir.

## Payment core

- `Payment`, `PaymentAttempt` və `PaymentEvent` cədvəlləri online payment
  lifecycle-ni order-dan ayrıca, lakin əlaqəli formada saxlayır.
- Storefront online checkout `PENDING_PAYMENT` order yaradır, stok rezerv edir
  və ayrıca hosted payment sessiyası açır.
- `PAYMENT_PROVIDER=mock` üçün checkout URL storefront daxilində sandbox
  provider səhifəsinə yönləndirir; production-da mock provider yenə bloklanır.

## Signed callback və idempotency

- Mock provider callback payload-ı `APP_SECRET` əsasında HMAC ilə imzalanır.
- `/api/v1/payments/webhooks/mock` imzanı yoxlayır, amount/currency/order
  uyğunluğunu təsdiqləyir və yalnız sonra state transition tətbiq edir.
- `provider_event_id` unique constraint duplicate callback-in ikinci transition
  yaratmasının qarşısını alır.
- Gecikmiş və ya uyğunsuz event saxlanılır, lakin order-i avtomatik `PAID`
  etmir.

## State transition davranışı

- Online checkout başlanğıcı: `order=PENDING_PAYMENT`,
  `payment=PENDING`, `fulfillment=PENDING`.
- Uğurlu paid callback: `order=CONFIRMED`, `payment=PAID`,
  `fulfillment=RESERVED`.
- Failed/cancelled callback: order ləğv olunur, rezerv təhlükəsiz azad edilir,
  fulfillment `CANCELLED` olur.
- Timeout callback avtomatik paid/fail sayılmır; reservation TTL bitdikdə
  reconciliation/expiration axını order-i ləğv edir və rezervi `EXPIRED` edir.

## Notification outbox və recurring jobs

- Payment nəticələri üçün `notification_outbox` cədvəlinə outbox entry-ləri
  yazılır.
- `JobsService` Redis lease ilə periodik worker kimi işləyir, pending payment
  expiration-ı, mock provider üzərindən pending payment reconciliation-ını,
  stale cash reservation cleanup-ni və pending outbox entry-lərinin emalını
  çoxlu instance-da duplicate olmadan aparır.
- Bu mərhələdə emal nəticəsi təhlükəsiz audit/log dispatch-dir; real e-mail/SMS
  provider inteqrasiyası hələ ayrıca launch gate olaraq qalır.

## Staff fulfillment axını

- `/api/v1/orders` staff səthi sifariş siyahısı və detalını qaytarır.
- `fulfillment.write` icazəsi olan əməkdaşlar pickup və delivery order-lərini
  `CONFIRMED -> PROCESSING -> READY_FOR_PICKUP/OUT_FOR_DELIVERY -> COMPLETED`
  keçidlərindən keçirə bilir.
- `COMPLETE` mərhələsində aktiv reservation `CONSUMED` olur, `reserved`
  azalır, `on_hand` stok çıxılır və inventory ledger-ə `order-fulfillment`
  movement yazılır.
- Paid online order-lərin cancellation/refund orkestri tam qurulmadığı üçün
  fully paid order cancellation backend tərəfindən qəsdən bloklanır.

## Storefront axını

- Checkout formu backend eligibility-yə əsasən cash və online payment
  seçimlərini göstərir.
- Online card/taksit seçimi mock hosted checkout səhifəsinə yönləndirir.
- Status səhifəsi order/payment/fulfillment vəziyyətini API-dən oxuyur; frontend
  redirect tək source of truth deyil.
- Playwright mock API browser səviyyəsində hosted checkout -> signed callback ->
  status səhifəsi axınını da doğrulayır.

## Verification

Yazılmış Phase 4 acceptance suite aşağıdakı ssenariləri qoruyur:

- signed paid callback order-i təsdiqləyir və rezervi saxlayır;
- failed callback rezervi bir dəfə azad edir;
- timeout expiration order-i ləğv edir və rezervi `EXPIRED` edir;
- duplicate callback ikinci transition yaratmır;
- amount/currency mismatch callback-i qeyd olunur, amma order-i `PAID` etmir;
- signed callback gəlməsə də mock provider-də staged remote nəticə
  reconciliation job ilə tətbiq oluna bilir;
- staff pickup fulfillment-i completion zamanı reservation-ı `CONSUMED` edir;
- outbox processor pending notification-ları `PROCESSED` vəziyyətinə keçirir.

## Açıq qalan hissələr

- Epoint sandbox adapter-i və merchant capability mapping;
- refund/cancel use-case-lərinin provider-specific orchestration hissəsi;
- delivery/pickup admin CRUD və real notification provider dispatch-i;
- real PostgreSQL integration icrası üçün Docker blocker-i.
