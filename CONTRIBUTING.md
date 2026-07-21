# ITMarket-ə töhfə qaydaları

Bu sənəd insan və AI contributor-lar üçün eyni mühəndislik contract-ını müəyyən edir.

## İşə başlamazdan əvvəl

1. Əlaqəli arxitektura, domen və ADR sənədlərini oxu.
2. Mövcud kodu və call site-ları yoxlamadan public contract dəyişmə.
3. Acceptance criteria, failure halları və authorization ehtiyacını müəyyən et.
4. Dəyişiklik pul, stok, auth, payment və ya migration-a toxunursa test strategiyasını əvvəlcədən yaz.
5. Böyük arxitektura qərarıdırsa koddan əvvəl ADR əlavə et.

## Lokal setup

Repository foundation fazası tamamlandıqdan sonra `README.md` source of truth olacaq. Planlaşdırılan axın:

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Script mövcud deyilsə fərqli lokal komanda uydurmaq əvəzinə README və package script-lərini birlikdə tamamla.

## Branch və dəyişiklik ölçüsü

- Branch adları qısa və məqsədli olsun: `feat/inventory-receipt`, `fix/payment-idempotency`.
- Bir dəyişiklik bir əsas məqsədə xidmət etsin.
- Refactor və davranış dəyişikliyini imkan daxilində ayır.
- Generated faylları yalnız source dəyişikliklə birlikdə commit et.
- Formatlama ilə əlaqəsiz böyük diff yaratma.
- İstifadəçinin və ya başqa contributor-un dəyişikliklərini səssiz silmə.

## Commit prinsipi

Commit mesajı nəticəni və səbəbi ifadə etməlidir:

```text
feat(inventory): prevent oversell during reservation
fix(payments): ignore duplicate provider callbacks
docs(architecture): record auth boundary decision
```

Repository tarixi formalaşdıqda mövcud üslub üstün tutulur. Secret, `.env`, credential və real şəxsi məlumat commit edilmir.

## Kod standartları

- Strict TypeScript; əsaslandırılmamış `any`, non-null assertion və type suppression istifadə etmə.
- Domain davranışını controller və UI komponentində yerləşdirmə.
- Public function və API adları biznes dilini əks etdirsin.
- Money üçün `number` arithmetic istifadə etmə.
- DB-də UTC saxla, biznes tarixini explicit `Asia/Baku` timezone-u ilə hesabla.
- Exception-u udma; stabil domain/application error-a map et.
- Log structured olsun və correlation ID daşısın.
- Secret, token, raw webhook body, PAN/CVV və həssas PII loglama.
- Yeni dependency-ni ehtiyac, maintenance, license və security baxımından əsaslandır.

## Database və migration

- Schema dəyişikliyi migration ilə gəlməlidir.
- Production migration backward-compatible expand/contract yanaşmasını üstün tutmalıdır.
- Böyük cədvəldə lock yarada bilən əməliyyat ayrıca deploy planı tələb edir.
- Money, status, unique business key və foreign key-lər DB constraint ilə də qorunmalıdır.
- Migration mövcud data üçün backfill və failure davranışını izah etməlidir.
- Qəbul edilmiş migration dəyişdirilmir; düzəliş üçün yeni migration yaradılır.

## API

- Versioned `/api/v1` contract və OpenAPI yenilənməlidir.
- Input validation və output serialization məcburidir.
- Filter/sort field-ləri allowlist olmalıdır.
- Bütün mutation-lar authorization review-dan keçməlidir.
- Checkout, payment, refund və POS sale kimi retry edilən əməliyyatlar idempotency contract daşımalıdır.
- Breaking dəyişiklik migration/deprecation planı olmadan qəbul edilmir.

## Frontend

- Mobile-first və keyboard accessible olmalıdır.
- Loading, empty, validation, permission və server error halları hazırlanmalıdır.
- Server source of truth-dan gələn eligibility/permission client-də təxmin edilməməlidir.
- Storefront SEO metadata və semantic HTML istifadə etməlidir.
- POS scanner input-u adi keyboard input-dan kontrollu qayda ilə ayrılmalıdır.
- Dəyişiklik mobil, planşet və desktop ölçülərində yoxlanmalıdır.

### Tipografiya və şrift üslubu

Bütün UI səthlərində (storefront, backoffice, POS) eyni tipografiya contract-ı tətbiq olunur:

- Əsas şrift **Montserrat**-dır; layout-da `Montserrat` `--font-sans` dəyişəni `<html>`-də, `className` isə `<body>`-də tətbiq olunur.
- Mətn `var(--font-display)` və ya valideyn konteynerdən miras almalıdır; `@itmarket/ui/typography.css` hər app `globals.css`-də import olunur.
- Rəng, spacing və tipografiya üçün `@itmarket/ui/tokens.css`, `@itmarket/ui/typography.css` və app `globals.css`-dəki mövcud siniflərdən istifadə et (məs. `.pos-meta`, `.bo-main .operation-card h2`, `.section-heading`, panel `__head` blokları).
- Başlıq, meta, label və düymə mətnində layihədə artıq təyin olunmuş `font-size`, `font-weight`, `letter-spacing` və `line-height` skalasını təkrarla; hər səhifə fərqli tipografiya icad etmə.
- Monospace yalnız SKU, barkod, slug/hex kimi sahələrdə `var(--font-mono)` ilə qalsın.

Cursor agent qaydası: [.cursor/rules/project-quality.mdc](.cursor/rules/project-quality.mdc) (Tipografiya bölməsi).

## Test tələbləri

Minimum gözlənti:

- saf biznes qaydası üçün unit test;
- DB constraint, transaction, concurrency və adapter üçün integration test;
- kritik user journey üçün E2E;
- bug fix üçün əvvəl problemi reproduksiya edən regression test.

Mock ilə pul/stok correctness-i “sübut” etmə. Ətraflı qaydalar: [Test strategiyası](docs/testing-strategy.md).

## PR təsviri

PR aşağıdakıları aydın cavablandırmalıdır:

- Nə və niyə dəyişir?
- User/business nəticəsi nədir?
- Hansı risklər var?
- Necə yoxlanıb?
- Migration, config, rollout və rollback təsiri varmı?
- Screenshot yalnız UI dəyişikliyində; təhlükəsiz test data ilə.
- Açıq qalan iş varsa niyə bu PR-ın scope-una daxil deyil?

## Review checklist

Reviewer bunları yoxlayır:

- domain invariant və source of truth qorunur;
- authn/authz yalnız UI-a etibar etmir;
- race condition və retry davranışı düşünülüb;
- transaction xarici HTTP çağırışını içində saxlamır;
- error və observability kifayətdir;
- migration təhlükəsizdir;
- test yanlış səbəbdən keçmir;
- docs və API contract yenilənib;
- secret/PII sızması yoxdur.

## Merge gate

PR yalnız aşağıdakılar keçdikdə merge edilə bilər:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

`test:e2e` kritik flow dəyişəndə PR gate, əsas branch/release üçün isə tam regression gate-dir. Foundation qurulana qədər bu siyahı hədəf contract-dır; CI script-ləri yarımçıq saxlanmamalıdır.

## Təcili production düzəlişi

Hotfix normal review və audit-i keçməmək üçün bəhanə deyil:

1. incident ID və təsir qeyd edilir;
2. ən kiçik təhlükəsiz düzəliş hazırlanır;
3. regression test əlavə edilir;
4. sürətləndirilmiş review aparılır;
5. deploy və monitorinq edilir;
6. sonradan root-cause və preventive action yazılır.
