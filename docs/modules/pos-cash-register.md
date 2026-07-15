# POS və cash register

**Status:** Başlanıb; cash register, shift lifecycle, barcode lookup, idempotent
cash/card POS sale, original sale item-lərinə bağlı POS return/refund,
non-fiscal receipt görünüşü və audit edilmiş discrepancy approval axınları
implementasiya edilib.

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
- Installment sale `INSTALLMENT` payment method-u, `bankName`,
  `installmentMonths` və `externalTerminalReference` metadata-sı ilə audit
  olunur; stok və sale transaction axını card sale ilə eyni qaydada işləyir.

## POS return / refund

- `POST /api/v1/pos/returns` `Idempotency-Key` tələb edir və original
  `PosSaleItem` sətirlərinə bağlı partial/full return yaradır.
- Return yalnız `sales.refund` permission-u olan əməkdaş üçün açıqdır; API guard
  UI gizlətməsindən asılı deyil.
- Cash refund zamanı eyni shift daxilində `CashMovement(type=REFUND)` yazılır və
  expected cash hesabı bunu mənfi hərəkət kimi çıxır.
- `restockToInventory=true` olduqda qaytarılan say seçilmiş `STORE`
  location-un stokuna geri əlavə olunur və `InventoryMovement(type=RETURN)`
  ledger-ə yazılır.
- Card refund üçün ayrıca `externalTerminalReference` tələb olunur; bu mərhələdə
  fiziki terminal inteqrasiyası deyil, audit edilən “external terminal
  confirmed” modelidir.

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
- UI-də brauzer çapına uyğun qeyri-fiskal receipt görünüşü verilir; A4 və
  80mm termal çap rejimləri mövcuddur.
- `FiscalReceiptProvider` port-u `FISCAL_RECEIPT_PROVIDER=none` default-u ilə
  qeydiyyatdadır; rəsmi provider olmadan saxta fiskal çek yaradılmır.

## Verification

Yazılmış Phase 5 integration suite aşağıdakı ssenariləri qoruyur:

- idempotent cash sale stokdan yalnız bir dəfə çıxır;
- duplicate retry eyni sale-i qaytarır;
- cash sale cash movement və audit yaradır;
- idempotent cash return/refund stok və cash ledger-ə yalnız bir dəfə təsir edir;
- installment sale bank adı, ay sayı və terminal reference metadata-sını saxlayır;
- refund permission-u olmayan staff POS return yarada bilmir;
- discrepancy olan shift `CLOSING` olur və approval ilə `CLOSED` olur.

PostgreSQL acceptance suite bu hostda doğrulanıb.

## Açıq qalan hissələr

- rəsmi fiscal receipt provider inteqrasiyası və merchant credential-ları.
