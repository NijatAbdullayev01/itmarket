# Risk register

**Status:** Aktiv  
**Qiymətləndirmə:** Ehtimal və təsir `Aşağı`, `Orta`, `Yüksək`, `Kritik` kimi qeyd edilir. Hər riskin bir sahibi olmalıdır; adı bilinmirsə rol yazılır.

## R-001 — Payment provider contract qeyri-müəyyəndir

- **Ehtimal:** Yüksək
- **Təsir:** Kritik
- **Sahib:** Product/Finance Lead
- **Risk:** Merchant capability, installment, webhook signature, refund və reconciliation davranışı təsdiqlənmədən adapter səhv contract üzərində qurula bilər.
- **Mitigasiya:** Provider-agnostic port; mock yalnız non-production; real sənəd və sandbox fixture əsasında contract test.
- **Trigger:** Provider sənədi kod fərziyyəsi ilə ziddiyyət təşkil edir.
- **Contingency:** Adapter-i dəyiş, commerce nüvəsini dəyişmə; online payment launch-ını blokla.
- **Bağlanma meyarı:** Müqavilə, sandbox credential, callback və refund ssenariləri təsdiqlənib.

## R-002 — Fiskal və hüquqi uyğunluq təsdiqlənməyib

- **Ehtimal:** Yüksək
- **Təsir:** Kritik
- **Sahib:** Legal/Finance
- **Risk:** POS receipt, vergi, şəxsi məlumat və istehlakçı hüquqları tələbləri yanlış tətbiq edilə bilər.
- **Mitigasiya:** Browser receipt-i fiskal çek kimi təqdim etmə; `FiscalReceiptProvider` sərhədi; hüquqi launch gate.
- **Contingency:** POS production istifadəsini və ya uyğun olmayan flow-u blokla.
- **Bağlanma meyarı:** Yazılı hüquq/maliyyə təsdiqi və lazım olan rəsmi inteqrasiya mövcuddur.

## R-003 — Concurrent checkout oversell yaradır

- **Ehtimal:** Orta
- **Təsir:** Kritik
- **Sahib:** Backend Lead
- **Risk:** Eyni stok vahidi paralel order-lərə rezerv edilir.
- **Mitigasiya:** Row lock/atomic update, DB constraint, idempotent reservation və real PostgreSQL concurrency testi.
- **Trigger:** Negative available, reservation mismatch və ya failed fulfillment.
- **Contingency:** Təsirlənən SKU satışını dayandır, ledger reconciliation et, order-ləri manual həll et.
- **Bağlanma meyarı:** Load/concurrency test oversell yaratmır və monitorinq aktivdir.

## R-004 — Duplicate/out-of-order payment event yanlış paid/refund yaradır

- **Ehtimal:** Yüksək
- **Təsir:** Kritik
- **Sahib:** Payments Owner
- **Mitigasiya:** Provider event unique key, state policy, amount/currency/order validation, reconciliation.
- **Trigger:** Duplicate payment, status regression və ya provider/DB mismatch.
- **Contingency:** Auto fulfillment-i saxla, transaction-ları reconcile et, affected event-ləri DLQ/manual review-a yönəlt.
- **Bağlanma meyarı:** Bütün ordering/duplicate fixture-ları integration testdən keçir.

## R-005 — Customer və staff auth sərhədi qarışır

- **Ehtimal:** Orta
- **Təsir:** Kritik
- **Sahib:** Security Owner
- **Mitigasiya:** Ayrı route, audience, cookie və session namespace; endpoint-specific guards; authz matrix test.
- **Trigger:** Token digər audience endpoint-də qəbul olunur.
- **Contingency:** Session-ları revoke et, auth endpoint-lərini məhdudlaşdır, audit apar.
- **Bağlanma meyarı:** Cross-audience negative testlər və security review keçir.

## R-006 — Report total-ları source transaction-larla uyğun gəlmir

- **Ehtimal:** Orta
- **Təsir:** Yüksək
- **Sahib:** Reports/Finance Owner
- **Mitigasiya:** Payment/refund source of truth, Baku timezone testləri, seed reconciliation dataset.
- **Trigger:** Dashboard və payment settlement fərqi.
- **Contingency:** Yanlış report-u “estimated” kimi işarələ və ya gizlət; source export ilə manual reconciliation.
- **Bağlanma meyarı:** Müəyyən dövr üçün avtomatik reconciliation tam uyğundur.

## R-007 — Backup var, amma restore işləmir

- **Ehtimal:** Orta
- **Təsir:** Kritik
- **Sahib:** DevOps
- **Mitigasiya:** Şifrəli avtomatik backup, checksum, ayrı storage/account və planlı restore rehearsal.
- **Trigger:** Backup failure alert və ya restore testi uğursuzdur.
- **Contingency:** Release-i saxla, son sağlam backup nöqtəsini müəyyən et, provider escalation.
- **Bağlanma meyarı:** Production-a bənzər mühitdə RPO/RTO daxilində restore sübut edilib.

