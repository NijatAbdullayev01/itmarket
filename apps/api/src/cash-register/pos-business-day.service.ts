import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CashMovementType,
  CashShiftStatus,
  LocationType,
  PaymentMethod,
  PosSaleChannel,
} from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  bakuBusinessDateUtc,
  bakuDayKey,
  bakuHour,
  parseBakuBusinessDateRange,
  parseBakuDayKeyToUtcDate,
} from '../common/baku-timezone';
import type { StaffPrincipal } from '../auth/auth.module';

export const SOLE_REGISTER_CODE = 'KASSA-01';
export const SOLE_REGISTER_NAME = 'Əsas kassa';

const SHIFT_REGISTER_INCLUDE = {
  register: {
    include: {
      location: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          active: true,
        },
      },
    },
  },
} as const;

export type BusinessDayShift = Prisma.CashShiftGetPayload<{
  include: typeof SHIFT_REGISTER_INCLUDE;
}>;

type Tx = Prisma.TransactionClient;

@Injectable()
export class PosBusinessDayService {
  constructor(private readonly prisma: PrismaService) {}

  businessDateKey(date: Date = new Date()): string {
    return bakuDayKey(date);
  }

  businessDateValue(date: Date = new Date()): Date {
    return bakuBusinessDateUtc(date);
  }

  async ensureSoleRegister(tx: Tx | PrismaService = this.prisma) {
    const existing = await tx.cashRegister.findFirst({
      where: { active: true },
      include: {
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            active: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }],
    });
    if (existing !== null) {
      if (
        !existing.location.active ||
        existing.location.type !== LocationType.STORE
      ) {
        throw new BadRequestException(
          'Sole cash register must be bound to an active STORE location',
        );
      }
      return existing;
    }

    const store = await tx.location.findFirst({
      where: { active: true, type: LocationType.STORE },
      orderBy: { code: 'asc' },
    });
    if (store === null) {
      throw new BadRequestException(
        'Cannot create the sole cash register without an active STORE location',
      );
    }

