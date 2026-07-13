# Architecture Decision Records

ADR-lər ITMarket-in uzunömürlü texniki qərarlarını, səbəblərini və trade-off-larını saxlayır.

## İndeks

| ADR                                      | Status   | Qərar                                                         |
| ---------------------------------------- | -------- | ------------------------------------------------------------- |
| [0001](0001-modular-monolith.md)         | Accepted | NestJS modular monolith və vahid PostgreSQL                   |
| [0002](0002-separate-auth-boundaries.md) | Accepted | Customer və staff auth sərhədlərinin ayrılması                |
| [0003](0003-inventory-ledger.md)         | Accepted | Append-only inventory ledger və transaction daxilində balance |
| [0004](0004-payment-provider-adapter.md) | Accepted | Provider adapter-i, hosted checkout və non-production mock    |
| [0005](0005-money-and-time.md)           | Accepted | Decimal/AZN money və UTC/Asia-Baku zaman modeli               |

## Statuslar

- `Proposed`: review gözləyir və implementation üçün məcburi deyil.
- `Accepted`: cari implementation qərarıdır.
- `Superseded`: başqa ADR ilə əvəz edilib.
- `Deprecated`: yeni işlərdə istifadə edilmir, lakin hələ tam əvəzlənməyib.

Accepted ADR səssiz şəkildə başqa qərara çevrilmir. Dəyişiklik yeni ADR ilə əvvəlkini `Superseded` edir.

## Yeni ADR şablonu

```markdown
# ADR-NNNN: Qısa qərar adı

- **Status:** Proposed
- **Tarix:** YYYY-MM-DD
- **Qərar sahibləri:** Rol(lar)
- **Əvəz edir:** ADR-NNNN və ya yoxdur

## Kontekst

## Qərar

## Səbəb

## Nəticələr

### Müsbət

### Mənfi

## Qoruyucular və verification

## Rədd edilən alternativlər

## Yenidən baxma trigger-ləri
```

ADR-yə secret, credential, real şəxsi məlumat və hüquqi rekvizit daxil edilmir.
