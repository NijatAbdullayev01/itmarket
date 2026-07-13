# Deployment strategiyası

**Status:** Hədəf contract; hosting provider seçildikdə konkret komandalar və resurs adları əlavə edilməlidir.

## Prinsiplər

- Storefront, backoffice, API və worker ayrıca deploy edilə bilən immutable container image-lardır.
- Eyni release üçün image bir dəfə build edilir və mühitlər arasında promote olunur.
- Config runtime-da, secret secret manager-dən verilir.
- Database migration application startup-da avtomatik və nəzarətsiz işləmir.
- Deploy backward-compatible schema və expand/contract yanaşması istifadə edir.
- Production dəyişiklikləri audit edilən CI/CD identity ilə aparılır.

## Mühitlər

- **Local:** Docker Compose, saxta/non-production provider-lər.
- **CI:** ephemeral database və deterministic test xidmətləri.
- **Staging:** production-a bənzər şəbəkə/config, yalnız sandbox credential və sintetik data.
- **Production:** real provider, private data services, sərt access və alerting.

Environment adları və provider mode startup schema-sında allowlist olmalıdır. `production + mock payment` kombinasiyası fail-fast etməlidir.

## Artifact-lar

Hər release:

- storefront image;
- backoffice image;
- API image;
- worker image və ya API image-in ayrıca entrypoint-i;
- migration artifact;
- OpenAPI spec;
- SBOM və vulnerability scan nəticəsi;
- git SHA, build timestamp və image digest metadata-sı.

Base image minimal, pin edilmiş və non-root runtime istifadə etməlidir.

## Release axını

1. Frozen lockfile ilə install.
2. Lint, typecheck, unit/integration/E2E və build.
3. Migration validation və staging rehearsal.
4. Container build, scan və registry push.
5. Staging deploy və smoke test.
6. Release owner approval.
7. Production preflight: backup health, alert status, provider və DB health.
8. Backward-compatible migration tətbiqi.
9. API/worker, sonra frontend rollout.
10. Readiness və smoke/reconciliation yoxlaması.
11. Monitorinq pəncərəsi və release annotation.

## Migration siyasəti

### Expand

- nullable/yeni sütun və ya yeni cədvəl əlavə et;
- yeni index-i production DB imkanına uyğun non-blocking yarat;
- tətbiqi həm köhnə, həm yeni schema ilə işlək saxla.

### Migrate

- backfill request path-dan kənarda bounded batch-lərlə;
- progress, error və restart checkpoint saxla;
- data invariantını reconciliation query ilə yoxla.

### Contract

- köhnə read/write dayandıqdan və ən az bir təhlükəsiz release keçdikdən sonra köhnə schema-nı sil;
- destructive addım ayrıca approval tələb edir.

Migration əvvəl tətbiq edilmiş faylı redaktə etmir. Production rollback schema down migration-a kor-koranə etibar etmir; çox vaxt app rollback + forward-fix daha təhlükəsizdir.

## Rollout

- Readiness uğursuz instance trafik almır.
- Rolling və ya blue/green strategiya hosting imkanına görə seçilir.
- Worker concurrency yeni job contract-a uyğun mərhələli artırılır.
- Queue producer və consumer dəyişiklikləri backward-compatible olmalıdır.
- Frontend cache/CDN purge yalnız lazım olan scope-da aparılır.

## Rollback və forward-fix

Rollback mümkündür, əgər:

- schema expand dəyişiklikdir;
- əvvəlki app image yeni schema ilə işləyir;
- yeni irreversible biznes event yaradılmayıb.

Rollback təhlükəlidir, əgər yeni payment/order/inventory event formatı artıq yazılıb. Belə halda:

1. zərərli mutation endpoint/worker dayandırılır;
2. sağlam read path saxlanır;
3. data reconciliation aparılır;
4. audit edilən forward-fix release edilir.

Heç vaxt production data-nı `reset`, manual status update və ya ledger silmə ilə “düzəltmə”.

## Config və secret

- `.env.example` yalnız ad, description və təhlükəsiz placeholder daşıyır.
- Secret repository, image layer, log və client bundle-a daxil edilmir.
- Frontend public variable-ları explicit prefix/allowlist istifadə edir.
- Secret rotation proseduru payment, session, DB və object storage üçün sənədləşdirilir.
- Config schema startup-da required field, URL, enum və təhlükəli kombinasiyaları yoxlayır.
- Production `METRICS_TOKEN` secret manager-dən verilir; Prometheus onu Bearer
  token kimi göndərir və rotation scrape config ilə koordinasiya edilir.

## Health checks

- **Liveness:** process event loop cavab verir; xarici dependency outage process restart loop yaratmır.
- **Readiness:** DB connection və xidmətin trafik qəbul etmək qabiliyyəti.
- Redis/S3/provider statusu endpoint-də secret/detail açmadan uyğun degraded signal verə bilər.
- Health endpoint authentication və network exposure siyasəti ilə qorunur.

## Smoke test

Deploy-dan sonra:

- storefront və backoffice əsas route açılır;
- API version/health cavab verir;
- read-only catalog sorğusu işləyir;
- synthetic staff auth yalnız təhlükəsiz staging-də;
- queue synthetic job işləyir;
- production-da real satış/payment yaradılmadan provider connectivity uyğun təhlükəsiz endpoint ilə yoxlanır;
- log/metric/trace yeni release SHA-nı göstərir.
- qorunan metrics endpoint düzgün tokenlə scrape olunur, yanlış tokenlə `404`
  qaytarır.

## Release dayandırma meyarları

- migration rehearsal yoxdur və ya lock büdcəsini keçir;
- kritik/yüksək exploitable security finding;
- backup/restore statusu qeyri-müəyyəndir;
- payment provider callback verification testdən keçmir;
- error rate/latency normal baseline-dan kəskin yüksəkdir;
- inventory/payment reconciliation mismatch var;
- release owner və rollback/forward-fix planı yoxdur.

## Provider seçiləndən sonra tamamlanacaq bölmələr

- domain, TLS və edge/WAF konfiqurasiyası;
- container registry və deployment komandaları;
- resource request/limit və autoscaling;
- managed PostgreSQL backup/PITR parametrləri;
- Redis persistence/failover tələbi;
- object storage bucket policy;
- log/metric/error tracking platforması;
- RPO, RTO və maintenance window.
