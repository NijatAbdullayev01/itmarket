# Production blocker — stakeholder freeze paketi

**Status:** Engineering hazır; D-010 bağlanıb; D-012 / D-014 / D-015 sahib imzası gözlənilir  
**Son yenilənmə:** 2026-07-27  
**Məqsəd:** D-012, D-014 və D-015 bağlanmadan production GO verilmir. Bu sənəd sahiblərin cavablandırmalı olduğu minimum qərar paketidir.

## D-012 — Epoint merchant capability

**Sahib:** Product/Finance + Payments Owner

Cavablandırılmalı:

1. Sandbox və production `EPOINT_PUBLIC_KEY` / `EPOINT_PRIVATE_KEY` secret manager-dədirmi?
2. Dəstəklənən installment ayları (`EPOINT_INSTALLMENT_MONTHS`) və minimum məbləğ?
3. Callback imza, amount/currency formatı və refund/cancel capability-ləri merchant sənədinə uyğundurmu?
4. Staging-də pay / fail / timeout / duplicate callback / refund rehearsal sübutu haradadır?

**Engineering hazırlıq:** Epoint adapter, mock prod qadağası, callback qoruyucuları və [docs/modules/online-payment-fulfillment.md](modules/online-payment-fulfillment.md) rehearsal proseduru mövcuddur. Credential olmadan canlı sandbox bağlana bilməz.

## D-010 — Fiskal / e-kassa provider

**Sahib:** Finance + Legal / Product  
**Status:** Qəbul edilib (2026-07-27)

**Qəbul edilmiş model:**

1. Rəsmi e-kassa API-si backoffice/POS-a inteqrasiya edilmir (scope xaricində).
2. Fiziki e-kassa ayrıca cihazdır; müştəriyə fiskal çeki o çap edir.
3. POS yalnız stok çıxışı, audit və hesabat üçündür; proqram fiskal çek yaratmır.
4. Nağd / kart / Wolt / BirMarket satışında e-kassa çek nömrəsi, köçürmədə hesab-faktura nömrəsi `externalTerminalReference` kimi qeyd olunur.
5. `FISCAL_RECEIPT_PROVIDER=none` production default qalır.

**Engineering hazırlıq:** Mövcud `externalTerminalReference` + `FISCAL_RECEIPT_PROVIDER=none` bu modeli dəstəkləyir. Əlavə provider adapteri tələb olunmur.

## D-014 — PII retention

**Sahib:** Legal + Security

Cavablandırılmalı:

1. Customer PII retention müddəti (gün/ay)?
2. Anonymization qaydası və backup-dan silinmə müddəti?
3. Third-party processing (email, payment, hosting) siyahısı təsdiqlənibmi?

**Engineering hazırlıq:** Audit və auth boundary mövcuddur. Retention job yalnız hüquqi müddət təsdiqləndikdən sonra yazılır.

## D-015 — Hosting / WAF / secrets / observability

**Sahib:** DevOps + Security

Cavablandırılmalı:

1. Hosting platforması və region?
2. WAF / CDN provider?
3. Secret manager və rotation owner?
4. Prometheus scrape, alert receiver və on-call kanalı?

**Engineering hazırlıq:** Docker images, metrics token, alert baseline (`infra/observability/prometheus-alerts.yml`), load (`infra/load/phase7.js`) və restore rehearsal script-ləri hazırdır. Platform seçimi olmadan staging sübutu tamam sayıla bilməz.

## İmza bloku

```text
Tarix: 2026-07-27
D-012: Açıq — imza:
D-010: Qəbul — imza: Product Owner
D-014: Açıq — imza:
D-015: Açıq — imza:
Release owner:
Qalıq blocker-lər: D-012, D-014, D-015
```
