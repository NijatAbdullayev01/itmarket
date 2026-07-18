# Online payment və fulfillment

**Status:** Kod tamamlanıb; provider-agnostic payment port, first-party
`/checkout/pay` handoff, mock/Epoint continue axını, signed callback,
pending-payment timeout, duplicate/out-of-order callback qoruyucuları,
authorized-to-paid capture axını və mock remote-status reconciliation
implementasiya edilib. Staff order operations, refund/cancel orchestration,
fulfillment transition-ları və Redis lease ilə işləyən recurring
expiration/outbox/report worker-ləri əlavə olunub. `PAYMENT_PROVIDER=epoint`
üçün public-spec əsaslı hosted checkout, signed callback verification, status
reconciliation və reverse/refund adapter-i qoşulub; merchant credential-ları və
installment capability mapping hələ ayrıca gate-dir.

## Payment core

- `Payment`, `PaymentAttempt` və `PaymentEvent` cədvəlləri online payment
  lifecycle-ni order-dan ayrıca, lakin əlaqəli formada saxlayır.
- `FulfillmentEvent` cədvəli reservation, dispatch, pickup-ready, completion və
  cancellation kimi fulfillment keçidlərini ayrıca tarixçə kimi saxlayır; online
  checkout başlanğıcı, `AUTHORIZED` capture-gözləmə mərhələsi və refund nəticəsi
  də eyni timeline-da görünür.
- Storefront online checkout `PENDING_PAYMENT` order yaradır, stok rezerv edir
  və ayrıca hosted payment sessiyası açır.
- Online checkout client-ə həmişə first-party `/checkout/pay` handoff URL
  qaytarır; real provider hosted URL `PaymentAttempt.providerCheckoutUrl`-də
  saxlanır. `PAYMENT_PROVIDER=mock` üçün «Ödənişə keç» signed mock callback
  ilə tamamlanır; real provider üçün eyni düymə saxlanmış checkout URL-ə
  yönləndirir. Production-da mock provider yenə bloklanır.
- Provider seçimi registry/factory qatından edilir; order və refund məntiqi mock
  implementasiyaya birbaşa bağlı deyil.
- Epoint adapter-i `https://epoint.az/api/1/*` endpoint-lərinə signed
  `application/x-www-form-urlencoded` request göndərir, `transaction`-u
  `providerPaymentId` kimi saxlayır və status API ilə pending reconciliation
  edir.
- Epoint refund orkestri son uğurlu payment callback/status payload-indən
  `card_id` çıxararaq `/refund-request` çağırır; pending/authorized cancel isə
  `/reverse` ilə aparılır.

## Signed callback və idempotency

- Mock provider callback payload-ı `APP_SECRET` əsasında HMAC ilə imzalanır.
- `/api/v1/payments/webhooks/mock` imzanı yoxlayır, amount/currency/order
  uyğunluğunu təsdiqləyir və yalnız sonra state transition tətbiq edir.
- `/api/v1/payments/webhooks/epoint` Epoint-in `data` + `signature`
  callback-ini SHA1/base64 qaydasına görə yoxlayır, payload-ı decode edir və
  eyni payment state policy qatına ötürür.
- `provider_event_id` unique constraint duplicate callback-in ikinci transition
  yaratmasının qarşısını alır.
- Gecikmiş və ya uyğunsuz event saxlanılır, lakin order-i avtomatik `PAID`
  etmir.
- Ləğv olunmuş və ya timeout olmuş sifarişə sonradan `PAID` event gəlsə sistem
  sifarişi avtomatik yenidən aktiv etmir; `payments.manual-review.required`
  outbox siqnalı yaradaraq manual reconciliation tələb edir.

## State transition davranışı

- Online checkout başlanğıcı: `order=PENDING_PAYMENT`,
  `payment=PENDING`, `fulfillment=PENDING`; `orders.online.created`
  fulfillment event-i yazılır.
- Uğurlu paid callback: `order=CONFIRMED`, `payment=PAID`,
  `fulfillment=RESERVED`.
- `AUTHORIZED` callback sifarişi hələ `CONFIRMED` etmir; order
  `PENDING_PAYMENT` qalır və yalnız sonrakı capture/paid hadisəsi ilə
  təsdiqlənir; bu aralıq vəziyyət ayrıca fulfillment event kimi saxlanılır.
- Failed/cancelled callback: order ləğv olunur, rezerv təhlükəsiz azad edilir,
  fulfillment `CANCELLED` olur.
- Timeout callback avtomatik paid/fail sayılmır; reservation TTL bitdikdə
  reconciliation/expiration axını mümkün olduqda provider cancel/reverse çağırır,
  sonra order-i ləğv edir və rezervi `EXPIRED` edir.
