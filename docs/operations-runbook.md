# Operations runbook

**Status:** Baseline; provider və observability platforması seçildikdə konkret dashboard, alert və komanda linkləri əlavə edilməlidir.

## İnsident prioriteti

- **SEV-1:** geniş payment/stock corruption, data breach, bütün satışın dayanması.
- **SEV-2:** əsas flow ciddi zəifləyib, məhdud workaround var.
- **SEV-3:** məhdud funksiya/istifadəçi təsiri, data integrity riski yoxdur.
- **SEV-4:** aşağı təsirli operational problem.

SEV-1/2 üçün incident commander, communication owner və operations owner ayrılır. Bütün addımlar timestamp və actor ilə qeyd edilir.

## İlk 15 dəqiqə

1. Təsiri təsdiqlə: hansı mühit, kanal, vaxt və entity-lər.
2. Correlation ID, release SHA, error rate və son deploy-u tap.
3. Data integrity riski varsa zərərli mutation-u məhdudlaşdır.
4. Sübutu qoru; log və record silmə.
5. Rollback təhlükəsizliyini schema/event contract-a görə qiymətləndir.
6. Status communication başlat.

## Payment provider nasazlığı

Əlamətlər: create timeout, callback kəsilməsi, pending age artımı, signature failure.

Addımlar:

1. Provider statusu və outbound connectivity-ni yoxla.
2. Unknown nəticəni `FAILED` və ya `PAID` etmə.
3. Yeni online payment yaratmağı feature flag ilə dayandır; uyğun olduqda COD-u göstər.
4. Pending payment-ləri bounded reconciliation job-a daxil et.
5. Callback signature failure artıbsa credential/config dəyişikliyini və hücum ehtimalını yoxla.
6. Provider bərpa olunanda kor-koranə callback replay etmə; event ID və state policy ilə tətbiq et.
7. Order/payment/inventory reconciliation nəticəsini qeyd et.

## Inventory mismatch

Əlamətlər: `available < 0`, balance və ledger fərqi, satış var movement yoxdur.

Addımlar:

1. Təsirlənən variant/location üzrə yeni mutation-u dayandır.
2. Balance, movement, reservation, order və POS source ID-lərini read-only çıxar.
3. İlk uyğunsuz transaction/correlation ID-ni müəyyən et.
4. Balance-a manual SQL update etmə.
5. Təsdiqlənmiş source-a əsasən reversal/adjustment use-case-i ilə düzəlt; reason və audit məcburidir.
6. Eyni pattern üzrə digər SKU/location-ları scan et.
7. Regression test və root-cause action aç.

## Queue backlog və failed job

1. Queue depth, oldest age, failure reason və worker health-i yoxla.
2. Poison job-u ümumi retry-dan ayır.
3. DB/provider bottleneck varsa concurrency-ni artırma.
4. Handler idempotentliyini təsdiqləmədən replay etmə.
5. Kiçik batch replay et və metric/log-u izlə.
6. Permanent failure-i DLQ/manual review-da saxla.
7. Reservation/payment job gecikibsə ayrıca reconciliation apar.

### Report export replay

1. `report_exports` cədvəlində yalnız `FAILED` və ya uzun müddət `PROCESSING`
   qalan job-ları yoxla; `COMPLETED` artifact-i kor-koranə yenidən yaratma.
2. Failure səbəbi validation/query limitidirsə eyni payload-u replay etməzdən
   əvvəl filter-i düzəlt.
3. Replay zamanı yeni export request yarat; mövcud CSV artifact-i və audit trail-i
   saxla.
4. Böyük date range DB saturation yaradırsa export limit-lərini azaldıb batch ilə
   təkrar yoxla.

Baseline alert qaydaları `infra/observability/prometheus-alerts.yml` faylındadır.
`/api/v1/observability/metrics` scrape-i secret manager-də saxlanan
`METRICS_TOKEN` Bearer credential-ı tələb edir. Token query parametrində,
dashboard-da və ya runbook-da yazılmır.

## Database saturation

1. Connection pool, slow query, lock wait və CPU/IO metriklərini yoxla.
2. Son deploy/migration/report export əlaqəsini müəyyən et.
3. Limitsiz report/export və ağır worker concurrency-ni məhdudlaşdır.
4. Uzun transaction-u kor-koranə kill etmə; payment/inventory write olub-olmadığını yoxla.
5. Safe degradation və rate limit tətbiq et.
6. Index/query düzəlişini explain plan və representative data ilə yoxla.

## Şübhəli account/session kompromisi

1. Account/session scope-unu və son audit activity-ni müəyyən et.
2. Təsirlənən session-ları revoke et.
3. Credential reuse ehtimalında password reset və secret rotation et.
4. Staff permission/price/refund/stock mutation-larını audit et.
5. PII exposure və hüquqi notification ehtiyacını Security/Legal ilə qiymətləndir.
6. Logları və evidence-i retention altında qoru.

