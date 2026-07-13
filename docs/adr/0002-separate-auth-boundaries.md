# ADR-0002: Customer və staff auth sərhədlərinin ayrılması

- **Status:** Accepted
- **Tarix:** 2026-07-13
- **Qərar sahibləri:** Engineering + Security

## Kontekst

Storefront müştəriləri öz hesab və sifarişlərini idarə edir. Backoffice/POS istifadəçiləri qiymət, stok, refund, staff və maliyyə məlumatına çıxış əldə edə bilər. Eyni session contract-ı privilege confusion və daha geniş kompromis radiusu yaradır.

## Qərar

Customer və staff auth aşağıdakılar üzrə ayrılır:

- route/endpoint namespace;
- cookie adı;
- token issuer/audience və ya opaque session type;
- Redis/session storage namespace;
- guard və authorization policy;
- TTL, refresh və revocation siyasəti;
- login rate-limit və audit;
- frontend origin və deploy sərhədi.

Staff authorization role adından əlavə explicit permission-larla backend-də yoxlanır. UI yalnız usability üçün gizlətmə edir.

## Səbəb

- Customer credential compromise staff privilege-ə keçmir.
- Staff üçün daha sərt TTL, audit, lockout və MFA tətbiq etmək olur.
- Cookie collision və cross-audience token acceptance bloklanır.
- Təhlükəsizlik review və incident revocation scope-u aydınlaşır.

## Nəticələr

Müsbət:

- least privilege;
- daha kiçik blast radius;
- staff əməliyyatları üçün güclü audit.

Mənfi:

- iki login/session flow-u saxlanılır;
- shared auth kodunda premature abstraction riski;
- support və test matrisi genişlənir.

## Qoruyucular

- Cross-audience negative integration test.
- Customer və staff logout/revocation ayrı test olunur.
- Staff deactivation bütün staff session-larını revoke edir.
- Kritik permission-lar ayrıca test matrisi daşıyır.
- Admin MFA production qərarı launch checklist-də bağlanır.

## Rədd edilən alternativ

Bir JWT/session modeli və yalnız `role` claim-i rədd edildi. Yanlış audience validation və route guard səhvi yüksək privilege escalation təsiri daşıyır.
