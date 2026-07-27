# Açıq qərarlar

**Status:** Aktiv  
**Son yenilənmə:** 2026-07-27  
**Qayda:** Qərar sahibi təsdiq etmədən biznes, hüquqi və provider davranışı uydurulmur. Təqvim planı olmadığı üçün son tarix müvafiq fazanın giriş gate-i ilə göstərilir.

**Production freeze paketi:** D-012 / D-014 / D-015 üçün sahib sualları və imza bloku → [stakeholder-freeze-package.md](stakeholder-freeze-package.md). D-010 qəbul edilib (aşağıdakı qeyd).

## Qərar registeri

| ID    | Qərar                                                                                                 | Sahib                            | Son tarix / gate                                 | Cari vəziyyət                                             |
| ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| D-001 | Verginin qiymətə daxil olub-olmaması, dərəcə və line/order rounding ardıcıllığı                       | Finance + Legal                  | Faza 2 pricing schema-dan əvvəl                  | Açıq; qiymətlər gross AZN kimi saxlanılır, ayrıca tax line yoxdur |
| D-002 | Cash payment üçün ayrıca rounding qaydasının lazım olub-olmaması                                      | Finance                          | Faza 5 POS payment-dən əvvəl                     | İlkin texniki default qəbul edilib: ayrıca cash rounding yoxdur (2 onluq AZN) |
| D-003 | Reservation timeout müddəti                                                                           | Product + Operations             | Faza 3 checkout-dan əvvəl                        | İlkin texniki default qəbul edilib: 15 dəqiqə (`RESERVATION_TTL_MS`) |
| D-004 | COD-un delivery/pickup zonaları və məbləğlər üzrə eligibility qaydası, həmçinin nə vaxt `PAID` olması | Product + Finance + Operations   | Faza 3 checkout-dan əvvəl                        | İlkin texniki default qəbul edilib: COD zone eligibility + ödəniş təhvil/tamamlanmada |
| D-005 | Hər cash register üçün paralel aktiv shift sayı                                                       | Retail Operations + Finance      | Faza 5 shift modelindən əvvəl                    | İlkin texniki default qəbul edilib: maksimum 1 aktiv shift |
| D-006 | Return pəncərəsi, refund approval limitləri və satıla bilən/damaged qaytarma qaydası                  | Product + Finance + Legal        | Faza 5 return/refund-dan əvvəl                   | İlkin texniki default qəbul edilib: original sale item refund, `sales.refund`, `restockToInventory` (default true; false = damaged/no restock). Return pəncərəsi və refund limitləri hələ sahib təsdiqinə açıqdır |
| D-007 | Stock transfer üçün bir və ya iki mərhələli göndərmə/qəbul prosesi                                    | Warehouse Operations             | Faza 2 inventory transfer-dən əvvəl              | İlkin texniki default qəbul edilib: birmərhələli atomik transfer |
| D-008 | Partial fulfillment və split shipment ehtiyacı                                                        | Product + Operations             | Faza 3 scope freeze-dən əvvəl                    | Qəbul edilib: ilkin versiyada scope xaricindədir          |
| D-009 | İnsan tərəfindən oxunan order number formatı                                                          | Product + Finance                | Faza 3 order migration-dan əvvəl                 | İlkin texniki default qəbul edilib: mövcud `orderNumber` generatoru |
| D-010 | Fiskal receipt number formatı və rəsmi e-kassa provider tələbi                                        | Finance + Legal / Product        | Faza 5-dən əvvəl; production üçün məcburi gate   | Qəbul edilib: e-kassa ayrıca cihazdır; POS inteqrasiyası scope xaricində; sənəd nömrəsi `externalTerminalReference`-də qeyd olunur |
| D-011 | Admin/staff MFA-nın ilkin production launch üçün məcburiliyi                                          | Security + Operations            | Faza 2 auth contract-dan əvvəl                   | Qəbul edilib: production-da `STAFF_MFA_REQUIRED=true` məcburidir; non-prod default `false` |
| D-012 | Epoint merchant capability-ləri, imza, installment, refund, cancel və amount formatı                  | Product/Finance + Payments Owner | Faza 4 real sandbox adapter-dən əvvəl            | Açıq, credential tələb edir — freeze paketi               |
| D-013 | Media üçün malware scanning provider-i və moderation siyasəti                                         | Security + Product               | Faza 2 media upload-dan əvvəl                    | İlkin texniki default qəbul edilib: staff-only; magic-byte; `MEDIA_MALWARE_SCAN=local` (opsional `clamav`) |
| D-014 | PII retention, anonymization və backup-dan silinmə müddəti                                            | Legal + Security                 | Faza 2 customer data modelindən əvvəl            | Açıq, production blocker — freeze paketi                  |
| D-015 | Hosting, WAF, secret manager və observability provider-ləri                                           | DevOps + Security                | Faza 7 staging-dən əvvəl                         | Açıq, production blocker — freeze paketi                  |
| D-016 | Repository lisenziyası və paylanma modeli                                                             | Product/Legal                    | Repository üçüncü tərəfə təqdim edilməzdən əvvəl | İlkin default: proprietary All Rights Reserved `LICENSE`  |

## Qəbul edilmiş ilkin texniki default qeydləri

