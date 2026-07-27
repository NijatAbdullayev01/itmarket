# POS və cash register

**Status:** Bir kassa (`KASSA-01`), növbəsiz POS satışı və avtomatik gündəlik
ledger implementasiya edilib. Kassir növbə açmır; satış/return server tərəfində
Asia/Baku business-day sessiyasına bağlanır.

## Bir kassa və business day

- Yalnız bir aktiv `CashRegister` (`KASSA-01`) qəbul olunur; ikinci register
  `409 Conflict` verir.
- `CashShift.businessDate` mağaza gününü (`Asia/Baku`) ifadə edir; kassir
  “növbə aç” ritualı yoxdur.
- `POST /pos/sales`, lookup və products çağırışları `ensureTodayShift` ilə
  bugünkü `OPEN` sessiyanı avtomatik yaradır/yenidən açır.
- Əvvəlki günün `OPEN`/`CLOSING` sessiyası rollover zamanı avtomatik `CLOSED`
  olur (counted = expected).

## Gündəlik ledger

- `PosDailyLedger` hər satış/return ilə eyni transaction-da yenilənir:
  nağd (`CASH`), kart (`CARD`), köçürmə (`TRANSFER`), Wolt (`WOLT`),
  Birmarket (`BIRMARKET`) və taksit (`INSTALLMENT`) ayrıca cəmlənir.
- `PosSale.channel` launcher satış növünü saxlayır; `paymentMethod` isə
  settlement reysidir (marketplace kanalları `CARD` + xarici referans).
- `GET /api/v1/pos/daily-summary?date=YYYY-MM-DD` ledger + saatlıq bucket +
  günün satış siyahısını qaytarır (`refundTotal` qaytarma düyməsi üçün).
- Source of truth qalır: `pos_sales` / `pos_returns` (`createdAt`).

## POS sale transaction

- `POST /api/v1/pos/sales` `Idempotency-Key` tələb edir; `shiftId` client-dən
  tələb olunmur (optional/ignored). Duplicate eyni business-day shift +
  `idempotencyKey` üçün qaytarılır.
- POS sale tamamlananda eyni transaction daxilində:
  - `PosSale`, `PosSaleItem` və `PosPayment` yaradılır;
  - stok seçilmiş `STORE` location-dan dərhal çıxılır;
  - hər sətir üçün `InventoryMovement(type=SALE)` ledger-ə yazılır;
  - cash sale-dirsə `CashMovement(type=SALE)` yazılır;
  - `PosDailyLedger` yenilənir;
  - audit log yaradılır.
- Nağd / kart / Wolt / Birmarket sale `externalTerminalReference`
  (kassa qəbzi) ilə məcburi qəbul olunur; köçürmə satışında eyni sahə
  hesab-faktura nömrəsi kimi daxil edilir. `channel` müvafiq olaraq `CASH` /
  `CARD` / `TRANSFER` / `WOLT` / `BIRMARKET`.
- Installment sale `INSTALLMENT` + `bankName` + `installmentMonths` metadata ilə
  audit olunur (`channel=CARD`).

## POS return / refund

- `POST /api/v1/pos/returns` `Idempotency-Key` tələb edir; `shiftId` server
  tərəfində həll olunur.
- Return yalnız `sales.refund` permission-u olan əməkdaş üçün açıqdır.
- Hər satış sətirində `returnedQuantity` / `returnableQuantity` (`sold - returned`)
  API cavabında verilir; UI yalnız qalan miqdarı qəbul edir.
- `GET /pos/daily-summary` satış siyahısında `returnableQuantity`,
  `externalTerminalReference` (kassa qəbzi / hesab-faktura) və sətir
  snapshot-ları (`productName` / `variantName` / `sku` / `barcode`) göstərir —
  tam qaytarılmış satışlar return picker-dən gizlədilir; UI məhsul və sənəd
  nömrəsi axtarışı ilə günün satışlarını filtr edir.
- Cash refund `CashMovement(type=REFUND)` + daily ledger refund sahəsini yeniləyir.
- `restockToInventory=true` olduqda stok və `InventoryMovement(type=RETURN)`
  yazılır.

## Barcode UX

- `GET /api/v1/pos/lookup` və `GET /api/v1/pos/products` bugünkü business-day
  sessiyasını avtomatik təmin edir (kassir növbə açmır).
- Barkod dəqiq variant üzərindən tapılır; register location-u üzrə
  `available = onHand - reserved`.
- `GET /pos/products` kataloqdan (`ACTIVE` variant) axtarır: ad, brend, SKU,
  barkod. Axtarışda stok 0 olsa belə nəticə göstərilir (UI-də disabled);
  boş axtarışda yalnız bu məntəqədə satıla bilən stok siyahılanır.

## Legacy close / discrepancy

- `POST /cash-register/shifts/:id/close` və approve endpoint-ləri admin/legacy
  üçün saxlanır; POS UI növbə bağlama göstərmir.
- POS satışları gün bağlı olsa belə, növbəti satış üçün `ensureTodayShift`
  bugünkü sessiyanı yenidən `OPEN` edə bilər.

## Receipt

- Backoffice POS sale cavabı `saleNumber` və `receiptNumber` qaytarır
  (backend allocation); satış tamamlandıqdan sonra UI-də qeyri-fiskal çek
  göstərilmir — kassir eyni axında növbəti satışa davam edir.
- Qaytarma/refund ayrıca «Qaytarma» axınındadır (bugünkü satış seçimi).
- `FiscalReceiptProvider` default `none`; rəsmi fiskal çap launch gate-dir.

## Verification

Phase 5 integration suite:

- növbə açmadan idempotent cash sale;
- daily ledger yenilənməsi;
- ikinci kassa yaradılmasının rəddi;
- idempotent return/refund;
- installment metadata;
- refund permission guard;
- discrepancy close/approve (legacy).

## Fiskal provider seçimləri

| `FISCAL_RECEIPT_PROVIDER` | Davranış |
| --- | --- |
| `none` (default, production) | Fiskal çap yoxdur; browser receipt fiskal sayılmır |
| `log` | Staging rehearsal — strukturlaşdırılmış log + sintetik fiscal number; rəsmi e-kassa deyil |

**D-010 qəbul edilib:** e-kassa ayrıca fiziki cihazdır; POS-a rəsmi provider API inteqrasiyası scope xaricindədir. Kassir e-kassa çek / hesab-faktura nömrəsini `externalTerminalReference` ilə qeyd edir. Detal: [open-decisions.md](../open-decisions.md) D-010.

## Açıq qalan hissələr

- POS fiscal API inteqrasiyası yoxdur (D-010 ilə qəsdən scope xaricində).