## Secret sızması

1. Secret-i dərhal revoke/rotate et; yalnız repository commit-i silmək kifayət deyil.
2. İstifadə loglarını və təsir müddətini tap.
3. Derived session/token-ları da revoke et.
4. CI log, image layer, cache və artifact-ları qiymətləndir.
5. Provider/DB access audit apar.
6. Yeni secret-i əvvəlki yolla yenidən sızdırma.

## Backup və restore

### Gündəlik yoxlama

- backup job uğuru;
- backup age və ölçü anomaliyası;
- checksum/encryption statusu;
- retention və ayrı storage mövcudluğu;
- failure alert delivery.

### Restore rehearsal

1. İzolyasiya edilmiş mühit yarat.
2. Seçilmiş recovery point-i restore et.
3. Migration/schema versiyasını təsdiqlə.
4. Row-count kifayət deyil: order/payment/inventory referential və reconciliation check-ləri işlə.
5. Tətbiqi read-only smoke test et.
6. Faktiki RPO/RTO və uyğunsuzluğu qeyd et.
7. Test data/mühiti təhlükəsiz məhv et.

Lokal Compose mühiti üçün təkrarlana bilən rehearsal:

```bash
ENV_FILE=.env ./infra/scripts/backup-restore-rehearsal.sh
```

Script `pg_dump` backup-ı və SHA-256 checksum yaradır, ayrıca restore DB-yə
bərpa edir, source/restore commerce fingerprint-lərini və inventory/payment
invariant-lərini müqayisə edir, sonra restore DB-ni silir. Faktiki RPO/RTO
müşahidəsi release sübutuna ayrıca yazılmalıdır.

## Performans büdcəsi pozuntusu

1. Eyni release, staging dataset və k6 parametrləri ilə nəticəni təkrarla.
2. Error rate yüksəkdirsə latency tuning-dən əvvəl funksional xətanı bağla.
3. Catalog, POS lookup və checkout metriklərini ayrı təhlil et.
4. DB query üçün `EXPLAIN (ANALYZE, BUFFERS)` artefaktı al; PII çıxarma.
5. N+1, limitsiz list və lock contention-u yoxla.
6. Index yalnız ölçülən planı yaxşılaşdırırsa migration ilə əlavə edilir.
7. Dəyişiklikdən sonra eyni k6 profile və data ilə müqayisəli nəticə saxla.

Profile və threshold-lar:
[Faza 7 production readiness](phase-7-production-readiness.md#performans-rehearsal-ı).

Production restore zamanı hansı recovery point-in seçilməsi incident commander və data owner qərarıdır.

## Deployment sonrası rollback qərarı

Rollback et, əgər əvvəlki image yeni schema ilə uyğundur və data contract dəyişməyib. Rollback etmə, əgər yeni irreversible event artıq yazılıb və köhnə kod onu səhv şərh edəcək.

İkinci halda mutation-u dayandır, reconciliation apar və forward-fix et. Ətraflı: [deployment.md](deployment.md).

## Manual data correction

Qadağan:

- order/payment statusunu birbaşa SQL ilə dəyişmək;
- inventory movement silmək;
- audit record redaktə etmək;
- idempotency record təmizləyib request-i yenidən göndərmək.

Tələb olunan:

- incident/change ID;
- təsdiqlənmiş source of truth;
- review olunmuş correction use-case/script;
- dry run və affected row allowlist;
- transaction, audit və post-check;
- backup/recovery planı.

## Reconciliation minimumu

### Payment

- provider transaction ↔ payment attempt;
- paid/refunded amount ↔ order total;
- provider status ↔ local state;
- orphan provider payment və orphan local pending.

### Inventory

- initial + movement sum ↔ on-hand;
- active reservation sum ↔ reserved;
- `available = onHand - reserved`;
- sale/return source document ↔ movement.

### Cash shift

- opening + cash sale + in - refund - out ↔ expected;
- counted - expected ↔ difference;
- hər cash sale/payment shift-ə bağlıdır.

## Post-incident review

SEV-1/2 üçün blame-free review:

- təsir və timeline;
- detection necə oldu və niyə gecikdi;
- texniki və proses root cause;
- hansı invariant/gate işləmədi;
- recovery nə qədər çəkdi;
- konkret preventive action, owner və son tarix;
- test, alert, runbook və architecture dəyişiklikləri.

“Operator səhvi” root cause deyil; sistemin həmin səhvi niyə mümkün və görünməz etdiyi izah olunmalıdır.

## TBD — platform seçildikdən sonra

- on-call əlaqə və escalation;
- dashboard/alert URL-ləri;
- provider support kanalları;
- production backup/restore komandaları və provider-specific PITR addımları;
- feature flag idarəsi;
- log query nümunələri;
- status page və communication template-ləri.
