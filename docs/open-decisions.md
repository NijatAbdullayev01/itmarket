# Açıq qərarlar

**Status:** Aktiv  
**Son yenilənmə:** 2026-07-28  
**Qayda:** Qərar sahibi təsdiq etmədən biznes, hüquqi və provider davranışı uydurulmur. Təqvim planı olmadığı üçün son tarix müvafiq fazanın giriş gate-i ilə göstərilir.

**Production freeze paketi:** D-012 / D-015 üçün sahib sualları və imza bloku → [stakeholder-freeze-package.md](stakeholder-freeze-package.md). D-010 və D-014 qəbul edilib.

## Qərar registeri

| ID    | Qərar                                                                                                 | Sahib                            | Son tarix / gate                                 | Cari vəziyyət                                             |
| ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| D-001 | Verginin qiymətə daxil olub-olmaması, dərəcə və line/order rounding ardıcıllığı                       | Finance + Legal                  | Faza 2 pricing schema-dan əvvəl                  | Qəbul edilib: vergi qiymətə daxildir (gross AZN); ayrıca tax line / avtomatik vergi hesablaması yoxdur |
| D-002 | Cash payment üçün ayrıca rounding qaydasının lazım olub-olmaması                                      | Finance                          | Faza 5 POS payment-dən əvvəl                     | Qəbul edilib: ayrıca cash rounding yoxdur; məbləğ 2 onluq AZN (qəpik) |
| D-003 | Reservation timeout müddəti                                                                           | Product + Operations             | Faza 3 checkout-dan əvvəl                        | Qəbul edilib: 15 dəqiqə (`RESERVATION_TTL_MS`) |
| D-004 | COD-un delivery/pickup zonaları və məbləğlər üzrə eligibility qaydası, həmçinin nə vaxt `PAID` olması | Product + Finance + Operations   | Faza 3 checkout-dan əvvəl                        | Qəbul edilib: çatdırılmada nağd (COD) yoxdur; nağd yalnız pickup; `PAID` təhvil/tamamlanmada |
| D-005 | Hər cash register üçün paralel aktiv shift sayı                                                       | Retail Operations + Finance      | Faza 5 shift modelindən əvvəl                    | Qəbul edilib: maksimum 1 aktiv shift / 1 kassa; əlavə paralel növbə yoxdur |
| D-006 | Return pəncərəsi, refund approval limitləri və satıla bilən/damaged qaytarma qaydası                  | Product + Finance + Legal        | Faza 5 return/refund-dan əvvəl                   | Qəbul edilib: 14 təqvim günü (Asia/Baku); məbləğ limiti yoxdur (`sales.refund` kifayətdir); stoka qaytar/damaged operator seçimi (`restockToInventory`) |
| D-007 | Stock transfer üçün bir və ya iki mərhələli göndərmə/qəbul prosesi                                    | Warehouse Operations             | Faza 2 inventory transfer-dən əvvəl              | Qəbul edilib: stok transferi scope xaricindədir; `POST /inventory/transfers` rədd edilir |
| D-008 | Partial fulfillment və split shipment ehtiyacı                                                        | Product + Operations             | Faza 3 scope freeze-dən əvvəl                    | Qəbul edilib: ilkin versiyada scope xaricindədir          |
| D-009 | İnsan tərəfindən oxunan order number formatı                                                          | Product + Finance                | Faza 3 order migration-dan əvvəl                 | Qəbul edilib: mövcud `orderNumber` generatoru saxlanılır |
| D-010 | Fiskal receipt number formatı və rəsmi e-kassa provider tələbi                                        | Finance + Legal / Product        | Faza 5-dən əvvəl; production üçün məcburi gate   | Qəbul edilib: e-kassa ayrıca cihazdır; POS inteqrasiyası scope xaricində; sənəd nömrəsi `externalTerminalReference`-də qeyd olunur |
| D-011 | Admin/staff MFA-nın ilkin production launch üçün məcburiliyi                                          | Security + Operations            | Faza 2 auth contract-dan əvvəl                   | Qəbul edilib: production-da `STAFF_MFA_REQUIRED=true` məcburidir; non-prod default `false` |
| D-012 | Epoint merchant capability-ləri, imza, installment, refund, cancel və amount formatı                  | Product/Finance + Payments Owner | Faza 4 real sandbox adapter-dən əvvəl            | Açıq, credential tələb edir — freeze paketi               |
| D-013 | Media üçün malware scanning provider-i və moderation siyasəti                                         | Security + Product               | Faza 2 media upload-dan əvvəl                    | Qəbul edilib: staff-only; magic-byte; `MEDIA_MALWARE_SCAN=local` (opsional `clamav`); commercial AV məcburi deyil |
| D-014 | PII retention, anonymization və backup-dan silinmə müddəti                                            | Legal + Security                 | Faza 2 customer data modelindən əvvəl            | Qəbul edilib: müştəri PII daimi saxlanılır; avtomatik anonymization/silinmə job-u yoxdur |
| D-015 | Hosting, WAF, secret manager və observability provider-ləri                                           | DevOps + Security                | Faza 7 staging-dən əvvəl                         | Açıq, production blocker — freeze paketi                  |
| D-016 | Repository lisenziyası və paylanma modeli                                                             | Product/Legal                    | Repository üçüncü tərəfə təqdim edilməzdən əvvəl | Qəbul edilib: proprietary All Rights Reserved `LICENSE`  |

