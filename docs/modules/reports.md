# Reports

**Status:** Başlanıb; RBAC qorunan report API-si, `Asia/Baku` biznes gün
filter-ləri, satış/channel/payment/cashier/product breakdown-ları, refund-aware
net-sales hesablaması, low stock və inventory movement report-ları, həmçinin
persisted CSV export job + worker axını implementasiya edilib.

## Sales report source-of-truth

- Online channel üçün satış source-of-truth `orders` cədvəlidir.
- Report-a yalnız aşağıdakılar daxil edilir:
  - `paymentStatus=PAID` olan online sifarişlər;
  - ayrıca online `Payment` sətri olmayan və `PENDING_PAYMENT` olmayan COD
    sifarişləri.
- POS channel üçün source-of-truth `pos_sales` və `pos_sale_items` cədvəlləridir.
- Retail refund source-of-truth `pos_returns` və `pos_return_items`
  cədvəlləridir; bu qeydlər POS channel və payment-method breakdown-larından
  çıxılır.
- Gündəlik və aylıq bucket-lər `Asia/Baku` biznes vaxtına görə hesablanır.

## Mövcud endpoint-lər

- `GET /api/v1/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - summary;
  - by-day və by-month totals (hər period üçün nested ONLINE/POS `channels`);
  - channel, payment method, cashier və top product breakdown;
  - order status və delivery zone breakdown;
  - online `refunds` və retail `pos_returns` qeydlərindən hesablanan
    `refundTotal` və `netSales`;
  - mövcud məhdudiyyət qeydləri.
- `GET /api/v1/reports/inventory/low-stock`
  - `threshold` query verilməzsə `system_metadata.reports.lowStockThreshold`
    və ya default `5` istifadə olunur.
- `GET /api/v1/reports/inventory/movements?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - movement ledger-i Baku biznes günü ilə qaytarır.
- `POST /api/v1/reports/exports`
  - `SALES`, `LOW_STOCK` və `INVENTORY_MOVEMENTS` report-ları üçün queued CSV
    export yaradır;
  - export request-ləri DB-də persisted job kimi saxlanır və worker tərəfindən
    arxa planda emal olunur;
  - stale `PROCESSING` export-lar timeout pəncərəsindən sonra worker tərəfindən
    yenidən claim oluna bilir.
- `GET /api/v1/reports/exports`
  - son export job-larının status, row count və failure metadata-sını qaytarır.
- `GET /api/v1/reports/exports/:id/download`
  - yalnız `COMPLETED` export-lar üçün CSV artifact-i qaytarır.

## Backoffice paneli

- Backoffice daxilində `reports.read` icazəsi olan staff üçün ayrıca reports
  paneli göstərilir.
- Panel seçilmiş Baku biznes tarix aralığı üzrə ümumi satış xülasəsini,
  online və satış terminalı (POS) kanal kartlarını, gündəlik/aylıq satış
  cədvəllərini (hər sətirdə Online / Terminal / Cəmi), ödəniş və top məhsul
  breakdown-larını göstərir.
- Tarix filter kartı yalnız `from` / `to` seçimi üçündür; aralıq dəyişəndə
  satış hesabatı avtomatik yenilənir.
- `byDay` və `byMonth` cavablarında hər period üçün nested `channels`
  (ONLINE / POS) breakdown gəlir; CSV export-da `byDayChannel` və
  `byMonthChannel` section-ları da yazılır.
- Aşağıdakı ops səthləri backoffice UI-dan **çıxarılıb** (endpoint-lər
  **API-only** qalır):
  - CSV export düymələri / export növbə paneli (`POST/GET /api/v1/reports/exports`);
  - low-stock («Aşağı stok») viewer (`GET /api/v1/reports/inventory/low-stock`);
  - stok reconciliation paneli (`GET /api/v1/inventory/reconciliation`);
  - audit jurnalı («Son audit qeydləri», `GET /api/v1/audit`).

## Authorization

- Bütün report endpoint-ləri `reports.read` permission-u tələb edir.
- Bu guard API səviyyəsində məcburidir; yalnız UI gizlətməsi ilə kifayətlənilmir.
- Eyni permission export yaratmaq, status izləmək və artifact yükləmək üçün də
  tələb olunur.

## Hazırkı məhdudiyyətlər

- Hesabat aggregation-ı hazırda tətbiq qatında edilir; böyük date range-lər üçün
  gələcəkdə SQL/read-model optimizasiyası tələb oluna bilər.
- Low-stock report əvvəlcə `available <= threshold` filtrini tətbiq edir, sonra
  `limit` kəsir; location filter ilə nəticə daha deterministik scope edilir.
- CSV artifact-i hazırda DB-də saxlanır; böyük export həcmində object storage və
  retention siyasəti ayrıca növbəti scaling increment-i kimi qalır.

## Verification

Faza 6 üçün ilk integration suite aşağıdakı acceptance halları üçün yazılıb:

- COD, paid online və POS satışları eyni gün report total-larında reconcile olur;
- failed online payment report gross/net total-larına daxil edilmir;
- succeeded online refund və POS return report total-larında `refundTotal` və
  `netSales`-i aşağı salır;
- report viewer endpoint-lərə daxil ola bilir, icazəsiz rol `403`, anonymous
  request `401` alır;
- low stock və movement report-ları ledger/source data ilə uyğun gəlir;
- queued sales export worker tərəfindən `COMPLETED` olur və CSV artifact kimi
  yüklənə bilir (API acceptance; backoffice CSV UI yoxdur);
- stale `PROCESSING` export təhlükəsiz şəkildə yenidən claim olunub tamamlanır;
- backoffice browser səviyyəsində report viewer satış xülasəsini görür; CSV
  export / low-stock / reconciliation / audit düymələri UI-da yoxdur;
- low-stock report location scope ilə fixture variantını düzgün qaytarır
  (API).
