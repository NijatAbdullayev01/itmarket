# Auth, catalog və inventory modulları

**Status:** Tamamlanıb; real PostgreSQL integration və browser E2E
acceptance keçir.

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
  catalog write, price change, receipt, adjustment, manual discount,
  refund, shift approval, staff management, report və audit read.
- Seed yalnız `NODE_ENV=development` ilə işləyir. Admin yalnız
  `SEED_STAFF_EMAIL` və `SEED_STAFF_PASSWORD` birlikdə açıq verildikdə yaranır;
  repository credential təqdim etmir.
- Staff TOTP MFA (D-011): `POST /staff/auth/mfa/setup|enable|disable`
  authenticated enrollment; MFA aktiv olanda login
  `{ mfaRequired, mfaToken }` qaytarır və `POST /staff/auth/mfa/verify` session
  cookie yazır (TOTP və ya recovery code). Challenge token bir dəfəlikdir
  (Redis jti). Secret AES-256-GCM ilə `APP_SECRET`-dən törədilmiş açarla
  şifrələnir; recovery kodları HMAC-SHA256 hash olaraq saxlanır.
  Non-prod default `STAFF_MFA_REQUIRED=false`; **production-da `true` məcburidir**
  — `mfaEnabled` olmayan staff login edə bilmir.
- **Ops:** `APP_SECRET` rotasiyası bütün staff MFA secret-lərini və recovery
  hash yoxlamasını etibarsız edir — rotasiyadan əvvəl staff-ın MFA-nı
  disable/re-enroll etməsi və ya planned secret migration tələb olunur.

## Catalog

Category tree, brand, product, variant/SKU, attribute və private object
metadata modelləri mövcuddur. Satılan vahid həmişə variantdır. Qiymət
`Decimal(18,2)`/`AZN` saxlanır və API string contract qəbul edir. SKU unikaldır;
eyni barkod yalnız bir `ACTIVE` variantda ola bilər və bu qayda partial unique
DB index ilə məcbur edilir.

List endpoint-ləri limitli pagination, filter və sort allowlist istifadə edir.
Catalog archive əməliyyatı tarixi əlaqələri hard-delete etmir. Media cədvəli
yalnız private storage object key, MIME, ölçü, alt text və sıralama metadata-sı
saxlayır; public bucket URL saxlanmır. `AttributeDefinition` CRUD API
mövcuddur, lakin backoffice product form-ları variant `attributes` JSON
istifadə edir — definition API advanced/internal səviyyədə saxlanılır.
Media upload `MEDIA_STORAGE=local|s3` ilə idarə olunur (prod-da `s3`).
D-013: yalnız staff `catalog.write`; MIME allowlist JPEG/PNG/WebP; client
Content-Type-ə etibar edilmir — magic-byte sniff + structure yoxlanır; SVG/HTML
reject. `MEDIA_MALWARE_SCAN=local` (default) trailing PE/ELF polyglot-u da
rədd edir; `clamav` seçildikdə əlavə olaraq clamd INSTREAM işləyir
(`CLAMAV_HOST`/`CLAMAV_PORT`). Müştəri tərəfindən şəkil upload-u yoxdur.

## Inventory

`InventoryBalance` `(variantId, locationId)` üzrə unikaldır.
Receipt/adjustment:

1. serializable DB transaction açır;
2. balance sətrini `FOR UPDATE` ilə kilidləyir;
3. mənfi on-hand/available nəticəsini rədd edir;
4. balance və immutable movement-i eyni transaction-da yazır;
5. source type, source document, reason və actor tələb edir;
6. təhlükəsiz audit qeydini eyni transaction-da yaradır.

**D-007:** Anbarlar arası stok transferi scope xaricindədir. `POST /inventory/transfers`
rədd edilir; tarixi `TRANSFER_*` ledger sətirləri oxuna bilər, yeni transfer
yaradılmır. Source document unique constraint receipt/adjustment retry-dan
duplicate movement yaranmasının qarşısını alır.
Reconciliation endpoint-i balance on-hand ilə ledger cəmini müqayisə edir.
Migration audit və movement cədvəllərində UPDATE/DELETE-i trigger ilə bloklayır.

## API və backoffice

Swagger JSON `/api/openapi.json`, UI `/api/docs` ünvanındadır. Bütün DTO-lar
runtime validation, whitelist və standart error envelope istifadə edir.
Backoffice staff login, category/brand/product/variant/barcode, media
metadata, location, receipt və adjustment əməliyyatlarını real API-yə
`credentials: include` ilə göndərir. UI permission əsasında əməliyyatları
göstərir, lakin yekun authorization API guard-larındadır. Inventory balance
və movement görünüşü backoffice stok səthində qalır. Ledger reconciliation
(`GET /api/v1/inventory/reconciliation`) və audit jurnalı (`GET /api/v1/audit`)
**API-only**-dir — ayrıca backoffice reconciliation/audit panelləri çıxarılıb.

## Verification

Unit testlər scrypt, explicit permission, aktiv barcode və inventory invariant
qaydalarını yoxlayır. PostgreSQL integration suite:

- anonymous catalog access üçün `401` və authenticated read-only rol üçün `403`;
- active barcode partial unique constraint;
- paralel decrement zamanı yalnız bir uğurlu nəticə;
- movement, source və audit qeydlərinin atomik yaranması

ssenarilərini real migrated test DB-də işlətmək üçün yazılıb. Suite yalnız adı
`_ci` və ya `_test` ilə bitən isolated database qəbul edir və lokal alternate
port compose stack üzərində uğurla icra olunub.

Browser E2E acceptance isə backoffice səthində aşağıdakı axınları doğrulayır:

- admin login-dən sonra kateqoriya və məhsul yaradır;
- məhsula variant/SKU və unikal barkod bağlayır;
- stok məntəqəsi yaradıb receipt ilə on-hand balansı artırır;
- UI-da balance/movement izini görür; reconciliation və audit API acceptance-də
  (UI paneli yoxdur) doğrulanır;
- write permission olmayan rol həmin mutation əməliyyatlarını UI-da görmür.
