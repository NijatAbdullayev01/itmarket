# ADR-0005: Pul və zaman modeli

- **Status:** Accepted
- **Tarix:** 2026-07-13
- **Qərar sahibləri:** Engineering + Finance

## Kontekst

JavaScript floating-point hesablaması maliyyə xətası yarada bilər. Server, DB, browser və report timezone-ları fərqli olduqda günlük/aylıq nəticələr və expiry səhv hesablanır.

## Qərar — pul

- DB money field-ləri `Decimal(18,2)` istifadə edir.
- Application qatında decimal əsaslı `Money` value object istifadə olunur.
- İlkin currency yalnız `AZN`-dir və hər money result explicit currency daşıyır.
- JavaScript `number` ilə toplama, endirim, vergi və refund hesablanmır.
- Provider minor-unit və ya string formatına adapter sərhədində checked conversion edilir.
- Rounding qaydası Finance tərəfindən təsdiqlənir və bir mərkəzi policy-də tətbiq olunur.
- Order/POS item və totals snapshot saxlanır.

## Qərar — zaman

- DB timestamp-ləri UTC saxlanır.
- API timestamp-ləri timezone-u olan ISO-8601 contract qaytarır.
- Biznes hesabat günü `Asia/Baku` sərhədinə görə hesablanır.
- Expiry və timeout instant/UTC əsasında işləyir, local wall-clock string əsasında deyil.
- Testlər injectable clock və explicit timezone istifadə edir.
- Browser locale yalnız presentation üçündür, source of truth deyil.

## Səbəb

- Decimal deterministic maliyyə nəticəsi verir.
- Explicit currency yanlış vahid birləşməsini bloklayır.
- UTC hadisə sırasını, Baku timezone report biznes mənasını qoruyur.
- Clock injection boundary testlərini deterministik edir.

## Nəticələr

Müsbət:

- floating-point drift yoxdur;
- report və transaction vaxtının mənası aydındır;
- provider mapping review edilə bilir.

Mənfi:

- Decimal serialization və generated client xüsusi mapping tələb edə bilər;
- developer-lər `number` rahatlığından istifadə edə bilmir;
- report query-lərində timezone conversion diqqət tələb edir.

## Qoruyucular

- Money arithmetic üçün lint/review qaydası və unit test.
- Rounding boundary fixture-ları.
- Month/year və timezone sərhədi testləri.
- API money contract-ı string decimal və currency kimi sabitləşdirilir; final format implementation zamanı OpenAPI ilə təsdiqlənir.
- DB və app timezone config startup/CI-da yoxlanır.

## Açıq qərarlar

- Verginin qiymətə daxil olub-olmaması;
- line-level və order-level rounding ardıcıllığı;
- cash payment rounding ehtiyacı;
- provider-in minor-unit/decimal formatı.

Bu qərarlar Finance təsdiqi olmadan uydurulmamalıdır.
