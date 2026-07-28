# Status keçidləri

**Status:** Accepted baseline  
**Prinsip:** Order, payment və fulfillment statusları ayrı saxlanır. Birinin dəyişməsi digərini yalnız açıq application use-case vasitəsilə dəyişə bilər.

## Ümumi qaydalar

Hər transition:

- backend-də allowlist ilə yoxlanır;
- actor/system reason və timestamp ilə history yaradır;
- authorization tələb edirsə permission yoxlayır;
- eyni event təkrarlandıqda idempotent davranır;
- side effect-i DB transaction daxilində birbaşa xarici sistemə göndərmir, outbox yaradır;
- gözlənilməyən keçiddə generic 500 deyil, stabil domain error qaytarır.

## Order state machine

Statuslar:

- `PENDING_PAYMENT`
- `UNDER_REVIEW`
- `CONFIRMED`
- `PROCESSING`
- `READY_FOR_PICKUP`
- `READY_FOR_DELIVERY`
- `OUT_FOR_DELIVERY`
- `COMPLETED`
- `CANCELLED`

```mermaid
stateDiagram-v2
  [*] --> PENDING_PAYMENT: online payment order
  [*] --> UNDER_REVIEW: eligible COD order awaiting review
  [*] --> CONFIRMED: eligible COD order auto-confirmed
  PENDING_PAYMENT --> CONFIRMED: payment paid
  PENDING_PAYMENT --> CANCELLED: payment failed/cancelled/expired or customer cancel
  UNDER_REVIEW --> CONFIRMED: staff confirms
  UNDER_REVIEW --> CANCELLED: staff or customer cancel
  CONFIRMED --> PROCESSING: staff starts fulfillment
  CONFIRMED --> CANCELLED: staff or customer cancel
  PROCESSING --> READY_FOR_PICKUP: pickup prepared
  PROCESSING --> READY_FOR_DELIVERY: delivery prepared
  PROCESSING --> OUT_FOR_DELIVERY: delivery dispatched
  PROCESSING --> CANCELLED: authorized exceptional cancellation
  READY_FOR_PICKUP --> COMPLETED: handed to customer
  READY_FOR_PICKUP --> CANCELLED: authorized exceptional cancellation
  READY_FOR_DELIVERY --> OUT_FOR_DELIVERY: courier dispatched
  READY_FOR_DELIVERY --> CANCELLED: authorized exceptional cancellation
  OUT_FOR_DELIVERY --> COMPLETED: delivered
  OUT_FOR_DELIVERY --> CANCELLED: failed and cancelled
  COMPLETED --> [*]
  CANCELLED --> [*]
```

Qaydalar:

- Online payment order yalnız doğrulanmış payment nəticəsindən sonra `CONFIRMED` olur.
- Müştəri hesabından ləğv yalnız `PENDING_PAYMENT`, `UNDER_REVIEW` və `CONFIRMED`
  statuslarında icazəlidir; səbəb 3–240 simvol arasında məcburidir.
- Müştəri ləğvi `OrderStatusHistory.actorType=CUSTOMER` ilə, staff ləğvi isə
  `actorType=STAFF` ilə qeyd olunur. Köhnə qeydlər legacy sentinel reason ilə
  müştəri ləğvi kimi tanına bilər.
- Ödənilmiş online sifarişi müştəri `CONFIRMED` statusunda ləğv etdikdə sistem
  avtomatik full refund orkestri işlədir (`sales.refund` tələb olunmur); bu məhsul
  qərarıdır ([ADR-0006](adr/0006-customer-paid-order-cancellation.md)). Staff
  ləğvi/refund isə `sales.refund` icazəsi tələb edir.
- Müştəri paid-refund asimmetriyası fraud/abuse risk daşıyır: rate limit,
  audit log (`OrderStatusHistory`, `orders.cancelled` outbox), refund idempotency
  açarı (`order-cancel:{orderId}`) və ownership check mütləqdir; tez-tez ödə→ləğv
  et nümunələri monitorinq və manual review trigger-i kimi izlənməlidir.
- `COMPLETED` və `CANCELLED` terminal biznes statuslarıdır; refund order statusunu geriyə çevirmir.
- Terminal statusdakı səhvi düzəltmək data update ilə deyil, audit edilən compensation/reversal use-case ilə aparılır.
- Ləğv yalnız stok reservation/release və payment cancel/refund nəticəsi izlənə biləndə tamamlanmış sayılır.
- Pickup order `OUT_FOR_DELIVERY`, delivery order `READY_FOR_PICKUP` ola bilməz.

## Payment state machine

Statuslar:

- `PENDING`
- `AUTHORIZED`
- `PAID`
- `FAILED`
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> AUTHORIZED: provider authorizes
  PENDING --> PAID: provider captures
  PENDING --> FAILED: definitive failure
  PENDING --> CANCELLED: customer/provider cancellation
  AUTHORIZED --> PAID: capture succeeds
  AUTHORIZED --> CANCELLED: void succeeds
  PAID --> PARTIALLY_REFUNDED: partial refund
  PAID --> REFUNDED: full refund
  PARTIALLY_REFUNDED --> PARTIALLY_REFUNDED: another partial refund
  PARTIALLY_REFUNDED --> REFUNDED: cumulative full refund