## Qəbul edilmiş qərar qeydləri

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
Qərar ID: D-001
Tarix: 2026-07-28
Qərar: Qiymətlər vergi daxil (gross AZN) daxil edilir; satıcı vergi məbləğini qiymətə özü daxil edir. Sistem ayrıca tax line, ƏDV dərəcəsi və ya avtomatik vergi ayrışması əlavə etmir.
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Operator qiyməti artıq vergi daxil saxlayır; əlavə vergi mühəndisliyi lazım deyil
Təsir edən ADR/schema/API: docs/adr/0005-money-and-time.md; pricing Decimal gross AZN (tax line yoxdur)
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-002
Tarix: 2026-07-28
Qərar: Ayrıca cash rounding yoxdur. Bütün nağd və digər ödənişlər AZN-də 2 onluq (qəpik) ilə saxlanır və göstərilir; 0.05/0.10 kimi xüsusi nağd yuvarlaqlaşdırma tətbiq edilmir.
Təsdiqləyən sahib(lər): Engineering Lead (məntiqi default; Product Owner 2026-07-28 icazəsi)
Səbəb: AZN qəpik vahidi var; POS və online eyni Decimal(12,2) modeli paylaşır; ayrıca cash rounding kassa fərqi və reconciliation mürəkkəbliyi yaradır, operator ehtiyacı yoxdur
Təsir edən ADR/schema/API: docs/adr/0005-money-and-time.md; POS/cash totals 2 onluq AZN
Sübut və ya müqavilə linki: Product Owner «özün həll et» (chat, 2026-07-28)
```

```text
Qərar ID: D-003
Tarix: 2026-07-28
Qərar: Reservation TTL = 15 dəqiqə
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: 15 dəqiqə checkout və stok saxlama üçün kifayətdir
Təsir edən ADR/schema/API: apps/api/src/storefront/storefront.module.ts RESERVATION_TTL_MS
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-004
Tarix: 2026-07-28
Qərar: Çatdırılmada (DELIVERY) nağd ödəniş (COD) yoxdur. Delivery yalnız kart və ya taksit ilə. Nağd ödəniş yalnız mağazadan götürmə (PICKUP) üçün mümkündür; pickup COD-da `PAID` təhvil/tamamlanmada qeyd olunur.
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Operator çatdırılmada nağd qəbul etmir
Təsir edən ADR/schema/API: storefront cashCheckout D-004 guard; checkoutCash action; docs/modules/storefront-cart-checkout.md
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-005
Tarix: 2026-07-28
Qərar: Hər cash register üçün maksimum 1 aktiv shift. Əlavə paralel növbə və ya eyni kassada ikinci açıq növbə yoxdur (bir növbə = bir kassa).
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Operator modelində əlavə kassa/paralel növbə yoxdur; kassa hesabatı və cash difference bir açıq növbə üzərində qurulur
Təsir edən ADR/schema/API: cash-shift open guard (max 1 active per register)
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-006
Tarix: 2026-07-28
Qərar: (1) POS qaytarma pəncərəsi = 14 təqvim günü, Asia/Baku, satış günü daxil olmaqla (sale day = gün 0 … gün 13). (2) Refund approval məbləğ limiti yoxdur — `sales.refund` icazəsi olan kassir/operator istənilən məbləği özü təsdiq edir; ayrıca menecer threshold-u yoxdur. (3) Satıla bilən vs zədələnmiş: operator UI/API-də `restockToInventory` ilə seçir (default true = stoka qaytar; false = damaged, stoka qayıtmır). Return yalnız orijinal sale item-lərinə bağlıdır.
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Storefront returns copy artıq 14 gün deyir; operator seçimi mövcud checkbox ilə uyğundur; limit əlavə proses yükü yaradırdı
Təsir edən ADR/schema/API: POST /pos/returns; POS_RETURN_WINDOW_CALENDAR_DAYS; restockToInventory; apps/backoffice POS qaytarma checkbox
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-007
Tarix: 2026-07-28
Qərar: Anbarlar/məntəqələr arası stok transferi ilkin versiyada scope xaricindədir. `POST /inventory/transfers` rədd edilir; backoffice «Stok transferi» naviqasiyası gizlədilir. Mövcud ledger `TRANSFER_OUT`/`TRANSFER_IN` hərəkətləri tarixi qalır, yeni transfer yaradılmır. (POS «köçürmə» ödəniş üsulu bu qərara daxil deyil.)
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Operator stok transferi istifadə etmir; qəbul və düzəliş kifayətdir
Təsir edən ADR/schema/API: InventoryService.transfer; bo-nav inventory-transfer; seed MANAGER/WAREHOUSE permissions
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
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
Qərar ID: D-009
Tarix: 2026-07-28
Qərar: İnsan tərəfindən oxunan `orderNumber` formatı mövcud generator ilə saxlanılır; dəyişiklik yoxdur.
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Mövcud format kifayətdir
Təsir edən ADR/schema/API: orderNumber generator
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-013
Tarix: 2026-07-28
Qərar: Catalog media moderation = staff-only (`catalog.write`); allowlist JPEG/PNG/WebP (SVG reject); max 5 MB; MIME client-ə deyil magic-byte/məzmuna əsasən; upload əvvəli `MEDIA_MALWARE_SCAN` gate (default `local` = structure + trailing polyglot; opsional `clamav` = local + clamd INSTREAM). Müştəri UGC şəkil upload-u yoxdur. Commercial AV vendor production üçün məcburi deyil — opsional sərtləşdirmə olaraq qalır.
Təsdiqləyən sahib(lər): Engineering Lead (məntiqi default; Product Owner 2026-07-28 icazəsi)
Səbəb: Staff-only + magic-byte + local/clamav baseline spoof və polyglot riskini örtür; commercial AV əlavə ops xərci tələb edir və launch blocker deyil
Təsir edən ADR/schema/API: media-content-sniff; MediaMalwareScanner; MEDIA_MALWARE_SCAN; CLAMAV_HOST/PORT; POST /catalog/media/upload
Sübut və ya müqavilə linki: Product Owner «özün həll et» (chat, 2026-07-28)
```

```text
Qərar ID: D-014
Tarix: 2026-07-28
Qərar: Müştəri şəxsi məlumatları (PII) daimi saxlanılır. Avtomatik retention müddəti, scheduled anonymization və ya backup-dan məcburi silinmə job-u ilkin versiyada yoxdur. Silinmə yalnız əl ilə / gələcək hüquqi tələb əsasında ayrıca use-case ola bilər; default davranış saxlamaqdır. Access control, audit və log redaction qüvvədə qalır.
Təsdiqləyən sahib(lər): Product Owner (2026-07-28 təsdiq)
Səbəb: Operator müştəri məlumatlarını daimi biznes qeydi kimi saxlamaq istəyir; avtomatik silmə ehtiyacı yoxdur
Təsir edən ADR/schema/API: retention job yazılmır; docs/security-threat-model.md Privacy; stakeholder-freeze-package D-014
Sübut və ya müqavilə linki: Product Owner təsdiqi (chat, 2026-07-28)
```

```text
Qərar ID: D-016
Tarix: 2026-07-28
Qərar: Repository proprietary — All Rights Reserved LICENSE. Açıq mənbə paylanması yoxdur.
Təsdiqləyən sahib(lər): Engineering Lead (məntiqi default; Product Owner 2026-07-28 icazəsi)
Səbəb: Kommersial e-commerce/POS məhsulu; üçüncü tərəfə açıq lisenziya vermək hüquqi qərar tələb edir və indiki model proprietary-dir
Təsir edən ADR/schema/API: /LICENSE
Sübut və ya müqavilə linki: Product Owner «özün həll et» (chat, 2026-07-28)
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
