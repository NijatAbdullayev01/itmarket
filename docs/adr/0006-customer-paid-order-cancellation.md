# ADR-0006: Ödənilmiş sifarişin müştəri ləğvi və avtomatik refund

- **Status:** Accepted
- **Tarix:** 2026-07-23
- **Qərar sahibləri:** Product + Engineering
- **Əvəz edir:** yoxdur

## Kontekst

Müştəri hesabından sifariş ləğvi `PENDING_PAYMENT`, `UNDER_REVIEW` və `CONFIRMED`
statuslarında icazəlidir. Staff ləğvi və refund isə `sales.refund` icazəsi tələb edir.
Online ödəniş artıq `PAID` olduqda bu iki actor arasında refund icazəsi asimmetriyası
yaranır.

## Qərar

**Variant A — icazə verilir:** müştəri `CONFIRMED` + `PAID` online sifarişi ləğv etdikdə
backend avtomatik full refund orkestri işlədir; `sales.refund` tələb olunmur. Staff
ləğvi/refund isə əvvəlki kimi `sales.refund` icazəsi ilə qalır.

Müştəri ləğvi yalnız fulfillment başlamamış (`CONFIRMED`) və ya ödəniş/gözləmə mərhələsində
(`PENDING_PAYMENT`, `UNDER_REVIEW`) mümkündür; `PROCESSING` və sonrakı statuslarda ləğv
bloklanır.

## Səbəb

- Ödənişdən dərhal sonra, anbar hazırlığına keçməmiş müştəri öz sifarişindən imtina edə
  bilsin; UX sadə qalsın.
- Refund provider adapter-i vasitəsilə server-side orkestr olunur; client refund icazəsi
  almır.
- Staff workflow refund nəzarətini saxlayır: fulfillment başladıqdan sonra
  ləğv/refund staff (`sales.refund`) ilə; qismən refund **API-only**
  (`POST /orders/:id/refunds`). Backoffice-də ayrıca qismən məbləğ formu yoxdur —
  UI ödənilmiş sifarişi ləğv edəndə full refund orkestr edir.

## Nəticələr

### Müsbət

- Müştəri self-service ləğv + pul qaytarılması bir addımda.
- Mövcud `cancelByCustomer` → `applyOrderCancellation(allowPaidRefund: true)` axını
  dəyişmədən qalır.
- Idempotency açarı `order-cancel:{orderId}` duplicate refund yaratmır.

### Mənfi

- Fraud/abuse riski: tez-tez ödə → ləğv et → refund dövrü.
- Provider refund limiti və komissiya itkiləri biznes tərəfindən izlənməlidir.
- Staff ilə müştəri refund siyasətinin fərqi sənədləşdirilməli və testlə qorunmalıdır.

## Qoruyucular və verification

- Ownership check: yalnız sifariş sahibi ləğv edə bilər.
- Status allowlist: `canCustomerCancelOrderStatus`.
- Refund idempotency: `order-cancel:{orderId}`.
- Audit: `OrderStatusHistory.actorType=CUSTOMER`, audit log, outbox `orders.cancelled`.
- Rate limit: customer cancel endpoint üçün auth + IP/identity rate limit (tövsiyə).
- Integration test: PAID online sifariş müştəri ləğvi → `paymentStatus=REFUNDED`.
- Staff paid cancel hələ də `sales.refund` tələb edir (ayrıca test).

## Rədd edilən alternativlər

**Variant B — məhdudlaşdır:** müştəri PAID sifarişi ləğv edə bilməz; refund yalnız staff
workflow. Daha sərt maliyyə nəzarəti verir, lakin self-service UX-i zəiflədir və mövcud
baseline sənədləri ilə uyğun gəlmirdi.

## Yenidən baxma trigger-ləri

- Chargeback/fraud itkiləri həddini keçəndə.
- Provider refund SLA və ya komissiya strukturu dəyişəndə.
- Fulfillment SLA qısaldıqda (CONFIRMED pəncərəsi daralanda).
- Partial refund self-service tələb olunduqda.