```

Qaydalar:

- `FAILED` yalnız provider nəticəsi definitivedirsə verilir; timeout `PENDING` qala və reconciliation tələb edə bilər.
- `PAID` üçün verified provider event və amount/currency/order uyğunluğu tələb olunur.
- Eyni callback/event ikinci transition yaratmır.
- Gecikmiş və out-of-order event cari statusu korlamamalıdır; event saxlanır və transition policy tətbiq edilir.
- Refund cəmi paid amount-u keçmir.
- COD payment statusunun nə vaxt `PAID` olması yalnız pickup collection prosesi
  ilə bağlıdır (D-004: delivery COD yoxdur).

## Fulfillment state machine

 İcra olunan statuslar:

- `PENDING`
- `RESERVED`
- `READY_FOR_PICKUP`
- `OUT_FOR_DELIVERY`
- `FULFILLED`
- `CANCELLED`

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> RESERVED: stock reserved / payment settled
  PENDING --> CANCELLED
  RESERVED --> READY_FOR_PICKUP: pickup
  RESERVED --> OUT_FOR_DELIVERY: delivery
  RESERVED --> CANCELLED
  READY_FOR_PICKUP --> FULFILLED
  READY_FOR_PICKUP --> CANCELLED
  OUT_FOR_DELIVERY --> FULFILLED
  OUT_FOR_DELIVERY --> CANCELLED
```

Qaydalar:

- Type `PICKUP` yalnız pickup branch-i, `DELIVERY` yalnız delivery branch-i istifadə edir.
- COD sifarişi checkout zamanı artıq `RESERVED` fulfillment statusu ilə yarandığı
  üçün ilk staff `START_PROCESSING` hadisəsi bu statusu dəyişmir.
- İlk versiyada ayrıca `PREPARING`/`FAILED` fulfillment statusu yoxdur; hazırlıq və
  retry idarəsi `order.status` history-si və audit/outbox hadisələri ilə izlənir.
- Retry əvvəlki delivery cəhdini silmir; event tarixçəsinə yeni attempt əlavə edir.
- Partial fulfillment ilk versiyada scope xaricindədir. Tələb yaranarsa yeni ADR və item-level model lazımdır.

## Stock reservation state machine

Statuslar:

- `ACTIVE`
- `CONSUMED`
- `RELEASED`
- `EXPIRED`

```mermaid
stateDiagram-v2
  [*] --> ACTIVE
  ACTIVE --> CONSUMED: sale/order commits stock
  ACTIVE --> RELEASED: order cancelled/payment failed
  ACTIVE --> EXPIRED: timeout job
```

Qaydalar:

- Yalnız `ACTIVE` reservation `reserved` quantity-yə təsir edir.
- Terminal reservation ikinci dəfə release/consume ediləndə no-op və ya stabil conflict verir; quantity təkrar dəyişmir.
- Expiration job row lock və status condition ilə payment callback yarışını təhlükəsiz idarə edir.

## Cash business-day state machine

Statuslar (`CashShift` — mağaza günü sessiyası):

- `OPEN`
- `CLOSING`
- `CLOSED`

```mermaid
stateDiagram-v2
  [*] --> OPEN: first POS activity of the day
  OPEN --> CLOSING: optional admin count submit
  CLOSING --> CLOSED: count accepted
  CLOSED --> OPEN: next POS activity same day
  OPEN --> CLOSED: auto-close on next business day
```

Qaydalar:

- Kassir növbə açmır; server `Asia/Baku` business date üçün sessiyanı təmin edir.
- Yalnız `OPEN` status satış və cash movement qəbul edir; POS `ensureTodayShift`
  `CLOSING`/`CLOSED` günü yenidən `OPEN` edə bilər.
- Əvvəlki günün açıq sessiyası rollover-da avtomatik `CLOSED` olur.
- Optional close/discrepancy approval legacy admin axını kimi qalır.

## POS return state

Tövsiyə olunan statuslar:

- `REQUESTED`
- `APPROVED`
- `COMPLETED`
- `REJECTED`
- `FAILED`

Return və refund eyni anlayış deyil: məhsulun qəbul edilməsi, stoka yönləndirilməsi və pulun qaytarılması ayrı addımlardır, amma vahid orchestration və audit ilə əlaqələndirilir.

## Error və retry siyasəti

- **Business conflict:** transition tətbiq edilmir, stabil error code qaytarılır.
- **Transient provider failure:** status təhlükəsiz pending vəziyyətdə qalır, retry/reconciliation planlanır.
- **Unknown outcome:** avtomatik əks əməliyyat edilmir; reconciliation və alert yaradılır.
- **Duplicate command:** əvvəlki nəticə qaytarılır.
- **Partial internal failure:** DB transaction rollback edilir.
- **Outbox delivery failure:** domain commit saxlanır, job retry/DLQ-a keçir.

## Test contract

Hər state machine üçün:

1. bütün icazəli keçidlər unit test;
2. bütün qadağan keçidlər parameterized unit test;
3. history/audit və authorization integration test;
4. duplicate və concurrent event integration test;
5. kritik payment/order/inventory kombinasiyaları E2E testlə qorunmalıdır.
