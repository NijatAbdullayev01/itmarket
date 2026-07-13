# ADR-0003: Inventory ledger və materialized balance

- **Status:** Accepted
- **Tarix:** 2026-07-13
- **Qərar sahibləri:** Engineering + Operations

## Kontekst

Online checkout və POS eyni stoku dəyişir. Yalnız `quantity` sütununu update etmək dəyişmənin səbəbini, source sənədini və reconciliation imkanını itirir. Yalnız ledger-dən hər dəfə sum hesablamaq isə hot availability query-lərində baha ola bilər.

## Qərar

İki model birlikdə istifadə edilir:

- `InventoryMovement`: append-only dəyişiklik ledger-i;
- `InventoryBalance`: variant/location üzrə `onHand`, `reserved`, `available` cari görünüşü.

Movement və balance eyni DB transaction-da dəyişir. Hər movement type, quantity, variant, location, actor/system, reason və source document reference daşıyır.

## Invariant-lar

- `available = onHand - reserved`;
- default `onHand`, `reserved`, `available` mənfi deyil;
- aktiv reservation cəmi `reserved` ilə uzlaşır;
- sale/return/receipt/adjustment source sənədə bağlıdır;
- correction əvvəlki record-u silmir, reversal/adjustment yaradır;
- concurrent reservation row lock və ya atomic conditional update istifadə edir.

## Səbəb

- Cari availability sürətli oxunur.
- Hər dəyişiklik audit və reconciliation edilə bilir.
- Oversell DB transaction səviyyəsində bloklanır.
- Online və POS vahid inventory source of truth istifadə edir.

## Nəticələr

Müsbət:

- tarixi iz;
- reconciliation və incident araşdırması;
- səbəb/source olmadan quantity update qadağası.

Mənfi:

- balance və ledger atomik saxlanmasa drift mümkündür;
- transfer və reservation concurrency-si diqqətli dizayn tələb edir;
- data həcmi davamlı artır.

## Qoruyucular

- Balance mutation yalnız inventory application service-də.
- DB constraint və unique key-lər.
- Ledger-balance scheduled reconciliation.
- Paralel checkout və expiration/payment race integration testləri.
- Retention ledger-i silmir; arxiv/partition yalnız audit və query tələbi ilə.

## Rədd edilən alternativlər

- **Yalnız mutable quantity:** audit və reconciliation zəifdir.
- **Yalnız event/ledger hesablaması:** hot path üçün ölçülməmiş complexity və performans riski.
- **Hər kanal üçün ayrı stok:** online/POS oversell və manual sync riski.
