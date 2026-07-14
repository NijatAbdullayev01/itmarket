# ITMarket sənədlər indeksi

Bu qovluq məhsul, arxitektura, keyfiyyət və production əməliyyatları üçün source of truth-dur. Kodla sənəd ziddiyyət təşkil edərsə dəyişiklik qəbul edilməzdən əvvəl ziddiyyət aradan qaldırılmalıdır.

## Oxuma sırası

Yeni komanda üzvü aşağıdakı ardıcıllıqla başlamalıdır:

1. [Layihə README-si](../README.md)
2. [Arxitektura](architecture.md)
3. [Domen modeli](domain-model.md)
4. [Status keçidləri](state-machines.md)
5. [İcra yol xəritəsi](roadmap.md)
6. [Açıq qərarlar](open-decisions.md)
7. [Töhfə qaydaları](../CONTRIBUTING.md)
8. [Test strategiyası](testing-strategy.md)
9. [Təhlükəsizlik threat model-i](security-threat-model.md)

## Sənəd xəritəsi

### Məhsul və arxitektura

- [UI və UX bələdçisi](ui-ux-guidelines.md) — vizual dil, ekran inventarı, axınlar və dizayn qərarları. Sahibi: Product + Frontend.
- [Arxitektura](architecture.md) — sistem sərhədləri, komponentlər və data flow. Sahibi: Tech Lead.
- [Domen modeli](domain-model.md) — aggregate-lər, invariant-lar və source of truth. Sahibi: Backend Lead.
- [Status keçidləri](state-machines.md) — order, payment, fulfillment və shift keçidləri. Sahibi: Product + Backend.
- [Yol xəritəsi](roadmap.md) — fazalar, qəbul meyarları və asılılıqlar. Sahibi: Engineering Lead.

### Mühəndislik keyfiyyəti

- [Lokal development](development.md) — prerequisite, setup, portlar və quality gate-lər. Sahibi: Engineering Lead.
- [API/OpenAPI workflow](api/README.md) — versioned contract və generated client qaydası. Sahibi: Backend Lead.
- [Töhfə qaydaları](../CONTRIBUTING.md) — branch, PR, review və Definition of Done. Sahibi: Engineering Lead.
- [Test strategiyası](testing-strategy.md) — test piramidası və kritik ssenarilər. Sahibi: QA Lead.
- [Təhlükəsizlik](security-threat-model.md) — trust boundary, threat və mitigasiya. Sahibi: Security Owner.
- [Risk register](risk-register.md) — açıq texniki və biznes riskləri. Sahibi: Project Lead.
- [Açıq qərarlar](open-decisions.md) — biznes/provider qərarları, sahiblər və faza gate-ləri. Sahibi: Project Lead.
- [Faza 0 bağlanışı](phase-0-discovery-summary.md) — discovery faktları və qəbul meyarları. Sahibi: Engineering Lead.
- [Auth, catalog və inventory](modules/auth-catalog-inventory.md) — Faza 2 modul contract-ları və verification. Sahibi: Backend Lead.
- [Storefront, cart və checkout](modules/storefront-cart-checkout.md) — Faza 3 public catalog, cart və COD reservation davranışı. Sahibi: Backend + Frontend.
- [Online payment və fulfillment](modules/online-payment-fulfillment.md) — Faza 4 payment core, mock hosted checkout və signed callback davranışı. Sahibi: Backend + Frontend.
- [POS və cash register](modules/pos-cash-register.md) — Faza 5 shift, barcode sale, receipt və discrepancy approval davranışı. Sahibi: Backend + Frontend.
- [Reports](modules/reports.md) — Faza 6 report API-si, Baku timezone aggregation və reconciliation scope-u. Sahibi: Backend Lead.
- [Faza 7 production readiness](phase-7-production-readiness.md) — hardening, observability, load, restore və release gate sübutları. Sahibi: Engineering + Security + Operations.

### Production və əməliyyat

- [Deployment](deployment.md) — build, migration, deploy və rollback/forward-fix. Sahibi: DevOps.
- [Operations runbook](operations-runbook.md) — insident, backup, queue və reconciliation prosedurları. Sahibi: On-call Owner.
- [Launch checklist](production-launch-checklist.md) — production buraxılış gate-ləri. Sahibi: Release Owner.

### Architecture Decision Records

- [ADR indeksi və şablonu](adr/README.md)
- [ADR-0001: Modular monolith](adr/0001-modular-monolith.md)
- [ADR-0002: Ayrı auth sərhədləri](adr/0002-separate-auth-boundaries.md)
- [ADR-0003: Inventory ledger](adr/0003-inventory-ledger.md)
- [ADR-0004: Payment provider adapter-i](adr/0004-payment-provider-adapter.md)
- [ADR-0005: Pul və zaman modeli](adr/0005-money-and-time.md)

## Sənəd statusları

- **Draft:** müzakirə olunur, implementation üçün məcburi deyil.
- **Accepted:** komanda qərarıdır və dəyişikliklər buna uyğun olmalıdır.
- **Superseded:** yeni sənədlə əvəz edilib; tarixi kontekst üçün saxlanır.
- **Deprecated:** yeni işlərdə istifadə edilmir, əvəzləmə hələ tam deyil.

ADR-lər immutable tarixçədir: qəbul edilmiş qərarı səssiz redaktə etmək əvəzinə onu əvəz edən yeni ADR yazılmalıdır.

## Yeniləmə qaydası

Sənəd PR daxilində kodla birlikdə yenilənməlidir, əgər dəyişiklik:

- API contract, domen invariantı və ya status keçidini dəyişirsə;
- yeni dependency, xarici provider və ya trust boundary əlavə edirsə;
- deployment, migration, backup və ya incident proseduruna təsir edirsə;
- riskin ehtimalını, təsirini və ya mitigation-ını dəyişirsə;
- developer setup və quality gate komandalarını dəyişirsə.

Hər sənəddə təsdiqlənməmiş məlumat `TBD` və sahibi ilə qeyd edilməlidir. Real credential, secret, şəxsi məlumat və hüquqi rekvizit sənədlərə yazılmamalıdır.

## Sənədləşmə yol xəritəsi

Boş placeholder sənədlər əvvəlcədən yaradılmır. Aşağıdakılar uyğun implementation ilə eyni PR-da əlavə edilməlidir:

- Foundation qurulanda `development.md` və real lokal setup komandaları;
- OpenAPI workflow yarananda `api/README.md`;
- catalog, inventory, orders, payments, POS, auth/RBAC və fulfillment implementasiya ediləndə `modules/` altında modul contract-ları;
- reports implementasiya ediləndə `modules/reports.md` və verification qeydləri;
- hosting və observability platforması seçiləndə deployment/runbook-dakı `TBD` hissələri;
- şəxsi məlumat axınları dəqiqləşəndə ayrıca PII retention siyasəti;
- load test icra ediləndə ölçülmüş performance baseline;
- release prosesi başlayanda changelog/release-note siyasəti;
- storefront/backoffice UI redesign başlayanda `ui-ux-guidelines.md` və açıq dizayn qərarları (`D-UX-*`).

Bu yanaşma sənədlərin faktiki kod və əməliyyat davranışından əvvəl köhnəlməsinin qarşısını alır.
