# Auth, catalog və inventory modulları

**Status:** Implemented; real PostgreSQL və browser E2E verification Docker
olmayan hostda bloklanıb.

## Auth sərhədləri

- Staff endpoint-ləri `/api/v1/staff/auth`, customer endpoint-ləri
  `/api/v1/customer/auth` altındadır.
- Staff access cookie-si 15 dəqiqəlik imzalı token, refresh cookie-si isə
  yalnız hash-i DB-də saxlanan 7 günlük opaque token-dir. Rotation əvvəlki
  refresh session-u revoke edir; logout və staff deaktivləşməsi session-ları
  revoke edir.
- Customer və staff cookie adları, audience-ları və session cədvəlləri
  ayrıdır.
- Şifrə random salt ilə scrypt istifadə edir. Login uğursuzluqları
  identifier/IP HMAC-ları üzrə exponential backoff yaradır; e-poçt və IP audit
  diff-inə yazılmır.
- Role adı UX üçündür. API hər mutation-da explicit permission yoxlayır:
  catalog write, price change, receipt, adjustment, transfer, manual discount,
  refund, shift approval, staff management, report və audit read.
- Seed yalnız `NODE_ENV=development` ilə işləyir. Admin yalnız
  `SEED_STAFF_EMAIL` və `SEED_STAFF_PASSWORD` birlikdə açıq verildikdə yaranır;
  repository credential təqdim etmir.

## Catalog

Category tree, brand, product, variant/SKU, attribute və private object
metadata modelləri mövcuddur. Satılan vahid həmişə variantdır. Qiymət
`Decimal(18,2)`/`AZN` saxlanır və API string contract qəbul edir. SKU unikaldır;
eyni barkod yalnız bir `ACTIVE` variantda ola bilər və bu qayda partial unique
DB index ilə məcbur edilir.

List endpoint-ləri limitli pagination, filter və sort allowlist istifadə edir.
Catalog archive əməliyyatı tarixi əlaqələri hard-delete etmir. Media cədvəli
yalnız private storage object key, MIME, ölçü, alt text və sıralama metadata-sı
saxlayır; public bucket URL saxlanmır.

## Inventory

`InventoryBalance` `(variantId, locationId)` üzrə unikaldır.
Receipt/adjustment/transfer:

1. serializable DB transaction açır;
2. balance sətrini `FOR UPDATE` ilə kilidləyir;
3. mənfi on-hand/available nəticəsini rədd edir;
4. balance və immutable movement-i eyni transaction-da yazır;
5. source type, source document, reason və actor tələb edir;
6. təhlükəsiz audit qeydini eyni transaction-da yaradır.

Transfer source və destination balance-larını sabit ardıcıllıqla kilidləyir və
iki movement-i eyni `transferGroupId` ilə yazır. Source document unique
constraint retry-dan duplicate movement yaranmasının qarşısını alır.
Reconciliation endpoint-i balance on-hand ilə ledger cəmini müqayisə edir.
Migration audit və movement cədvəllərində UPDATE/DELETE-i trigger ilə bloklayır.

## API və backoffice

Swagger JSON `/api/openapi.json`, UI `/api/docs` ünvanındadır. Bütün DTO-lar
runtime validation, whitelist və standart error envelope istifadə edir.
Backoffice staff login, category/product/variant/barcode, location və receipt
əməliyyatlarını real API-yə `credentials: include` ilə göndərir. UI permission
əsasında əməliyyatları göstərir, lakin yekun authorization API guard-larındadır.

## Verification

Unit testlər scrypt, explicit permission, aktiv barcode və inventory invariant
qaydalarını yoxlayır. PostgreSQL integration suite:

- anonymous catalog access üçün `401` və authenticated read-only rol üçün `403`;
- active barcode partial unique constraint;
- paralel decrement zamanı yalnız bir uğurlu nəticə;
- movement, source və audit qeydlərinin atomik yaranması

ssenarilərini real migrated test DB-də işlətmək üçün yazılıb. Suite yalnız adı
`_ci` və ya `_test` ilə bitən isolated database qəbul edir.
