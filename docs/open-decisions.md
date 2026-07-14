# Açıq qərarlar

**Status:** Aktiv  
**Son yenilənmə:** 2026-07-14  
**Qayda:** Qərar sahibi təsdiq etmədən biznes, hüquqi və provider davranışı uydurulmur. Təqvim planı olmadığı üçün son tarix müvafiq fazanın giriş gate-i ilə göstərilir.

## Qərar registeri

| ID    | Qərar                                                                                                 | Sahib                            | Son tarix / gate                                 | Cari vəziyyət                                             |
| ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| D-001 | Verginin qiymətə daxil olub-olmaması, dərəcə və line/order rounding ardıcıllığı                       | Finance + Legal                  | Faza 2 pricing schema-dan əvvəl                  | Açıq                                                      |
| D-002 | Cash payment üçün ayrıca rounding qaydasının lazım olub-olmaması                                      | Finance                          | Faza 5 POS payment-dən əvvəl                     | Açıq                                                      |
| D-003 | Reservation timeout müddəti                                                                           | Product + Operations             | Faza 3 checkout-dan əvvəl                        | Açıq                                                      |
| D-004 | COD-un delivery/pickup zonaları və məbləğlər üzrə eligibility qaydası, həmçinin nə vaxt `PAID` olması | Product + Finance + Operations   | Faza 3 checkout-dan əvvəl                        | Açıq                                                      |
| D-005 | Hər cash register üçün paralel aktiv shift sayı                                                       | Retail Operations + Finance      | Faza 5 shift modelindən əvvəl                    | İlkin texniki default: maksimum 1; biznes təsdiqi açıqdır |
| D-006 | Return pəncərəsi, refund approval limitləri və satıla bilən/damaged qaytarma qaydası                  | Product + Finance + Legal        | Faza 5 return/refund-dan əvvəl                   | İlkin texniki default var: original sale item-ə bağlı refund, `sales.refund` guard və sellable restock; damaged-flow siyasəti açıqdır |
| D-007 | Stock transfer üçün bir və ya iki mərhələli göndərmə/qəbul prosesi                                    | Warehouse Operations             | Faza 2 inventory transfer-dən əvvəl              | Açıq                                                      |
| D-008 | Partial fulfillment və split shipment ehtiyacı                                                        | Product + Operations             | Faza 3 scope freeze-dən əvvəl                    | İlkin versiyada scope xaricindədir                        |
| D-009 | İnsan tərəfindən oxunan order number formatı                                                          | Product + Finance                | Faza 3 order migration-dan əvvəl                 | Açıq                                                      |
| D-010 | Fiskal receipt number formatı və rəsmi e-kassa provider tələbi                                        | Finance + Legal                  | Faza 5-dən əvvəl; production üçün məcburi gate   | Açıq, production blocker                                  |
| D-011 | Admin/staff MFA-nın ilkin production launch üçün məcburiliyi                                          | Security + Operations            | Faza 2 auth contract-dan əvvəl                   | Açıq                                                      |
| D-012 | Epoint merchant capability-ləri, imza, installment, refund, cancel və amount formatı                  | Product/Finance + Payments Owner | Faza 4 real sandbox adapter-dən əvvəl            | Açıq, credential tələb edir                               |
| D-013 | Media üçün malware scanning provider-i və moderation siyasəti                                         | Security + Product               | Faza 2 media upload-dan əvvəl                    | Açıq                                                      |
| D-014 | PII retention, anonymization və backup-dan silinmə müddəti                                            | Legal + Security                 | Faza 2 customer data modelindən əvvəl            | Açıq, production blocker                                  |
| D-015 | Hosting, WAF, secret manager və observability provider-ləri                                           | DevOps + Security                | Faza 7 staging-dən əvvəl                         | Açıq                                                      |
| D-016 | Repository lisenziyası və paylanma modeli                                                             | Product/Legal                    | Repository üçüncü tərəfə təqdim edilməzdən əvvəl | Açıq; `LICENSE` qəsdən yaradılmayıb                       |

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
