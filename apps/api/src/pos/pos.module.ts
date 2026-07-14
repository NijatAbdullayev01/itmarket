import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
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
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { randomUUID } from 'node:crypto';
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
  CashShiftStatus,
  InventoryMovementType,
  LocationType,
  PaymentMethod,
} from '../generated/prisma/enums';
import { CatalogStatus, Prisma } from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { applyOnHandDelta } from '../inventory/inventory.domain';

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
  @IsUUID()
  shiftId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalTerminalReference?: string;

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
  @IsUUID()
  shiftId!: string;

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
  shift: { select: { id: true, status: true, openedAt: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
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
  shift: { select: { id: true, status: true, openedAt: true } },
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
  constructor(private readonly prisma: PrismaService) {}

  private mapSale(sale: PosSaleDetails) {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      receiptNumber: sale.receiptNumber,
      createdAt: sale.createdAt.toISOString(),
      shift: {
        id: sale.shift.id,
        status: sale.shift.status,
        openedAt: sale.shift.openedAt.toISOString(),
      },
      register: {
        id: sale.register.id,
        code: sale.register.code,
        name: sale.register.name,
        location: sale.register.location,
      },
      paymentMethod: sale.paymentMethod,
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
              createdAt: sale.payment.createdAt.toISOString(),
            },
      items: sale.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
        currency: item.currency,
      })),
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

  private parseActiveShift(
    shift: {
      id: string;
      staffUserId: string;
      status: CashShiftStatus;
      register: {
        id: string;
        code: string;
        name: string;
        active: boolean;
        locationId: string;
        location: {
          id: string;
          code: string;
          name: string;
          type: LocationType;
          active: boolean;
        };
      };
    },
    actor: StaffPrincipal,
  ) {
    if (shift.staffUserId !== actor.id) {
      throw new ForbiddenException(
        'Cashier can only sell against its own active shift',
      );
    }
    if (shift.status !== CashShiftStatus.OPEN) {
      throw new ConflictException(
        'POS sales are blocked unless the shift is OPEN',
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

  async activeShift(actor: StaffPrincipal) {
    return this.prisma.cashShift.findFirst({
      where: {
        staffUserId: actor.id,
        status: CashShiftStatus.OPEN,
      },
      include: {
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
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async lookupByBarcode(barcode: string, actor: StaffPrincipal) {
    const shift = await this.activeShift(actor);
    if (shift === null) {
      throw new ConflictException(
        'Open shift is required before barcode lookup',
      );
    }
    this.parseActiveShift(shift, actor);
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        barcode,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      include: {
        product: { select: { id: true, name: true } },
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
      register: {
        id: shift.register.id,
        code: shift.register.code,
        name: shift.register.name,
      },
      location: {
        id: shift.register.location.id,
        code: shift.register.location.code,
        name: shift.register.location.name,
      },
      variant: {
        id: variant.id,
        productId: variant.product.id,
        productName: variant.product.name,
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

  async createSale(
    dto: CreatePosSaleDto,
    idempotencyKey: string | undefined,
    actor: StaffPrincipal,
  ) {
    if (idempotencyKey === undefined || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (
      dto.paymentMethod !== PaymentMethod.CASH &&
      dto.paymentMethod !== PaymentMethod.CARD
    ) {
      throw new BadRequestException('POS only supports CASH or CARD payments');
    }
    if (dto.paymentMethod === PaymentMethod.CARD) {
      if (
        dto.externalTerminalReference === undefined ||
        dto.externalTerminalReference.trim().length < 2
      ) {
        throw new BadRequestException(
          'Card sales require an external terminal reference',
        );
      }
    } else if (dto.externalTerminalReference !== undefined) {
      throw new BadRequestException(
        'External terminal reference is only valid for card sales',
      );
    }

    const items = this.normalizeItems(dto.items);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.posSale.findUnique({
            where: {
              shiftId_idempotencyKey: {
                shiftId: dto.shiftId,
                idempotencyKey,
              },
            },
            include: POS_SALE_WITH_RELATIONS,
          });
          if (existing !== null) {
            return this.mapSale(existing);
          }

          const shift = await tx.cashShift.findUniqueOrThrow({
            where: { id: dto.shiftId },
            include: {
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
            },
          });
          this.parseActiveShift(shift, actor);

          const variants = await tx.productVariant.findMany({
            where: {
              id: { in: items.map((item) => item.variantId) },
              status: CatalogStatus.ACTIVE,
              product: { status: CatalogStatus.ACTIVE },
            },
            include: {
              product: { select: { name: true } },
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
              paymentMethod: dto.paymentMethod,
              externalTerminalReference:
                dto.externalTerminalReference?.trim() ?? null,
              items: {
                create: pricedItems.map(({ item, variant, lineTotal }) => ({
                  variantId: variant.id,
                  productName: variant.product.name,
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
                registerId: shift.registerId,
                locationId: shift.register.locationId,
                idempotencyKey,
                paymentMethod: dto.paymentMethod,
                grandTotal: subtotal.toFixed(2),
                items: pricedItems.map(({ item }) => ({
                  variantId: item.variantId,
                  quantity: item.quantity,
                })),
              },
            },
          });

          return this.mapSale(await this.loadSale(tx, sale.id));
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.posSale.findUnique({
          where: {
            shiftId_idempotencyKey: {
              shiftId: dto.shiftId,
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
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.posReturn.findUnique({
            where: {
              shiftId_idempotencyKey: {
                shiftId: dto.shiftId,
                idempotencyKey,
              },
            },
            include: POS_RETURN_WITH_RELATIONS,
          });
          if (existing !== null) {
            return this.mapReturn(existing);
          }

          const shift = await tx.cashShift.findUniqueOrThrow({
            where: { id: dto.shiftId },
            include: {
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
            },
          });
          this.parseActiveShift(shift, actor);

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
          if (
            sale.paymentMethod === PaymentMethod.CARD &&
            (dto.externalTerminalReference === undefined ||
              dto.externalTerminalReference.trim().length < 2)
          ) {
            throw new BadRequestException(
              'Card refunds require an external terminal reference',
            );
          }
          if (
            sale.paymentMethod === PaymentMethod.CASH &&
            dto.externalTerminalReference !== undefined
          ) {
            throw new BadRequestException(
              'External terminal reference is only valid for card refunds',
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
            const remainingQuantity = saleItem.quantity - returnedQuantity;
            if (quantity > remainingQuantity) {
              throw new ConflictException(
                'Return quantity exceeds the remaining sold quantity',
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
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.posReturn.findUnique({
          where: {
            shiftId_idempotencyKey: {
              shiftId: dto.shiftId,
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
  imports: [PrismaModule, AuthModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
