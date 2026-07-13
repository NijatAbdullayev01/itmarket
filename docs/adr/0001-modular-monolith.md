# ADR-0001: Modular monolith arxitekturası

- **Status:** Accepted
- **Tarix:** 2026-07-13
- **Qərar sahibləri:** Engineering

## Kontekst

ITMarket catalog, inventory, order, payment, fulfillment, POS və reports kimi sıx əlaqəli domenləri ilk dəfə qurur. Komanda ölçüsü, trafik və ayrıca scaling ehtiyacı hələ ölçülməyib. Buna baxmayaraq pul/stok transaction-ları güclü consistency tələb edir.

## Qərar

Backend NestJS modular monolith kimi qurulacaq:

- bir əsas PostgreSQL database;
- aydın modul ownership və application contract-ları;
- controller/application/domain/infrastructure sərhədləri;
- modulların başqa modul cədvəlinə nəzarətsiz write etməməsi;
- async side effect üçün transactional outbox;
- API və worker ayrıca process/deploy ola bilər.

## Səbəb

- Cross-domain transaction-ları sadə və audit edilən saxlayır.
- Distributed transaction, network failure və deployment complexity-ni erkən gətirmir.
- Lokal development və test daha sürətli olur.
- Modul sərhədləri sonradan ölçülmüş ehtiyacla service extraction-a imkan verir.

## Nəticələr

Müsbət:

- daha az operational yük;
- inventory/order/payment consistency üçün bir DB transaction imkanı;
- vahid tooling və release;
- refactor zamanı end-to-end görünürlük.

Mənfi:

- zəif modul intizamı “big ball of mud” yarada bilər;
- bütün backend ümumi release cadence paylaşır;
- çox ağır report query-ləri əsas workload-a təsir edə bilər.

## Məcburi qoruyucular

- Modul public application service/port-ları müəyyən edilir.
- Cross-module import və DB access lint/architecture testlə qorunur.
- Report/export bounded və lazım olduqda worker/read model-ə ayrılır.
- Hər extraction əvvəl metric, ownership, data consistency və operational plan tələb edir.

## Rədd edilən alternativlər

### Mikroservislər

İlk mərhələdə rədd edildi: service boundary və scaling faktları yoxdur; payment/inventory flow-larında paylanmış consistency və observability xərci yüksəkdir.

### Tam qatsız monolith

Rədd edildi: qısa müddətdə sürətli görünsə də ownership, test və gələcək dəyişiklik riskini artırır.

## Yenidən baxma trigger-ləri

- modulun müstəqil scaling ehtiyacı ölçülür;
- release cadence komandanı davamlı bloklayır;
- data ownership stabilləşir;
- ayrıca security/compliance boundary tələb olunur;
- extraction üçün outbox/API contract və operational sahib mövcuddur.