    return tx.cashRegister.create({
      data: {
        code: SOLE_REGISTER_CODE,
        name: SOLE_REGISTER_NAME,
        locationId: store.id,
        active: true,
      },
      include: {
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            active: true,
          },
        },
      },
    });
  }

  private async autoCloseStaleShifts(
    tx: Tx,
    registerId: string,
    today: Date,
    actorId: string,
  ) {
    const stale = await tx.cashShift.findMany({
      where: {
        registerId,
        status: { in: [CashShiftStatus.OPEN, CashShiftStatus.CLOSING] },
        businessDate: { lt: today },
      },
      include: {
        movements: { select: { type: true, amount: true } },
      },
    });

    for (const shift of stale) {
      const expectedCash = shift.movements.reduce((sum, movement) => {
        if (
          movement.type === CashMovementType.CASH_OUT ||
          movement.type === CashMovementType.REFUND
        ) {
          return sum.sub(movement.amount);
        }
        return sum.add(movement.amount);
      }, new Prisma.Decimal(0));

      await tx.cashShift.update({
        where: { id: shift.id },
        data: {
          status: CashShiftStatus.CLOSED,
          expectedCash,
          countedCash: expectedCash,
          discrepancy: new Prisma.Decimal(0),
          closingStartedAt: shift.closingStartedAt ?? new Date(),
          closedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId,
          action: 'cash-shift.auto-closed',
          entityType: 'cash-shift',
          entityId: shift.id,
          after: {
            reason: 'business-day-rollover',
            businessDate: bakuDayKey(shift.businessDate),
            expectedCash: expectedCash.toFixed(2),
          },
        },
      });
    }
  }

  async ensureTodayShift(
    actor: StaffPrincipal,
    tx: Tx | PrismaService = this.prisma,
  ): Promise<BusinessDayShift> {
    const register = await this.ensureSoleRegister(tx);
    const today = this.businessDateValue();

    await this.autoCloseStaleShifts(tx, register.id, today, actor.id);

    const existing = await tx.cashShift.findUnique({
      where: {
        registerId_businessDate: {
          registerId: register.id,
          businessDate: today,
        },
      },
      include: SHIFT_REGISTER_INCLUDE,
    });

    if (existing !== null) {
      if (
        existing.status === CashShiftStatus.CLOSED ||
        existing.status === CashShiftStatus.CLOSING
      ) {
        await tx.cashShift.update({
          where: { id: existing.id },
          data: {
            status: CashShiftStatus.OPEN,
            closingStartedAt: null,
            countedCash: null,
            discrepancy: null,
            closedAt: null,
          },
        });
        return tx.cashShift.findUniqueOrThrow({
          where: { id: existing.id },
          include: SHIFT_REGISTER_INCLUDE,
        });
      }
      return existing;
    }

    const created = await tx.cashShift.create({
      data: {
        registerId: register.id,
        staffUserId: actor.id,
        businessDate: today,
        openingFloat: new Prisma.Decimal(0),
        expectedCash: new Prisma.Decimal(0),
        status: CashShiftStatus.OPEN,
      },
      include: SHIFT_REGISTER_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorType: 'staff',
        actorId: actor.id,
        action: 'cash-shift.opened',
        entityType: 'cash-shift',
        entityId: created.id,
        after: {
          registerId: register.id,
          businessDate: bakuDayKey(today),
          implicit: true,
          openingFloat: '0.00',
        },
      },
    });

    return created;
  }

  assertRegisterReady(shift: BusinessDayShift) {
    if (shift.status !== CashShiftStatus.OPEN) {
      throw new ConflictException(
        'POS sales are blocked unless the business day is OPEN',
      );
    }
    if (
      !shift.register.active ||
      !shift.register.location.active ||
      shift.register.location.type !== LocationType.STORE
    ) {
      throw new BadRequestException(
        'POS sales require an active register bound to an active STORE location',
      );
    }
  }

  private saleField(
    channel: PosSaleChannel,
    paymentMethod: PaymentMethod,
  ):
    | 'cashSales'
    | 'cardSales'
    | 'transferSales'
    | 'woltSales'
    | 'birmarketSales'
    | 'installmentSales' {
    if (paymentMethod === PaymentMethod.INSTALLMENT) return 'installmentSales';
    if (channel === PosSaleChannel.CASH) return 'cashSales';
    if (channel === PosSaleChannel.TRANSFER) return 'transferSales';
    if (channel === PosSaleChannel.WOLT) return 'woltSales';
    if (channel === PosSaleChannel.BIRMARKET) return 'birmarketSales';
    return 'cardSales';
  }

  private refundField(
    method: PaymentMethod,
  ): 'cashRefunds' | 'cardRefunds' | 'installmentRefunds' {
    if (method === PaymentMethod.CASH) return 'cashRefunds';
    if (method === PaymentMethod.INSTALLMENT) return 'installmentRefunds';
    return 'cardRefunds';
  }

  async applySaleToLedger(
    tx: Tx,
    params: {
      registerId: string;
      businessDate: Date;
      channel: PosSaleChannel;
      paymentMethod: PaymentMethod;
      amount: Prisma.Decimal;
    },
  ) {
    const field = this.saleField(params.channel, params.paymentMethod);
    await tx.posDailyLedger.upsert({
      where: {
        registerId_businessDate: {
          registerId: params.registerId,
          businessDate: params.businessDate,
        },
      },
      create: {
        id: randomUUID(),
        registerId: params.registerId,
        businessDate: params.businessDate,
        [field]: params.amount,
        saleCount: 1,
      },
      update: {
        [field]: { increment: params.amount },
        saleCount: { increment: 1 },
      },
    });
  }

  async applyReturnToLedger(
    tx: Tx,
    params: {
      registerId: string;
      businessDate: Date;
      paymentMethod: PaymentMethod;
      amount: Prisma.Decimal;
    },
  ) {
    const field = this.refundField(params.paymentMethod);
    await tx.posDailyLedger.upsert({
      where: {
        registerId_businessDate: {
          registerId: params.registerId,
          businessDate: params.businessDate,
        },
      },
      create: {
        id: randomUUID(),
        registerId: params.registerId,
        businessDate: params.businessDate,
        [field]: params.amount,
        returnCount: 1,
      },
      update: {
        [field]: { increment: params.amount },
        returnCount: { increment: 1 },
      },
    });
  }

  async getDailySummary(dateKey: string | undefined, actor: StaffPrincipal) {
    const dayKey = dateKey?.trim() || bakuDayKey(new Date());
    const businessDate = parseBakuDayKeyToUtcDate(dayKey);
    const range = parseBakuBusinessDateRange(dayKey, dayKey);
    const register = await this.ensureSoleRegister();
    // Ensure today's ledger row can exist once activity starts; do not force-open for past dates.
    if (dayKey === bakuDayKey(new Date())) {
      await this.ensureTodayShift(actor);
    }

    const ledger = await this.prisma.posDailyLedger.findUnique({
      where: {
        registerId_businessDate: {
          registerId: register.id,
          businessDate,
        },
      },
    });

    const sales = await this.prisma.posSale.findMany({
      where: {
        registerId: register.id,
        createdAt: {
          gte: range.startUtc,
          lt: range.endUtcExclusive,
        },
      },
      select: {
        id: true,
        saleNumber: true,
        grandTotal: true,
        channel: true,
        paymentMethod: true,
        externalTerminalReference: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            variantName: true,
            sku: true,
            barcode: true,
            quantity: true,
            returnItems: {
              select: { quantity: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byHour = new Map<
      number,
      {
        cash: Prisma.Decimal;
        card: Prisma.Decimal;
        transfer: Prisma.Decimal;
        wolt: Prisma.Decimal;
        birmarket: Prisma.Decimal;
        installment: Prisma.Decimal;
        count: number;
      }
    >();
    for (let hour = 0; hour < 24; hour += 1) {
      byHour.set(hour, {
        cash: new Prisma.Decimal(0),
        card: new Prisma.Decimal(0),
        transfer: new Prisma.Decimal(0),
        wolt: new Prisma.Decimal(0),
        birmarket: new Prisma.Decimal(0),
        installment: new Prisma.Decimal(0),
        count: 0,
      });
    }
    for (const sale of sales) {
      const bucket = byHour.get(bakuHour(sale.createdAt));
      if (bucket === undefined) continue;
      bucket.count += 1;
      if (sale.paymentMethod === PaymentMethod.INSTALLMENT) {
        bucket.installment = bucket.installment.add(sale.grandTotal);
      } else if (sale.channel === PosSaleChannel.CASH) {
        bucket.cash = bucket.cash.add(sale.grandTotal);
      } else if (sale.channel === PosSaleChannel.TRANSFER) {
        bucket.transfer = bucket.transfer.add(sale.grandTotal);
      } else if (sale.channel === PosSaleChannel.WOLT) {
        bucket.wolt = bucket.wolt.add(sale.grandTotal);
      } else if (sale.channel === PosSaleChannel.BIRMARKET) {
        bucket.birmarket = bucket.birmarket.add(sale.grandTotal);
      } else {
        bucket.card = bucket.card.add(sale.grandTotal);
      }
    }

    const zero = '0.00';
    const cashRefunds = ledger?.cashRefunds.toFixed(2) ?? zero;
    const cardRefunds = ledger?.cardRefunds.toFixed(2) ?? zero;
    const installmentRefunds = ledger?.installmentRefunds.toFixed(2) ?? zero;
    const refundTotal = new Prisma.Decimal(cashRefunds)
      .add(cardRefunds)
      .add(installmentRefunds)
      .toFixed(2);

    return {
      businessDate: dayKey,
      register: {
        id: register.id,
        code: register.code,
        name: register.name,
        location: {
          id: register.location.id,
          code: register.location.code,
          name: register.location.name,
        },
      },
      cashSales: ledger?.cashSales.toFixed(2) ?? zero,
      cardSales: ledger?.cardSales.toFixed(2) ?? zero,
      transferSales: ledger?.transferSales.toFixed(2) ?? zero,
      woltSales: ledger?.woltSales.toFixed(2) ?? zero,
      birmarketSales: ledger?.birmarketSales.toFixed(2) ?? zero,
      installmentSales: ledger?.installmentSales.toFixed(2) ?? zero,
      cashRefunds,
      cardRefunds,
      installmentRefunds,
      refundTotal,
      saleCount: ledger?.saleCount ?? 0,
      returnCount: ledger?.returnCount ?? 0,
      sales: sales.map((sale) => {
        const returnableQuantity = sale.items.reduce((sum, item) => {
          const returned = item.returnItems.reduce(
            (lineSum, returnItem) => lineSum + returnItem.quantity,
            0,
          );
          return sum + Math.max(0, item.quantity - returned);
        }, 0);
        return {
          id: sale.id,
          saleNumber: sale.saleNumber,
          grandTotal: sale.grandTotal.toFixed(2),
          channel: sale.channel,
          paymentMethod: sale.paymentMethod,
          externalTerminalReference: sale.externalTerminalReference,
          createdAt: sale.createdAt.toISOString(),
          returnableQuantity,
          items: sale.items.map((item) => ({
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            barcode: item.barcode,
          })),
        };
      }),
      byHour: [...byHour.entries()].map(([hour, metrics]) => ({
        hour,
        cashSales: metrics.cash.toFixed(2),
        cardSales: metrics.card.toFixed(2),
        transferSales: metrics.transfer.toFixed(2),
        woltSales: metrics.wolt.toFixed(2),
        birmarketSales: metrics.birmarket.toFixed(2),
        installmentSales: metrics.installment.toFixed(2),
        saleCount: metrics.count,
      })),
    };
  }
}
