# ITMarket

ITMarket Azərbaycan bazarı üçün hazırlanacaq e-commerce, mağazadaxili POS və backoffice platformasıdır. Sistem storefront, idarəetmə/POS tətbiqi və vahid commerce nüvəsinə malik REST API-dən ibarət olacaq.

> **Cari vəziyyət:** Faza 0 və Faza 1 tamamlanıb. Docker Compose health,
> migration/seed rehearsal, unit/integration/API E2E verification və production
> image smoke lokal olaraq doğrulanıb. Faza 2 auth, RBAC, catalog, inventory ledger, audit,
> backoffice acceptance UI-si və browser E2E verification tamamlanıb. Faza 3 storefront
> catalog, guest cart, delivery/pickup eligibility, timed reservation cleanup,
> cash checkout axını, storefront browser E2E və PostgreSQL acceptance suite ilə
> tamamlanıb. Faza 4 başlanıb:
> mock provider ilə online hosted checkout, signed callback, timeout expiration
> və duplicate callback qoruyucuları əlavə edilib; storefront browser-də mock
> hosted checkout status axını, staff order operations,
> fulfillment transition-ları, mismatch-safe callback handling və recurring
> outbox/expiration/reconciliation jobs mövcuddur;
> real Epoint sandbox adapter-i credential/documentation gate-ni gözləyir.
> Faza 5 başlanıb: cash register,
> shift lifecycle, barcode lookup, idempotent POS sale və permission-protected
> POS return/refund axını əlavə olunub;
> Faza 6 başlanıb: report API-si, Baku timezone bucket-ləri, sales breakdown,
> refund-aware reporting, retail POS return reconciliation, inventory
> report-ları və persisted CSV export worker-i əlavə edilib. Faza 7 engineering hardening-i implementasiya edilib: security/CI
> gate-ləri, qorunan metrics, alert baseline, load profili, restore rehearsal və
> browser accessibility regression mövcuddur. Real rehearsal, merchant,
> fiskal/hüquqi və hosting təsdiqləri bağlanmadığı üçün production statusu
> NO-GO-dur. Lokal setup üçün
> [development sənədinə](docs/development.md), modul davranışı üçün
> [Faza 2](docs/modules/auth-catalog-inventory.md),
> [Faza 3](docs/modules/storefront-cart-checkout.md) və
> [Faza 4](docs/modules/online-payment-fulfillment.md),
> [Faza 5](docs/modules/pos-cash-register.md),
> [Faza 6](docs/modules/reports.md) sənədlərinə baxın.
> [Faza 7](docs/phase-7-production-readiness.md) bağlanış və xarici gate-ləri
> ayrıca göstərir.

## Məhsul səthləri

- **Storefront:** kataloq, axtarış, səbət, checkout, delivery/pickup, sifariş izləmə və müştəri hesabı.
- **Backoffice:** kataloq, stok, sifariş, fulfillment, staff, audit və hesabatların idarəsi.
- **POS:** barkodla satış, kassa növbəsi, ödəniş, çek və qaytarma.
- **API:** bütün biznes qaydaları, authorization, audit, stok və maliyyə bütövlüyü üçün vahid source of truth.

## Hədəf texnologiyalar

- pnpm workspaces və Turborepo monorepo
- Next.js 16 storefront və backoffice
- NestJS 11 modular monolith API
- PostgreSQL və Prisma
- Redis və BullMQ
- S3-compatible object storage
- Strict TypeScript, OpenAPI və generated API client

## Repository strukturu

```text
apps/
  storefront/
  backoffice/
  api/
packages/
  ui/
  contracts/
  config/
  testing/
infra/
  docker/
docs/
  adr/
  api/
```

## Başlanğıc

Docker və Node.js prerequisite-lərindən sonra:

```bash
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Quality gate komandaları:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Ətraflı portlar, health endpoint-ləri və problemlərin həlli:
[docs/development.md](docs/development.md).

## Əsas mühəndislik prinsipləri

1. Pul və stok düzgünlüyü funksional rahatlıqdan üstündür.
2. Online satış və POS eyni kataloq, qiymət və inventory nüvəsindən istifadə edir.
3. Biznes qaydaları UI-da deyil, backend application/domain qatında məcbur edilir.
4. Order, payment və fulfillment ayrı state machine-lərdir.
5. Kritik mutation-lar idempotent, audit edilən və transaction-safe olmalıdır.
6. Secret, kart məlumatı və həssas şəxsi məlumat loglanmır.
7. İlk buraxılış modular monolith-dir; mikroservis yalnız ölçülmüş ehtiyacla əsaslandırıla bilər.

## Sənədlər

Başlanğıc nöqtəsi: [Sənədlər indeksi](docs/README.md)

- [Arxitektura](docs/architecture.md)
- [Domen modeli](docs/domain-model.md)
- [Status keçidləri](docs/state-machines.md)
- [İcra yol xəritəsi](docs/roadmap.md)
- [Test strategiyası](docs/testing-strategy.md)
- [Təhlükəsizlik threat model-i](docs/security-threat-model.md)
- [Risk register](docs/risk-register.md)
- [Açıq qərarlar](docs/open-decisions.md)
- [Faza 0 bağlanışı](docs/phase-0-discovery-summary.md)
- [Faza 2 modul davranışı](docs/modules/auth-catalog-inventory.md)
- [Faza 3 modul davranışı](docs/modules/storefront-cart-checkout.md)
- [Faza 4 modul davranışı](docs/modules/online-payment-fulfillment.md)
- [Faza 5 modul davranışı](docs/modules/pos-cash-register.md)
- [Faza 6 modul davranışı](docs/modules/reports.md)
- [Faza 7 production readiness](docs/phase-7-production-readiness.md)
- [Production launch checklist](docs/production-launch-checklist.md)
- [Töhfə qaydaları](CONTRIBUTING.md)

## Vacib məhdudiyyətlər

- Real merchant credential olmadan production payment axını aktiv edilmir.
- Saxta fiskal çek və ya hüquqi rekvizit yaradılmır.
- Kart nömrəsi və CVV sistemdən keçmir; provider-hosted checkout istifadə olunur.
- Azərbaycan vergi, fiskal, istehlakçı hüquqları və şəxsi məlumat tələbləri production-dan əvvəl hüquq və maliyyə mütəxəssisləri tərəfindən təsdiqlənməlidir.

## Lisenziya

Lisenziya qərarı hələ verilməyib. Repository-ni açıq mənbə kimi yaymazdan və ya üçüncü tərəfə təqdim etməzdən əvvəl ayrıca `LICENSE` əlavə edilməlidir.
