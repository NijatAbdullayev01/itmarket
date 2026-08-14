import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { randomUUID } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  type StaffPrincipal,
  StaffAuthGuard,
} from '../auth/auth.module';
import {
  CashMovementType,
  InventoryMovementType,
  PaymentMethod,
  PosSaleChannel,
} from '../generated/prisma/enums';
import { CatalogStatus, Prisma } from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { withCanonicalLocationName } from '../inventory/format-location-display-name';
import { applyOnHandDelta } from '../inventory/inventory.domain';
import type { Environment } from '../config/environment';
import {
  createFiscalReceiptProvider,
  FISCAL_RECEIPT_PROVIDER,
  type FiscalReceiptProvider,
} from './fiscal-receipt.provider';
import { formatProductDisplayTitle } from '../catalog/format-product-display-title';
import {
  CashRegisterModule,
} from '../cash-register/cash-register.module';
import { PosBusinessDayService } from '../cash-register/pos-business-day.service';
import {
  bakuCalendarDayDiff,
  bakuDayKey,
} from '../common/baku-timezone';

/** D-006: inclusive Asia/Baku calendar days from sale day (day 0 … day 13). */
const POS_RETURN_WINDOW_CALENDAR_DAYS = 14;

type LockedBalance = {
  id: string;
  on_hand: number;
  reserved: number;
};

class BarcodeLookupQuery {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  barcode!: string;
}

class PosProductQuery {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeZero?: boolean;
}

class DailySummaryQuery {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

class SaleItemDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

class CreatePosSaleDto {
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @IsEnum(PosSaleChannel)
  channel?: PosSaleChannel;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalTerminalReference?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(36)
  installmentMonths?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}

class ReturnItemDto {
  @IsUUID()
  saleItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

class CreatePosReturnDto {
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsUUID()
  saleId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  restockToInventory?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalTerminalReference?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}

const POS_SALE_WITH_RELATIONS = {
  register: {
    include: {
      location: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  shift: {
    select: { id: true, status: true, openedAt: true, businessDate: true },
  },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      returnItems: {
        select: { quantity: true },
      },
    },
  },
  payment: true,
} satisfies Prisma.PosSaleInclude;

type PosSaleDetails = Prisma.PosSaleGetPayload<{
  include: typeof POS_SALE_WITH_RELATIONS;
}>;

const POS_RETURN_WITH_RELATIONS = {
  sale: {
    select: {
      id: true,
      saleNumber: true,
      receiptNumber: true,
    },
  },
  shift: {
    select: { id: true, status: true, openedAt: true, businessDate: true },
  },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      saleItem: {
        select: {
          id: true,
          sku: true,
          barcode: true,
          productName: true,
          variantName: true,
        },
      },
    },
  },
} satisfies Prisma.PosReturnInclude;

