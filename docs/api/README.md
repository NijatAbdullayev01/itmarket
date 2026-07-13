# API contract və OpenAPI workflow

ITMarket REST API-si `/api/v1` prefix-i istifadə edir. OpenAPI specification
HTTP contract-ın source of truth-udur; storefront və backoffice API tiplərini
əl ilə təkrar yazmır.

## Dəyişiklik axını

API endpoint-i dəyişəndə eyni change daxilində:

1. NestJS controller DTO, validation, response serialization, authorization
   və status kodları yenilənir.
2. OpenAPI metadata request, response, error və security contract-ını tam
   təsvir edir.
3. API-nin yaratdığı canonical specification
   `docs/api/openapi.json` olaraq yenilənir.
4. `packages/contracts` daxilində generated TypeScript client yenidən
   yaradılır.
5. Generated client typecheck və contract testləri işə salınır.
6. Breaking dəyişiklikdirsə version/deprecation və consumer migration planı
   dəyişikliklə birlikdə review olunur.

Canonical spec əl ilə redaktə edilmir. Dəyişiklik əvvəl NestJS source
metadata-sında edilir, sonra deterministik export ilə JSON yenilənir:

```bash
pnpm openapi:generate
pnpm openapi:check
```

## Lokal export

API OpenAPI endpoint-i aktiv olduqda development xidmətini başladın:

```bash
pnpm --filter @itmarket/api start:dev
```

Ayrı terminalda specification-u temporary fayla endirib yalnız uğurlu HTTP
cavabından sonra əvəz edin:

```bash
curl --fail --silent --show-error \
  http://localhost:3001/api/openapi.json \
  --output docs/api/openapi.json.next
mv docs/api/openapi.json.next docs/api/openapi.json
```

Sonra repository-dəki generated-client script-i və static gate-ləri işlədin:

```bash
pnpm typecheck
pnpm test
pnpm build
```

`packages/contracts` stabil response və enum tiplərini saxlayır. Contract
generation genişləndiriləndə frozen lockfile-dakı generator istifadə
edilməlidir; `npx` ilə review olunmayan latest generator reproducible contract
deyil.

## Review qaydaları

- Request input-u runtime validation olmadan sənədləşdirilmiş sayılmır.
- Hər response statusu və standart `code`, `message`, `details`,
  `correlationId` error forması specification-da görünməlidir.
- Pagination, filter və sort sahələri allowlist kimi təsvir edilməlidir.
- Authentication scheme customer və staff audience sərhədini qarışdırmamalıdır.
- Checkout, payment, refund və POS mutation-larında `Idempotency-Key`
  contract-ı açıq göstərilməlidir.
- Secret, real token, şəxsi məlumat və production host nümunəyə daxil edilmir.
- Generated faylda əl dəyişiklik qəbul edilmir; generator source-u düzəldilir.

## CI drift gate

CI eyni pinned generator ilə specification və client-i təkrar yaratmalı,
sonra working tree-də fərq qalarsa job-u dayandırmalıdır. Bundan əlavə
OpenAPI lint, generated client typecheck və API contract testləri işləməlidir.
Beləliklə controller, canonical spec və consumer client ayrı-ayrılıqda drift
edə bilməz.

API Swagger UI, runtime JSON specification, canonical
`docs/api/openapi.json`, typed contract package və CI drift check təqdim edir.
Faza 2 endpoint-ləri staff/customer auth, staff management, catalog, inventory
və audit bölmələrində sənədləşdirilib.
