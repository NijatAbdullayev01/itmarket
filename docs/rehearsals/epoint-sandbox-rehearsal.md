# Epoint sandbox rehearsal

**Status:** Prosedur hazır; canlı credential ilə icra sahibdən asılıdır (D-012)  
**Son yenilənmə:** 2026-07-27

## İlkin şərtlər

1. Staging API `PAYMENT_PROVIDER=epoint` ilə işləyir.
2. `EPOINT_PUBLIC_KEY` / `EPOINT_PRIVATE_KEY` secret manager-dən gəlir.
3. İstəyə bağlı: `EPOINT_INSTALLMENT_MONTHS`, `EPOINT_INSTALLMENT_MINIMUM`.
4. Merchant panelində `result_url` staging callback URL-inə işarə edir.
5. Lokal/tunnel üçün readiness: `./scripts/epoint-sandbox-rehearsal-check.sh`.

## Ssenarilər

| # | Axın | Gözlənilən |
|---|------|------------|
| 1 | Card checkout create → provider redirect | `payments.checkout.created`, handoff URL |
| 2 | Success callback (imzalı) | order/payment `PAID`, reservation convert |
| 3 | Failure / cancel callback | payment cancelled/failed, stock release |
| 4 | Timeout expiration job | `payments.timeout.expired`, stok azad |
| 5 | Duplicate / out-of-order callback | ikinci event ignore / no double paid |
| 6 | Refund (merchant-supported) | refund row + outbox email |
| 7 | Installment month UI ↔ env mapping | yalnız merchant-confirmed aylar |

## Sübut

Hər ssenari üçün saxlanılmalı:

- request/response correlation ID;
- provider payment ID;
- order number;
- audit / payment_event sətirləri;
- screenshot və ya merchant panel log linki (secret olmadan).

Nəticə [stakeholder-freeze-package.md](../stakeholder-freeze-package.md) D-012 imza blokuna bağlanır.
