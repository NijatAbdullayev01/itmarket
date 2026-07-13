# Faza 0 — Discovery və qərarların bağlanışı

**Status:** Qəbul meyarları tamamlanıb  
**Tarix:** 2026-07-13  
**Növbəti mərhələ:** Faza 1 — Foundation

## Faktiki başlanğıc vəziyyəti

Discovery zamanı workspace-də yalnız məhsul, arxitektura, təhlükəsizlik və əməliyyat sənədləri mövcud idi. Tətbiq kodu, package manager konfiqurasiyası, lockfile, CI, Docker infrastrukturu, Prisma schema/migration və test runner yox idi.

Bu səbəbdən mövcud komandalar işlək sistem deyil, Faza 1 üçün hədəf contract hesab olunur.

## Qəbul edilən sərhədlər

- Storefront, backoffice/POS və API eyni monorepo-da, ayrı deploy və auth sərhədləri ilə qurulur.
- Backend NestJS modular monolith və vahid PostgreSQL transaction sərhədindən istifadə edir.
- Online və POS satışları vahid catalog, pricing və inventory nüvəsini paylaşır.
- Inventory source of truth append-only movement ledger-i, cari availability isə transaction daxilində saxlanan balance-dır.
- Order, payment, fulfillment, reservation və cash shift ayrıca state machine-lərdir.
- Pul `Decimal(18,2)`/`AZN`, DB vaxtı UTC, biznes hesabat günü `Asia/Baku` modelidir.
- Payment provider hosted checkout və provider-agnostic adapter sərhədindən istifadə edir.
- Xarici side effect-lər transactional outbox ilə etibarlı şəkildə ayrılır.
- Customer və staff auth route, cookie, audience/session və authorization policy üzrə ayrılır.

## Source of truth

| Sahə                           | Source of truth                                                  |
| ------------------------------ | ---------------------------------------------------------------- |
| Sistem və modul sərhədləri     | [architecture.md](architecture.md)                               |
| Aggregate və invariant-lar     | [domain-model.md](domain-model.md)                               |
| Status keçidləri               | [state-machines.md](state-machines.md)                           |
| Uzunömürlü texniki qərarlar    | [ADR indeksi](adr/README.md)                                     |
| Açıq biznes/provider qərarları | [open-decisions.md](open-decisions.md)                           |
| Risklər                        | [risk-register.md](risk-register.md)                             |
| Təhlükəsizlik mitigasiya-ları  | [security-threat-model.md](security-threat-model.md)             |
| Production gate-ləri           | [production-launch-checklist.md](production-launch-checklist.md) |

## Kritik failure ssenariləri

- Paralel checkout oversell yaratmamalıdır.
- Təkrar command/payment callback/POS retry ikinci transaction yaratmamalıdır.
- Out-of-order və amount/currency/order uyğunsuz payment event avtomatik `PAID` yaratmamalıdır.
- Payment failure, cancellation və reservation expiry stoku yalnız bir dəfə azad etməlidir.
- Xarici provider timeout-u naməlum nəticəni saxta uğura və ya avtomatik reversal-a çevirməməlidir.
- Worker/outbox dayanması domain commit-i itirməməli, backlog monitorinq və təhlükəsiz replay tələb etməlidir.
- Customer session staff endpoint-də və permission-sız staff təhlükəli mutation-da qəbul edilməməlidir.
- Production config mock payment provider, çatışmayan secret və public object storage ilə start etməməlidir.
- Browser receipt fiskal çek kimi təqdim edilməməlidir.

## Qəbul meyarları

- [x] Domen sərhədləri və modul ownership yazılıb.
- [x] Data source of truth-lar müəyyən edilib.
- [x] Pul, stok, idempotency və snapshot invariant-ları yazılıb.
- [x] Order/payment/fulfillment/reservation/shift keçidləri yazılıb.
- [x] Modular monolith, auth, inventory, payment və money/time ADR-ləri qəbul edilib.
- [x] Payment, fiskal, hüquqi, security və operations riskləri qeyd edilib.
- [x] Açıq qərarların sahibi və faza gate-i vahid register-dədir.
- [x] Saxta credential, hüquqi rekvizit və production payment uğuru yaradılmayıb.

## Qalan risklər

Faza 1-ə keçidi bloklamayan, lakin uyğun fazadan və production-dan əvvəl bağlanmalı məsələlər:

- Epoint merchant contract və sandbox credential-ları;
- Azərbaycan vergi, fiskal, şəxsi məlumat və istehlakçı hüquqları üzrə yazılı təsdiq;
- reservation, COD, refund və rounding biznes qaydaları;
- hosting, secret manager, WAF və observability provider seçimi;
- repository lisenziyası.

Detallar və sahiblər [open-decisions.md](open-decisions.md) və [risk-register.md](risk-register.md) sənədlərindədir.

## Faza 1 verification contract

Foundation yalnız aşağıdakılar real script və CI job kimi işlədikdə tamamlanmış sayılacaq:

```bash
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Əlavə olaraq PostgreSQL, Redis, MinIO və mail catcher health yoxlamaları, API liveness/readiness fərqi, migration check və production config fail-fast davranışı doğrulanmalıdır.
