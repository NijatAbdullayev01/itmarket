# Reports

**Status:** Başlanıb; RBAC qorunan report API-si, `Asia/Baku` biznes gün
filter-ləri, satış/channel/payment/cashier/product breakdown-ları, low stock və
inventory movement report-ları üçün ilk implementation əlavə edilib.

## Sales report source-of-truth

- Online channel üçün satış source-of-truth `orders` cədvəlidir.
- Report-a yalnız aşağıdakılar daxil edilir:
  - `paymentStatus=PAID` olan online sifarişlər;
  - ayrıca online `Payment` sətri olmayan və `PENDING_PAYMENT` olmayan COD
    sifarişləri.
- POS channel üçün source-of-truth `pos_sales` və `pos_sale_items` cədvəlləridir.
- Gündəlik və aylıq bucket-lər `Asia/Baku` biznes vaxtına görə hesablanır.

## Mövcud endpoint-lər

- `GET /api/v1/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - summary;
  - by-day və by-month totals;
  - channel, payment method, cashier və top product breakdown;
  - order status və delivery zone breakdown;
  - mövcud məhdudiyyət qeydləri.
- `GET /api/v1/reports/inventory/low-stock`
  - `threshold` query verilməzsə `system_metadata.reports.lowStockThreshold`
    və ya default `5` istifadə olunur.
- `GET /api/v1/reports/inventory/movements?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - movement ledger-i Baku biznes günü ilə qaytarır.

## Authorization

- Bütün report endpoint-ləri `reports.read` permission-u tələb edir.
- Bu guard API səviyyəsində məcburidir; yalnız UI gizlətməsi ilə kifayətlənilmir.

## Hazırkı məhdudiyyətlər

- Refund və POS return flow-ları hələ tamamlanmadığı üçün `refundTotal` hazırda
  `0.00` qaytarılır.
- CSV export job və background worker hələ implementasiya edilməyib; növbəti
  increment-də ayrıca persisted job modeli və worker ilə tamamlanmalıdır.
- Hesabat aggregation-ı hazırda tətbiq qatında edilir; böyük date range-lər üçün
  gələcəkdə SQL/read-model optimizasiyası tələb oluna bilər.

## Verification

Faza 6 üçün ilk integration suite aşağıdakı acceptance halları üçün yazılıb:

- COD, paid online və POS satışları eyni gün report total-larında reconcile olur;
- failed online payment report gross/net total-larına daxil edilmir;
- report viewer endpoint-lərə daxil ola bilir, icazəsiz rol `403`, anonymous
  request `401` alır;
- low stock və movement report-ları ledger/source data ilə uyğun gəlir.
