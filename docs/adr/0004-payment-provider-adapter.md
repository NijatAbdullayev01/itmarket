# ADR-0004: Payment provider adapter-i və hosted checkout

- **Status:** Accepted
- **Tarix:** 2026-07-13
- **Qərar sahibləri:** Engineering + Finance + Security

## Kontekst

İlkin provider namizədi Epoint-dir, lakin merchant müqaviləsi və capability-lər dəyişə bilər. Payment commerce nüvəsinə birbaşa bağlansa provider dəyişməsi order/inventory məntiqini riskə atar. Kart məlumatının sistemdən keçməsi compliance və breach təsirini ciddi artırar.

## Qərar

Application qatı provider-agnostic `PaymentProvider` port-u istifadə edir:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
  refund(input: RefundPaymentInput): Promise<RefundResult>;
  cancel(input: CancelPaymentInput): Promise<CancelResult>;
  verifyWebhook(input: RawWebhookInput): Promise<VerifiedPaymentEvent>;
}
```

Kart axını provider-hosted redirect/3DS istifadə edir. PAN/CVV API, frontend log, DB və observability sisteminə daxil edilmir.

Development mock eyni port-u reallaşdırır, yalnız non-production-da işləyir və success/failure/timeout/duplicate ssenarilərini idarə edir. Production mock config-i startup failure-dır.

## Provider adapter məsuliyyəti

- request/response mapping;
- signature verification;
- provider error taxonomy-ni stabil internal nəticəyə çevirmək;
- capability mapping;
- provider ID-ləri saxlamaq;
- timeout və safe retry siyasəti.

Adapter order statusunu birbaşa dəyişmir. Application service verified event-i state policy və transaction ilə tətbiq edir.

## Qoruyucular

- Payment create/refund idempotency key.
- Provider event ID unique constraint.
- Amount, currency, merchant və order reference validation.
- Frontend redirect nəticəsinə etibar edilməməsi.
- Duplicate/out-of-order callback handling.
- Pending reconciliation job və alert.
- Raw body signature test fixture-ları.

## Nəticələr

Müsbət:

- provider dəyişməsi commerce nüvəsini minimum dəyişir;
- test olunan mock/sandbox ssenariləri;
- kart məlumatı scope-u azalır.

Mənfi:

- Provider capability-lərinin ən aşağı ortaq məxrəcə salınması riski;
- adapter contract-ı həddən artıq generic ola bilər;
- reconciliation hər provider üçün ayrıca mapping tələb edir.

## Rədd edilən alternativlər

- Provider SDK-nı birbaşa order service-də işlətmək: coupling və test riski.
- Öz card formumuz: compliance və təhlükəsizlik scope-u qəbuledilməzdir.
- Frontend success redirect-i ilə paid etmək: spoof və lost callback riski.

## Açıq gate

Real adapter accepted sayılmır, ta ki merchant sənədi üzrə signature, installment, refund, cancel, timeout və reconciliation fixture-ları təsdiqlənməyib.
