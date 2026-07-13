# POS və cash register

**Status:** Başlanıb; cash register, shift lifecycle, barcode lookup, idempotent
cash/card POS sale, non-fiscal receipt görünüşü və audit edilmiş discrepancy
approval axınları implementasiya edilib.

## Cash register və shift core

- `CashRegister`, `CashShift` və `CashMovement` cədvəlləri mağaza kassasını,
  növbəni və nağd hərəkətlərini ayrıca saxlayır.
- Hər register üçün eyni anda maksimum bir aktiv shift (`OPEN`/`CLOSING`) qəbul
  olunur; kassir də eyni anda yalnız bir aktiv shift aça bilər.
- Shift açılışı `OPENING_FLOAT` movement-i yaradır və expected cash bu ledger-dən
  hesablanır.
- `CASH_IN` və `CASH_OUT` yalnız `OPEN` shift-də yazılır; shift `CLOSING`
  olduqda yeni satış və manual cash movement bloklanır.

## POS sale transaction

- `POST /api/v1/pos/sales` `Idempotency-Key` tələb edir və eyni `shiftId` +
  `idempotencyKey` üçün duplicate sale yaratmır.
- POS sale tamamlananda eyni transaction daxilində:
  - `PosSale`, `PosSaleItem` və `PosPayment` yaradılır;
  - stok seçilmiş `STORE` location-dan dərhal çıxılır;
  - hər sətir üçün `InventoryMovement(type=SALE)` ledger-ə yazılır;
  - cash sale-dirsə `CashMovement(type=SALE)` yazılır;
  - audit log yaradılır.
- Card sale yalnız `externalTerminalReference` ilə qəbul olunur və provider
  inteqrasiyası əvəzinə “external terminal confirmed” modeli saxlanır.

## Barcode UX

- `GET /api/v1/pos/lookup?barcode=...` yalnız aktiv `OPEN` shift olduqda işləyir.
- Barkod dəqiq variant üzərindən tapılır, seçilmiş register location-u üzrə
  `available = onHand - reserved` hesablanır.
- Backoffice POS səthi dedike scanner input-u və Enter ilə lookup təqdim edir;
  əlavə olaraq aktiv POS ekranında sürətli klaviatura axını üçün qlobal key
  buffer də var.

## Shift close və discrepancy

- `POST /api/v1/cash-register/shifts/:id/close` counted cash qəbul edir və
  expected cash ilə fərqi hesablayır.
- Fərq yoxdursa shift birbaşa `CLOSED` olur.
- Fərq varsa və actor-da `cash-shift.approve-discrepancy` yoxdursa shift
  `CLOSING` olur və ikinci approval çağırışı tələb edir.
- `POST /api/v1/cash-register/shifts/:id/approve-close` discrepancy-ni auditlə
  bağlayır.

## Receipt

- Backoffice POS sale cavabı `saleNumber` və `receiptNumber` qaytarır.
- UI-də brauzer çapına uyğun qeyri-fiskal receipt görünüşü verilir.
- Fiscal provider inteqrasiyası hələ yoxdur; receipt UI fiskal çek kimi təqdim
  edilmir.

## Verification

Yazılmış Phase 5 integration suite aşağıdakı ssenariləri qoruyur:

- idempotent cash sale stokdan yalnız bir dəfə çıxır;
- duplicate retry eyni sale-i qaytarır;
- cash sale cash movement və audit yaradır;
- discrepancy olan shift `CLOSING` olur və approval ilə `CLOSED` olur.

## Açıq qalan hissələr

- POS return/refund use-case-ləri və `sales.refund` permission axını;
- installment metadata və bank adı saxlanması;
- thermal receipt layout;
- fiscal receipt provider port-u;
- real PostgreSQL acceptance icrası üçün host mühitində uyğun DB/Docker gate-i.