## R-008 — Queue backlog side effect-ləri gecikdirir

- **Ehtimal:** Orta
- **Təsir:** Yüksək
- **Sahib:** Platform Owner
- **Mitigasiya:** Queue depth/oldest age alert, bounded retry, DLQ, idempotent handler və replay runbook.
- **Trigger:** Notification, reconciliation və reservation job SLA-nı keçir.
- **Contingency:** Səbəbi izolə et, worker capacity-ni təhlükəsiz artır, kor-koranə bulk replay etmə.
- **Bağlanma meyarı:** Load testi və failure drill backlog-un idarə olunduğunu göstərir.

## R-009 — Migration production lock/downtime yaradır

- **Ehtimal:** Orta
- **Təsir:** Yüksək
- **Sahib:** Backend Lead + DevOps
- **Mitigasiya:** Expand/contract, representative data rehearsal, lock timeout və ayrı backfill.
- **Trigger:** Migration müddəti büdcəni keçir və ya lock wait artır.
- **Contingency:** Təhlükəsizdirsə migration dayandırılır; backward-compatible app qalır; forward-fix planı tətbiq edilir.
- **Bağlanma meyarı:** Staging ölçümü və deploy planı review olunub.

## R-010 — Secret və ya PII loglara düşür

- **Ehtimal:** Orta
- **Təsir:** Kritik
- **Sahib:** Security/Platform Owner
- **Mitigasiya:** Log allowlist/redaction, DTO serialization, test və access-controlled retention.
- **Trigger:** Scan və ya incident həssas dəyər aşkarlayır.
- **Contingency:** Log access-i bağla, retention copy-lərini təmizlə, credential rotate et və hüquqi təsiri qiymətləndir.
- **Bağlanma meyarı:** Automated redaction test və log review keçir.

## R-011 — POS cihazı/şəbəkəsi qeyri-sabitdir

- **Ehtimal:** Yüksək
- **Təsir:** Yüksək
- **Sahib:** Retail Operations
- **Risk:** Kassir retry edir və duplicate sale yarana bilər; təhlükəli offline qəbul isə stok/pul mismatch yaradar.
- **Mitigasiya:** Idempotency key, aydın pending/result UX, online health indicator; offline sale ilkin scope xaricində.
- **Contingency:** Manual fallback proseduru biznes tərəfindən təsdiqlənməlidir; sistem saxta uğur göstərmir.
- **Bağlanma meyarı:** Network interruption E2E testləri və mağaza proseduru təsdiqlənib.

## R-012 — Scope genişlənməsi foundation keyfiyyətini zəiflədir

- **Ehtimal:** Yüksək
- **Təsir:** Yüksək
- **Sahib:** Project Lead
- **Mitigasiya:** Fazalı roadmap, acceptance gate, ayrı backlog və ADR.
- **Trigger:** Əvvəlki fazanın test/ops borcu bağlanmadan yeni capability başlanır.
- **Contingency:** Yeni scope-u dayandır, release blocker borcu prioritetləşdir.
- **Bağlanma meyarı:** Hər faza qəbul meyarı ilə formal bağlanır.

## R-013 — Dependency/supply-chain zəifliyi

- **Ehtimal:** Orta
- **Təsir:** Yüksək
- **Sahib:** Platform Owner
- **Mitigasiya:** Lockfile, minimal dependency, vulnerability/license scan, pinned container və protected CI secrets.
- **Trigger:** Exploitable critical advisory.
- **Contingency:** Təsir edən feature/endpoint-i məhdudlaşdır, patched versiya ilə sürətli review edilmiş release.
- **Bağlanma meyarı:** Kritik exploitable finding yoxdur.

## R-014 — Object storage yanlış public konfiqurasiya olunur

- **Ehtimal:** Orta
- **Təsir:** Yüksək
- **Sahib:** DevOps/Security
- **Mitigasiya:** Private bucket policy, signed URL, infrastructure test və public access block.
- **Trigger:** Anonymous object listing/read mümkündür.
- **Contingency:** Public access-i dərhal bağla, access log audit et, PII exposure prosesini başlat.
- **Bağlanma meyarı:** Automated policy check və external negative test keçir.

## Review qaydası

- Hər sprint/release planning-də yüksək və kritik risklər nəzərdən keçirilir.
- Trigger baş verəndə risk incident və ya problem record-a çevrilir.
- “Qəbul edildi” qərarı owner, səbəb və tarix olmadan istifadə edilmir.
- Bağlanan risk silinmir; nəticə və bağlanma sübutu əlavə edilir.
- Yeni xarici inteqrasiya və arxitektura dəyişikliyi risk review tələb edir.