```text
Qərar ID: D-010
Tarix: 2026-07-27
Qərar: Rəsmi e-kassa API-si backoffice/POS-a inteqrasiya edilmir. Fiziki e-kassa ayrıca çap edir; mağaza satışı sistemdə stok çıxışı + hesabat üçündür. Nağd/kart/Wolt/BirMarket satışında e-kassa çek nömrəsi, köçürmədə hesab-faktura nömrəsi `externalTerminalReference` kimi məcburi qeyd olunur. `FISCAL_RECEIPT_PROVIDER=none` production default qalır; proqram fiskal çek yaratmır və browser/termal receipt fiskal sayılmır.
Təsdiqləyən sahib(lər): Product Owner (2026-07-27 təsdiq)
Səbəb: Operator modeli ayrı e-kassa cihazı + əl ilə sənəd nömrəsi qeydi üzərindədir; POS-a e-kassa qoşmaq lazım deyil
Təsir edən ADR/schema/API: PosSale.externalTerminalReference; FISCAL_RECEIPT_PROVIDER=none; docs/modules/pos-cash-register.md
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-27)
```

```text
Qərar ID: D-011
Tarix: 2026-07-27
Qərar: Production-da staff MFA məcburidir (`STAFF_MFA_REQUIRED=true` env validation). Non-production default `false` qalır ki, enrollment və local/dev axını işləsin. Challenge token bir dəfəlikdir (Redis jti consume).
Təsdiqləyən sahib(lər): Security audit (2026-07-27)
Səbəb: Password-only staff login production riski; audit Critical/High sərtləşdirməsi
Təsir edən ADR/schema/API: StaffUser mfa_* sahələri; /api/v1/staff/auth/mfa/*; STAFF_MFA_REQUIRED; Redis `staff-mfa-jti:*`
```

```text
Qərar ID: D-003
Tarix: 2026-07-27
Qərar: Reservation TTL = 15 dəqiqə
Təsdiqləyən sahib(lər): Engineering Lead (ilkin texniki default; Product/Operations son təsdiqi açıq qala bilər)
Səbəb: Storefront checkout artıq bu TTL ilə işləyir; dəyişiklik config/flag tələb edir
Təsir edən ADR/schema/API: apps/api/src/storefront/storefront.module.ts RESERVATION_TTL_MS
```

```text
Qərar ID: D-006 (texniki hissə)
Tarix: 2026-07-27
Qərar: POS return `restockToInventory` (default true); false = damaged/no stock restore. Return window və refund limitləri hələ açıqdır.
Təsdiqləyən sahib(lər): Engineering Lead (ilkin texniki default; Product/Finance/Legal son təsdiqi açıq)
Səbəb: API + backoffice UI artıq flag dəstəkləyir; hüquqi return pəncərəsi ayrıca qərardır
Təsir edən ADR/schema/API: POST /pos/returns restockToInventory; apps/backoffice operations return checkbox
```

```text
Qərar ID: D-007
Tarix: 2026-07-27
Qərar: Stok transferi birmərhələli atomikdır (from→to eyni tranzaksiyada)
Təsdiqləyən sahib(lər): Engineering Lead (ilkin texniki default)
Səbəb: Mövcud inventory.transfer API bu modeli implement edir; iki mərhələli axın ayrıca ADR tələb edir
Təsir edən ADR/schema/API: POST /inventory/transfers
```

```text
Qərar ID: D-008
Tarix: 2026-07-27
Qərar: Partial fulfillment / split shipment ilkin versiyada scope xaricindədir
Təsdiqləyən sahib(lər): Product + Engineering
Səbəb: State machine və fulfillment model vahid shipment fərz edir
Təsir edən ADR/schema/API: docs/state-machines.md
```

```text
Qərar ID: D-016
Tarix: 2026-07-27
Qərar: Repository proprietary — All Rights Reserved LICENSE
Təsdiqləyən sahib(lər): Product/Legal (ilkin default; açıq mənbə seçimi sonradan dəyişə bilər)
Səbəb: Üçüncü tərəfə təqdimdən əvvəl lisenziya boşluğu aradan qaldırılır
Təsir edən ADR/schema/API: /LICENSE
```

```text
Qərar ID: D-013
Tarix: 2026-07-27
Qərar: Catalog media moderation = staff-only (`catalog.write`); allowlist JPEG/PNG/WebP (SVG reject); max 5 MB; MIME client-ə deyil magic-byte/məzmuna əsasən; upload əvvəli `MEDIA_MALWARE_SCAN` gate (default `local` = structure + trailing polyglot; opsional `clamav` = local + clamd INSTREAM). Müştəri UGC şəkil upload-u yoxdur. Commercial AV vendor seçimi Security-nin opsional production sərtləşdirməsi ola bilər.
Təsdiqləyən sahib(lər): Engineering Lead (ilkin texniki default; Security son AV vendor təsdiqi açıq qala bilər)
Səbəb: Client Content-Type spoof və polyglot riski tip/ölçü yoxlaması ilə örtülmürdü; port + local default production-blockersiz baseline verir
Təsir edən ADR/schema/API: media-content-sniff; MediaMalwareScanner; MEDIA_MALWARE_SCAN; CLAMAV_HOST/PORT; POST /catalog/media/upload
```

## Qərar qeydi formatı

Qərar bağlanarkən həmin sətrin vəziyyəti `Qəbul edilib` olaraq dəyişdirilir və aşağıdakı məlumat ayrıca qeyd edilir:

```text
Qərar ID:
Tarix:
Qərar:
Təsdiqləyən sahib(lər):
Səbəb:
Təsir edən ADR/schema/API:
Sübut və ya müqavilə linki:
```

Arxitektura invariantını dəyişən qərar üçün yeni ADR yazılmalıdır. Credential, secret, real şəxsi məlumat və hüquqi rekvizit bu sənədə daxil edilmir.