- COD checkout birbaşa `CONFIRMED / PENDING / RESERVED` vəziyyətində başlayır və
  `orders.cash.created` fulfillment event-i yazır; sonrakı `START_PROCESSING`
  hadisəsi də mövcud `RESERVED` fulfillment statusunu saxlayır.

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
- paid online order cancellation və staff refund endpoint-i backend-də refund
  orkestri ilə idarə olunur; bu əməliyyatlar `sales.refund` icazəsi tələb edir
  və duplicate refund yaratmamaq üçün idempotent açarla qorunur.

## Storefront axını

- Checkout formu backend eligibility-yə əsasən cash və online payment
  seçimlərini göstərir.
- Checkout create request-ləri order üzərində saxlanan
  `checkoutIdempotencyKey` ilə qorunur; eyni key retry-də mövcud checkout
  qaytarılır, fərqli key ilə eyni səbət üçün ikinci checkout qəbul edilmir.
  Eyni key fərqli səbətlər arasında qlobal blok yaratmır; scope checkout-un aid
  olduğu səbətlə məhdud qalır.
- Online card seçimi əvvəlcə `/checkout/pay` handoff səhifəsinə aparır;
  «Ödənişə keç» `POST /payments/attempts/:token/continue` vasitəsilə mock-da
  ödənişi tamamlayır və ya Epoint hosted URL-ə yönləndirir. Epoint installment
  capability-si merchant tərəfindən təsdiqlənmiş `EPOINT_INSTALLMENT_MONTHS` və
  `EPOINT_INSTALLMENT_MINIMUM` env-lərinə əsasən elan olunur; request payload-ı
  `is_installment=1` və `other_attr.installment_months` ilə signed formada
  provider-ə ötürülür.
- Status səhifəsi order/payment/fulfillment vəziyyətini API-dən oxuyur;
  `PENDING`/`AUTHORIZED` olduqda soft-poll edir. Frontend redirect tək source
  of truth deyil.
- Playwright mock API browser səviyyəsində handoff -> continue -> status
  səhifəsi axınını da doğrulayır.

## Verification

Yazılmış Phase 4 acceptance suite aşağıdakı ssenariləri qoruyur:

- signed paid callback order-i təsdiqləyir və rezervi saxlayır;
- failed callback rezervi bir dəfə azad edir;
- cancelled callback rezervi bir dəfə azad edir;
- timeout expiration order-i ləğv edir və rezervi `EXPIRED` edir; provider
  cancel uğursuz olsa belə lokal expiration davam edir və manual-review
  siqnalı yaradılır;
- duplicate callback ikinci transition yaratmır;
- out-of-order callback event-i saxlayır, amma artıq settled sifarişi geriyə
  aparmır;
- amount/currency mismatch callback-i qeyd olunur, amma order-i `PAID` etmir;
- signed callback gəlməsə də mock provider-də staged remote nəticə
  reconciliation job ilə tətbiq oluna bilir;
- timeout-dan sonra gələn gecikmiş `PAID` callback sifarişi geri açmır və
  manual-review siqnalı yaradır;
- `AUTHORIZED -> PAID` capture ardıcıllığı order-i yalnız capture-dan sonra
  `CONFIRMED` edir;
- staff pickup fulfillment-i completion zamanı reservation-ı `CONSUMED` edir;
- paid online delivery fulfillment-i completion zamanı reservation-ı bir dəfə
  `CONSUMED` edir;
- paid online pickup fulfillment-i completion zamanı reservation-ı bir dəfə
  `CONSUMED` edir və fulfillment event tarixçəsi ardıcıllığı saxlanır;
- partial refund və eyni idempotency key retry-si duplicate refund yaratmır;
- direct partial/full refund order payment status-u ilə sync qalır və timeline-a
  refund event-i yazılır;
- eyni idempotency key fərqli cart-lər üzrə checkout-ları səhvən konfliktə salmır;
- installment seçimi eligibility cavabına uyğun checkout/payment attempt-də
  saxlanır;
- outbox processor pending notification-ları `PROCESSED` vəziyyətinə keçirir.

## Staff fulfillment konfiqurasiyası

- `GET/POST/PATCH /api/v1/fulfillment/delivery-zones` delivery zone
  siyahısı, yaradılması və yenilənməsi üçün RBAC qorunan endpoint-lərdir.
- `GET/POST/PATCH /api/v1/fulfillment/pickup-locations` pickup məntəqələrini
  idarə edir; yeni pickup yalnız aktiv `STORE` location-a bağlana bilir.
- Oxuma `orders.read`, mutation `fulfillment.write` tələb edir; hər mutation
  audit log yazır.
- Backoffice orders panelində `fulfillment.write` icazəsi olan staff delivery
  zone və pickup CRUD formalarını görür.

## Açıq qalan hissələr

- Epoint merchant credential-ları ilə real sandbox rehearsal və callback
  tunnel/ngrok məşqi;
- merchant panel capability-si ilə env mapping dəyərlərinin canlı sandbox-da
  qarşılıqlı təsdiqi;
- real notification provider dispatch-i.
