# Lokal development

Bu sənəd Faza 1 lokal infrastructure, tətbiq komandaları və CI ilə eyni
quality gate-ləri təsvir edir.

## Prerequisite-lər

- Docker Engine və `docker compose` v2 plugin-i
- Node.js `22.17.0` və ya repository `engines` contract-ına uyğun daha yeni
  Node.js 22 buraxılışı
- Node ilə gələn Corepack
- ən azı 8 GB boş RAM və container volume-ları üçün disk sahəsi

Docker bu repository üçün normal prerequisite-dir. Hostda Docker yoxdursa
PostgreSQL, Redis, MinIO və Mailpit lokal olaraq başlamayacaq; əvvəl Docker
Engine/Compose quraşdırılmalıdır. CI həmin xidmətlər üçün ephemeral
container-lardan istifadə edir.

Repository root-u bütün pnpm və Docker build komandaları üçün working
directory-dir.

## İlk setup

```bash
cp .env.example .env
corepack enable
pnpm install --frozen-lockfile
docker compose up -d
docker compose ps
pnpm db:migrate
NODE_ENV=development pnpm db:seed
pnpm dev
```

`pnpm install --frozen-lockfile` yalnız commit edilmiş `pnpm-lock.yaml` ilə
işləyir və CI da eyni qaydanı tətbiq edir. Lockfile dependency dəyişiklikləri
ilə birlikdə yenilənməli və commit edilməlidir; CI-da lockfile yaratmaq və ya
dependency versiyalarını səssiz dəyişmək olmaz.

`.env.example`-dakı credential-lar yalnız loopback-a bind olunan lokal
development üçündür. `.env` commit edilmir və bu dəyərlər shared, staging və
production mühitində istifadə olunmur.

## Lokal xidmətlər

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres redis minio mailpit
```

Default endpoint-lər:

- Storefront: `http://localhost:3000`
- API: `http://localhost:3001/api/v1`
- API docs: `http://localhost:3001/api/docs`
- Backoffice: `http://localhost:3002`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO S3 API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`
- Mailpit SMTP: `localhost:1025`
- Mailpit UI: `http://localhost:8025`

Compose healthcheck-ləri xidmət readiness-ini göstərir. `minio-bucket-init`
MinIO sağlam olduqdan sonra `.env`-dəki bucket-i idempotent şəkildə yaradır
və anonymous access-i bağlayır. Uğurlu init container-in `Exited (0)` olması
normaldır.

Yalnız application process-lərini dayandırmaq üçün:

```bash
docker compose stop
```

Container-ları silib persistent named volume-ları saxlamaq üçün:

```bash
docker compose down
```

Lokal datanı qəsdən tam silmək üçün:

```bash
docker compose down --volumes
```

Sonuncu komanda PostgreSQL, Redis, MinIO və Mailpit lokal datasını geri
qaytarılmadan silir.

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:migrate:check
```

Migration application startup-ında avtomatik işləmir. Schema dəyişikliyi
migration ilə gəlməli, `db:migrate:check` isə CI-da schema/migration drift-i
bloklamalıdır.

Seed production və test mühitində fail-fast edir. Optional development admin
yalnız `.env`-də `SEED_STAFF_EMAIL` və minimum 12 simvolluq
`SEED_STAFF_PASSWORD` birlikdə verildikdə idempotent yaradılır. Repository
hazır credential təqdim etmir.

## Quality gate-lər

CI-nın lokal ekvivalenti:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm db:migrate:check
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Integration testlər real PostgreSQL və ehtiyac olduqda Redis istifadə edir.
Onları işə salmazdan əvvəl `docker compose up -d postgres redis` işlədilməli
və hər iki service `healthy` olmalıdır. `pnpm test:integration` və
`pnpm test:e2e` cari `DATABASE_URL`-dən izolə olunmuş test database adı
yaradır: ad artıq `_test` və ya `_ci` ilə bitmirsə script avtomatik
`${POSTGRES_DB}_test` istifadə edir, database-i yenidən yaradır və migration-ları
applying etdikdən sonra suite-i işlədir. Bu qoruyucu development/production
database-də təsadüfi test icrasının qarşısını alır.

## Production image-ları

Build context həmişə monorepo root-udur:

```bash
docker build -f infra/docker/api.Dockerfile -t itmarket/api:local .
docker build -f infra/docker/storefront.Dockerfile -t itmarket/storefront:local .
docker build -f infra/docker/backoffice.Dockerfile -t itmarket/backoffice:local .
```

Image-lar pinned Node base, multi-stage build və UID `10001` non-root runtime
istifadə edir. Config və secret build argument və image layer-ə deyil, yalnız
runtime environment-ə verilir. Dockerfile-lar legacy `docker build` ilə işləyir;
BuildKit/buildx cache mount-u tələb etmir.

API image hazırda HTTP process üçün `node dist/main.js` başladır. İlk BullMQ
job-u əlavə ediləndə ayrıca worker entrypoint eyni source və image-dan
yaradılacaq, ayrıca process kimi deploy ediləcək; iki process bir container-də
başladılmayacaq. Mövcud olmayan `worker.js` command-ı işlək kimi
sənədləşdirilmir.

## Cari application contract

Storefront, API və backoffice müvafiq olaraq `3000`, `3001` və `3002`
portlarında işləyir. API package-i `typecheck`, `test:integration`,
`db:migrate:check`, Prisma schema/migration/seed və liveness/readiness
contract-larını təmin edir. Worker deploy-u ilk real queue use-case-i
implementasiya edilənədək aktiv deyil.