type PosReturnDetails = Prisma.PosReturnGetPayload<{
  include: typeof POS_RETURN_WITH_RELATIONS;
}>;

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessDay: PosBusinessDayService,
    @Inject(FISCAL_RECEIPT_PROVIDER)
    private readonly fiscalReceipt: FiscalReceiptProvider,
  ) {}

  private resolveSaleChannel(dto: CreatePosSaleDto): PosSaleChannel {
    if (dto.channel !== undefined) {
      return dto.channel;
    }
    if (dto.paymentMethod === PaymentMethod.CASH) {
      return PosSaleChannel.CASH;
    }
    return PosSaleChannel.CARD;
  }

  private validateSaleChannel(
    channel: PosSaleChannel,
    paymentMethod: PaymentMethod,
  ) {
    if (channel === PosSaleChannel.CASH) {
      if (paymentMethod !== PaymentMethod.CASH) {
        throw new BadRequestException(
          'CASH channel requires CASH paymentMethod',
        );
      }
      return;
    }

    if (
      channel === PosSaleChannel.TRANSFER ||
      channel === PosSaleChannel.WOLT ||
      channel === PosSaleChannel.BIRMARKET
    ) {
      if (paymentMethod !== PaymentMethod.CARD) {
        throw new BadRequestException(
          `${channel} channel requires CARD paymentMethod`,
        );
      }
      return;
    }

    // CARD channel: terminal card or installment.
    if (
      paymentMethod !== PaymentMethod.CARD &&
      paymentMethod !== PaymentMethod.INSTALLMENT
    ) {
      throw new BadRequestException(
        'CARD channel requires CARD or INSTALLMENT paymentMethod',
      );
    }
  }

  private validateSalePayment(dto: CreatePosSaleDto) {
    const channel = this.resolveSaleChannel(dto);
    this.validateSaleChannel(channel, dto.paymentMethod);

    const terminalReference = dto.externalTerminalReference?.trim();
    const bankName = dto.bankName?.trim();

    if (terminalReference === undefined || terminalReference.length < 2) {
      throw new BadRequestException(
        'Sales require a cash register receipt number (externalTerminalReference)',
      );
    }

    if (dto.paymentMethod === PaymentMethod.CASH) {
      if (bankName !== undefined || dto.installmentMonths !== undefined) {
        throw new BadRequestException(
          'Installment metadata is only valid for installment sales',
        );
      }
      return channel;
    }

    if (
      dto.paymentMethod !== PaymentMethod.CARD &&
      dto.paymentMethod !== PaymentMethod.INSTALLMENT
    ) {
      throw new BadRequestException(
        'POS supports CASH, CARD or INSTALLMENT payments',
      );
    }

    if (dto.paymentMethod === PaymentMethod.CARD) {
      if (bankName !== undefined || dto.installmentMonths !== undefined) {
        throw new BadRequestException(
          'Installment metadata is only valid for installment sales',
        );
      }
      return channel;
    }

    if (bankName === undefined || bankName.length < 2) {
      throw new BadRequestException(
        'Installment sales require a bank name',
      );
    }
    if (dto.installmentMonths === undefined) {
      throw new BadRequestException(
        'Installment sales require installmentMonths',
      );
    }
    return channel;
  }

  private requiresTerminalReference(method: PaymentMethod) {
    return (
      method === PaymentMethod.CARD || method === PaymentMethod.INSTALLMENT
    );
  }

  private mapSale(sale: PosSaleDetails) {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      receiptNumber: sale.receiptNumber,
      createdAt: sale.createdAt.toISOString(),
      shift: {
        id: sale.shift.id,
        status: sale.shift.status,
        businessDate: bakuDayKey(sale.shift.businessDate),
        openedAt: sale.shift.openedAt.toISOString(),
      },
      register: {
        id: sale.register.id,
        code: sale.register.code,
        name: sale.register.name,
        location: sale.register.location,
      },
      paymentMethod: sale.paymentMethod,
      channel: sale.channel,
      externalTerminalReference: sale.externalTerminalReference,
      subtotal: sale.subtotal.toFixed(2),
      discountTotal: sale.discountTotal.toFixed(2),
      taxTotal: sale.taxTotal.toFixed(2),
      grandTotal: sale.grandTotal.toFixed(2),
      currency: sale.currency,
      payment:
        sale.payment === null
          ? null
          : {
              id: sale.payment.id,
              method: sale.payment.method,
              amount: sale.payment.amount.toFixed(2),
              currency: sale.payment.currency,
              terminalReference: sale.payment.terminalReference,
              bankName: sale.payment.bankName,
              installmentMonths: sale.payment.installmentMonths,
              createdAt: sale.payment.createdAt.toISOString(),
            },
      items: sale.items.map((item) => {
        const returnedQuantity = item.returnItems.reduce(
          (sum, returnItem) => sum + returnItem.quantity,
          0,
        );
        const returnableQuantity = Math.max(0, item.quantity - returnedQuantity);
        return {
          id: item.id,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          barcode: item.barcode,
          quantity: item.quantity,
          returnedQuantity,
          returnableQuantity,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: item.lineTotal.toFixed(2),
          currency: item.currency,
        };
      }),
    };
  }

  private mapReturn(posReturn: PosReturnDetails) {
    return {
      id: posReturn.id,
      returnNumber: posReturn.returnNumber,
      sale: posReturn.sale,
      createdAt: posReturn.createdAt.toISOString(),
      shift: {
        id: posReturn.shift.id,
        status: posReturn.shift.status,
        businessDate: bakuDayKey(posReturn.shift.businessDate),
        openedAt: posReturn.shift.openedAt.toISOString(),
      },
      paymentMethod: posReturn.paymentMethod,
      refundAmount: posReturn.refundAmount.toFixed(2),
      currency: posReturn.currency,
      externalTerminalReference: posReturn.externalTerminalReference,
      restockedToInventory: posReturn.restockedToInventory,
      reason: posReturn.reason,
      items: posReturn.items.map((item) => ({
        id: item.id,
        saleItemId: item.saleItemId,
        variantId: item.variantId,
        sku: item.saleItem.sku,
        barcode: item.saleItem.barcode,
        productName: item.saleItem.productName,
        variantName: item.saleItem.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
        currency: item.currency,
      })),
    };
  }

  private loadSale(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<PosSaleDetails> {
    return tx.posSale.findUniqueOrThrow({
      where: { id },
      include: POS_SALE_WITH_RELATIONS,
    });
  }

  private loadReturn(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<PosReturnDetails> {
    return tx.posReturn.findUniqueOrThrow({
      where: { id },
      include: POS_RETURN_WITH_RELATIONS,
    });
  }

  private buildHumanNumber(prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `${prefix}-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private normalizeItems(items: SaleItemDto[]): SaleItemDto[] {
    const combined = new Map<string, number>();
    for (const item of items) {
      combined.set(
        item.variantId,
        (combined.get(item.variantId) ?? 0) + item.quantity,
      );
    }
    return [...combined.entries()]
      .map(([variantId, quantity]) => ({ variantId, quantity }))
      .sort((left, right) => left.variantId.localeCompare(right.variantId));
  }

  private async lockBalance(
    tx: Prisma.TransactionClient,
    variantId: string,
    locationId: string,
  ): Promise<LockedBalance | null> {
    const rows = await tx.$queryRaw<LockedBalance[]>`
      SELECT "id", "on_hand", "reserved"
      FROM "inventory_balances"
      WHERE "variant_id" = ${variantId}::uuid
        AND "location_id" = ${locationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async listProductsForSale(query: PosProductQuery, actor: StaffPrincipal) {
    const shift = await this.prisma.$transaction(
      async (tx) => this.businessDay.ensureTodayShift(actor, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    this.businessDay.assertRegisterReady(shift);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const search = query.search?.trim() ?? '';
    const includeZero = query.includeZero ?? false;
    const locationId = shift.register.locationId;
    const searching = search.length > 0;
    // Search must surface catalog hits even with 0 stock at this register.
    const allowZeroStock = includeZero || searching;

    const searchFilter: Prisma.ProductVariantWhereInput | undefined = searching
      ? {
          OR: [
            { sku: { contains: search, mode: 'insensitive' as const } },
            {
              barcode: { contains: search, mode: 'insensitive' as const },
            },
            { name: { contains: search, mode: 'insensitive' as const } },
            {
              product: {
                name: { contains: search, mode: 'insensitive' as const },
              },
            },
            {
              product: {
                brand: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
            },
          ],
        }
      : undefined;

    const variantWhere: Prisma.ProductVariantWhereInput = {
      status: CatalogStatus.ACTIVE,
      product: { status: CatalogStatus.ACTIVE },
      ...searchFilter,
      ...(!allowZeroStock
        ? {
            balances: {
              some: { locationId, onHand: { gt: 0 } },
            },
          }
        : {}),
    };

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: variantWhere,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: { select: { name: true } },
            },
          },
          balances: {
            where: { locationId },
            select: { onHand: true, reserved: true },
            take: 1,
          },
        },
        orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.productVariant.count({ where: variantWhere }),
    ]);

    const mapped = variants
      .map((variant) => {
        const balance = variant.balances[0] ?? null;
        const available =
          balance === null ? 0 : Math.max(0, balance.onHand - balance.reserved);
        return {
          id: variant.id,
          productId: variant.product.id,
          productName: formatProductDisplayTitle(variant.product, variant),
          name: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          price: variant.price.toFixed(2),
          currency: variant.currency,
          available,
        };
      })
      .filter((item) => allowZeroStock || item.available > 0);

    return {
      shiftId: shift.id,
      businessDate: bakuDayKey(shift.businessDate),
      location: withCanonicalLocationName({
        id: shift.register.location.id,
        code: shift.register.location.code,
        name: shift.register.location.name,
      }),
      items: mapped,
      total,
    };
  }

  async lookupByBarcode(barcode: string, actor: StaffPrincipal) {
    const shift = await this.prisma.$transaction(
      async (tx) => this.businessDay.ensureTodayShift(actor, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    this.businessDay.assertRegisterReady(shift);
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        barcode,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      include: {
        product: {
          select: { id: true, name: true, brand: { select: { name: true } } },
        },
        balances: {
          where: { locationId: shift.register.locationId },
          include: {
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (variant === null) {
      throw new NotFoundException('Barcode was not found');
    }
    const balance = variant.balances[0] ?? null;
    const available =
      balance === null ? 0 : Math.max(0, balance.onHand - balance.reserved);
    return {
      shiftId: shift.id,
      businessDate: bakuDayKey(shift.businessDate),
      register: {
        id: shift.register.id,
        code: shift.register.code,
        name: shift.register.name,
      },
      location: withCanonicalLocationName({
        id: shift.register.location.id,
        code: shift.register.location.code,
        name: shift.register.location.name,
      }),
      variant: {
        id: variant.id,
        productId: variant.product.id,
        productName: formatProductDisplayTitle(variant.product, variant),
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price.toFixed(2),
        currency: variant.currency,
        available,
      },
    };
  }

  async getSale(id: string) {
    return this.mapSale(await this.loadSale(this.prisma, id));
  }

  async dailySummary(date: string | undefined, actor: StaffPrincipal) {
    return this.businessDay.getDailySummary(date, actor);
  }

  async createSale(
    dto: CreatePosSaleDto,
    idempotencyKey: string | undefined,
    actor: StaffPrincipal,
  ) {
    if (idempotencyKey === undefined || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const channel = this.validateSalePayment(dto);

    const items = this.normalizeItems(dto.items);
    let resolvedShiftId: string | null = null;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const shift = await this.businessDay.ensureTodayShift(actor, tx);
          this.businessDay.assertRegisterReady(shift);
          resolvedShiftId = shift.id;

          const existing = await tx.posSale.findUnique({
            where: {
              shiftId_idempotencyKey: {
                shiftId: shift.id,
                idempotencyKey,
              },
            },
            include: POS_SALE_WITH_RELATIONS,
          });
          if (existing !== null) {
            return this.mapSale(existing);
          }

          const variants = await tx.productVariant.findMany({
            where: {
              id: { in: items.map((item) => item.variantId) },
              status: CatalogStatus.ACTIVE,
              product: { status: CatalogStatus.ACTIVE },
            },
            include: {
              product: {
                select: { name: true, brand: { select: { name: true } } },
              },
            },
          });
          if (variants.length !== items.length) {
            throw new BadRequestException('One or more sale items are invalid');
          }
          const variantsById = new Map(
            variants.map((variant) => [variant.id, variant]),
          );

          const pricedItems = [];
          let subtotal = new Prisma.Decimal(0);
          for (const item of items) {
            const variant = variantsById.get(item.variantId);
            if (variant === undefined) {
              throw new BadRequestException(
                'One or more sale items are invalid',
              );
            }
            const balance = await this.lockBalance(
              tx,
              item.variantId,
              shift.register.locationId,
            );
            if (
              balance === null ||
              balance.on_hand - balance.reserved < item.quantity
            ) {
              throw new ConflictException('Insufficient available stock');
            }
            const nextOnHand = applyOnHandDelta(
              { onHand: balance.on_hand, reserved: balance.reserved },
              -item.quantity,
            ).onHand;
            const lineTotal = variant.price.mul(item.quantity);
            subtotal = subtotal.add(lineTotal);
            pricedItems.push({
              item,
              variant,
              balance,
              nextOnHand,
              lineTotal,
            });
          }

          const saleNumber = this.buildHumanNumber('POS');
          const receiptNumber = this.buildHumanNumber('RCP');
          const sale = await tx.posSale.create({
            data: {
              saleNumber,
              receiptNumber,
              shiftId: shift.id,
              registerId: shift.registerId,
              locationId: shift.register.locationId,
              staffUserId: actor.id,
              idempotencyKey,
              subtotal,
              grandTotal: subtotal,
              currency: 'AZN',
              channel,
              paymentMethod: dto.paymentMethod,
              externalTerminalReference:
                dto.externalTerminalReference?.trim() ?? null,
              items: {
                create: pricedItems.map(({ item, variant, lineTotal }) => ({
                  variantId: variant.id,
                  productName: formatProductDisplayTitle(
                    variant.product,
                    variant,
                  ),
                  variantName: variant.name,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  quantity: item.quantity,
                  unitPrice: variant.price,
                  lineTotal,
                  currency: variant.currency,
                  attributesSnapshot:
                    variant.attributes === null
                      ? Prisma.JsonNull
                      : (variant.attributes as Prisma.InputJsonValue),
                })),
              },
              payment: {
                create: {
                  method: dto.paymentMethod,
                  amount: subtotal,
                  currency: 'AZN',
                  terminalReference:
                    dto.externalTerminalReference?.trim() ?? null,
                  bankName:
                    dto.paymentMethod === PaymentMethod.INSTALLMENT
                      ? (dto.bankName?.trim() ?? null)
                      : null,
                  installmentMonths:
                    dto.paymentMethod === PaymentMethod.INSTALLMENT
                      ? (dto.installmentMonths ?? null)
                      : null,
                },
              },
            },
          });

          for (const { item, balance, nextOnHand } of pricedItems) {
            await tx.inventoryBalance.update({
              where: { id: balance.id },
              data: { onHand: nextOnHand },
            });
            await tx.inventoryMovement.create({
              data: {
                variantId: item.variantId,
                locationId: shift.register.locationId,
                type: InventoryMovementType.SALE,
                quantityDelta: -item.quantity,
                sourceType: 'pos-sale',
                sourceDocumentId: sale.id,
                reason: `POS sale ${sale.saleNumber}`,
                actorStaffId: actor.id,
              },
            });
          }

          if (dto.paymentMethod === PaymentMethod.CASH) {
            await tx.cashMovement.create({
              data: {
                shiftId: shift.id,
                type: CashMovementType.SALE,
                amount: subtotal,
                reason: `POS cash sale ${sale.saleNumber}`,
                reference: sale.id,
                actorStaffId: actor.id,
              },
            });
          }

          await this.businessDay.applySaleToLedger(tx, {
            registerId: shift.registerId,
            businessDate: shift.businessDate,
            channel,
            paymentMethod: dto.paymentMethod,
            amount: subtotal,
          });

          await tx.auditLog.create({
            data: {
              actorType: 'staff',
              actorId: actor.id,
              action: 'pos-sale.completed',
              entityType: 'pos-sale',
              entityId: sale.id,
              after: {
                saleNumber: sale.saleNumber,
                receiptNumber: sale.receiptNumber,
                shiftId: shift.id,
                businessDate: bakuDayKey(shift.businessDate),
                registerId: shift.registerId,
                locationId: shift.register.locationId,
                idempotencyKey,
                channel,
                paymentMethod: dto.paymentMethod,
                grandTotal: subtotal.toFixed(2),
                ...(dto.paymentMethod === PaymentMethod.INSTALLMENT
                  ? {
                      bankName: dto.bankName?.trim() ?? null,
                      installmentMonths: dto.installmentMonths ?? null,
                    }
                  : {}),
                items: pricedItems.map(({ item }) => ({
                  variantId: item.variantId,
                  quantity: item.quantity,
                })),
              },
            },
          });

          const completedSale = await this.loadSale(tx, sale.id);
          await this.fiscalReceipt.issueReceipt({
            saleId: completedSale.id,
            saleNumber: completedSale.saleNumber,
            receiptNumber: completedSale.receiptNumber,
            grandTotal: completedSale.grandTotal.toFixed(2),
            currency: completedSale.currency,
            paymentMethod: completedSale.paymentMethod,
          });

          return this.mapSale(completedSale);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        resolvedShiftId !== null
      ) {
        const existing = await this.prisma.posSale.findUnique({
          where: {
            shiftId_idempotencyKey: {
              shiftId: resolvedShiftId,
              idempotencyKey,
            },
          },
          include: POS_SALE_WITH_RELATIONS,
        });
        if (existing !== null) {
          return this.mapSale(existing);
        }
      }
      throw error;
    }
  }

  async createReturn(
    dto: CreatePosReturnDto,
    idempotencyKey: string | undefined,
    actor: StaffPrincipal,
  ) {
    if (idempotencyKey === undefined || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    let resolvedShiftId: string | null = null;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const shift = await this.businessDay.ensureTodayShift(actor, tx);
          this.businessDay.assertRegisterReady(shift);
          resolvedShiftId = shift.id;

          const existing = await tx.posReturn.findUnique({
            where: {
              shiftId_idempotencyKey: {
                shiftId: shift.id,
                idempotencyKey,
              },
            },
            include: POS_RETURN_WITH_RELATIONS,
          });
          if (existing !== null) {
            return this.mapReturn(existing);
          }

          const sale = await tx.posSale.findUniqueOrThrow({
            where: { id: dto.saleId },
            include: {
              items: {
                include: {
                  returnItems: {
                    select: { quantity: true },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
              payment: true,
            },
          });

          if (sale.locationId !== shift.register.locationId) {
            throw new ConflictException(
              'Returns must be processed against the original sale location',
            );
          }
          const returnAgeDays = bakuCalendarDayDiff(sale.createdAt, new Date());
          if (returnAgeDays < 0 || returnAgeDays >= POS_RETURN_WINDOW_CALENDAR_DAYS) {
            throw new BadRequestException(
              `POS returns are only allowed within ${POS_RETURN_WINDOW_CALENDAR_DAYS} calendar days of the sale (Asia/Baku)`,
            );
          }
          if (
            this.requiresTerminalReference(sale.paymentMethod) &&
            (dto.externalTerminalReference === undefined ||
              dto.externalTerminalReference.trim().length < 2)
          ) {
            throw new BadRequestException(
              'Card and installment refunds require an external terminal reference',
            );
          }
          if (
            sale.paymentMethod === PaymentMethod.CASH &&
            dto.externalTerminalReference !== undefined
          ) {
            throw new BadRequestException(
              'External terminal reference is only valid for card or installment refunds',
            );
          }

          const requestedItems = dto.items
            .map((item) => ({
              saleItemId: item.saleItemId,
              quantity: item.quantity,
            }))
            .sort((left, right) =>
              left.saleItemId.localeCompare(right.saleItemId),
            );
          const combined = new Map<string, number>();
          for (const item of requestedItems) {
            combined.set(
              item.saleItemId,
              (combined.get(item.saleItemId) ?? 0) + item.quantity,
            );
          }

          const saleItemsById = new Map(
            sale.items.map((item) => [item.id, item]),
          );
          const pricedItems: Array<{
            saleItem: (typeof sale.items)[number];
            quantity: number;
            lineTotal: Prisma.Decimal;
          }> = [];
          let refundAmount = new Prisma.Decimal(0);
          for (const [saleItemId, quantity] of combined.entries()) {
            const saleItem = saleItemsById.get(saleItemId);
            if (saleItem === undefined) {
              throw new BadRequestException(
                'Return items must belong to the original sale',
              );
            }
            const returnedQuantity = saleItem.returnItems.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            const remainingQuantity = Math.max(
              0,
              saleItem.quantity - returnedQuantity,
            );
            if (quantity > remainingQuantity) {
              throw new ConflictException(
                `Return quantity exceeds the remaining sold quantity (${remainingQuantity} left for this line)`,
              );
            }
            const lineTotal = saleItem.unitPrice.mul(quantity);
            refundAmount = refundAmount.add(lineTotal);
            pricedItems.push({ saleItem, quantity, lineTotal });
          }

          const created = await tx.posReturn.create({
            data: {
              returnNumber: this.buildHumanNumber('RET'),
              saleId: sale.id,
              shiftId: shift.id,
              locationId: shift.register.locationId,
              staffUserId: actor.id,
              idempotencyKey,
              reason: dto.reason,
              paymentMethod: sale.paymentMethod,
              refundAmount,
              currency: sale.currency,
              externalTerminalReference:
                dto.externalTerminalReference?.trim() ?? null,
              restockedToInventory: dto.restockToInventory ?? true,
              items: {
                create: pricedItems.map(
                  ({ saleItem, quantity, lineTotal }) => ({
                    saleItemId: saleItem.id,
                    variantId: saleItem.variantId,
                    quantity,
                    unitPrice: saleItem.unitPrice,
                    lineTotal,
                    currency: saleItem.currency,
                  }),
                ),
              },
            },
          });

          if (dto.restockToInventory ?? true) {
            for (const { saleItem, quantity } of pricedItems) {
              const balance = await this.lockBalance(
                tx,
                saleItem.variantId,
                shift.register.locationId,
              );
              if (balance === null) {
                throw new ConflictException(
                  'Inventory balance is missing for the returned item',
                );
              }
              await tx.inventoryBalance.update({
                where: { id: balance.id },
                data: { onHand: { increment: quantity } },
              });
              await tx.inventoryMovement.create({
                data: {
                  variantId: saleItem.variantId,
                  locationId: shift.register.locationId,
                  type: InventoryMovementType.RETURN,
                  quantityDelta: quantity,
                  sourceType: 'pos-return',
                  sourceDocumentId: created.id,
                  reason: `POS return ${created.returnNumber}`,
                  actorStaffId: actor.id,
                },
              });
            }
          }

          if (sale.paymentMethod === PaymentMethod.CASH) {
            await tx.cashMovement.create({
              data: {
                shiftId: shift.id,
                type: CashMovementType.REFUND,
                amount: refundAmount,
                reason: `POS refund ${created.returnNumber}`,
                reference: created.id,
                actorStaffId: actor.id,
              },
            });
          }

          await this.businessDay.applyReturnToLedger(tx, {
            registerId: shift.registerId,
            businessDate: shift.businessDate,
            paymentMethod: sale.paymentMethod,
            amount: refundAmount,
          });

          await tx.auditLog.create({
            data: {
              actorType: 'staff',
              actorId: actor.id,
              action: 'pos-return.completed',
              entityType: 'pos-return',
              entityId: created.id,
              after: {
                returnNumber: created.returnNumber,
                saleId: sale.id,
                shiftId: shift.id,
                businessDate: bakuDayKey(shift.businessDate),
                locationId: shift.register.locationId,
                idempotencyKey,
                paymentMethod: sale.paymentMethod,
                refundAmount: refundAmount.toFixed(2),
                restockedToInventory: dto.restockToInventory ?? true,
                items: pricedItems.map(({ saleItem, quantity }) => ({
                  saleItemId: saleItem.id,
                  variantId: saleItem.variantId,
                  quantity,
                })),
              },
            },
          });

          return this.mapReturn(await this.loadReturn(tx, created.id));
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        resolvedShiftId !== null
      ) {
        const existing = await this.prisma.posReturn.findUnique({
          where: {
            shiftId_idempotencyKey: {
              shiftId: resolvedShiftId,
              idempotencyKey,
            },
          },
          include: POS_RETURN_WITH_RELATIONS,
        });
        if (existing !== null) {
          return this.mapReturn(existing);
        }
      }
      throw error;
    }
  }
}

@ApiTags('pos')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.POS_SALE)
@Controller({ path: 'pos', version: '1' })
class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('lookup')
  lookup(
    @Query() query: BarcodeLookupQuery,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.pos.lookupByBarcode(query.barcode, actor);
  }

  @Get('products')
  products(
    @Query() query: PosProductQuery,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.pos.listProductsForSale(query, actor);
  }

  @Get('daily-summary')
  dailySummary(
    @Query() query: DailySummaryQuery,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.pos.dailySummary(query.date, actor);
  }

  @Get('sales/:id')
  sale(@Param('id', ParseUUIDPipe) id: string) {
    return this.pos.getSale(id);
  }

  @Post('sales')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createSale(
    @Body() dto: CreatePosSaleDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.pos.createSale(dto, idempotencyKey, actor);
  }

  @Post('returns')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(Permission.REFUND)
  createReturn(
    @Body() dto: CreatePosReturnDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.pos.createReturn(dto, idempotencyKey, actor);
  }
}

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule, CashRegisterModule],
  controllers: [PosController],
  providers: [
    {
      provide: FISCAL_RECEIPT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        createFiscalReceiptProvider(config),
    },
    PosService,
  ],
})
export class PosModule {}
