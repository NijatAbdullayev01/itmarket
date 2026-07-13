import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  InventoryMovementType,
  LocationType,
  Prisma,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { applyOnHandDelta } from './inventory.domain';

class LocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(LocationType)
  type!: LocationType;

  @IsBoolean()
  active = true;
}

class MovementDto {
  @IsUUID()
  variantId!: string;

  @IsUUID()
  locationId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sourceType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceDocumentId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

class AdjustmentDto extends MovementDto {
  @Type(() => Number)
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  override quantity = 0;
}

class TransferDto {
  @IsUUID()
  variantId!: string;

  @IsUUID()
  fromLocationId!: string;

  @IsUUID()
  toLocationId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sourceType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceDocumentId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

class InventoryQuery {
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

type LockedBalance = {
  id: string;
  on_hand: number;
  reserved: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createLocation(dto: LocationDto, actor: StaffPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.location.create({ data: dto });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'location.created',
          entityType: 'location',
          entityId: created.id,
          after: {
            code: created.code,
            name: created.name,
            type: created.type,
            active: created.active,
          },
        },
      });
      return created;
    });
  }

  async updateLocation(id: string, dto: LocationDto, actor: StaffPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.location.findUniqueOrThrow({ where: { id } });
      const updated = await tx.location.update({ where: { id }, data: dto });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'location.updated',
          entityType: 'location',
          entityId: id,
          before: {
            code: before.code,
            name: before.name,
            type: before.type,
            active: before.active,
          },
          after: {
            code: updated.code,
            name: updated.name,
            type: updated.type,
            active: updated.active,
          },
        },
      });
      return updated;
    });
  }

  locations() {
    return this.prisma.location.findMany({ orderBy: { code: 'asc' } });
  }

  balances(query: InventoryQuery) {
    return this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.variantId === undefined
          ? {}
          : { variantId: query.variantId }),
        ...(query.locationId === undefined
          ? {}
          : { locationId: query.locationId }),
      },
      take: query.limit,
      include: {
        variant: { select: { sku: true, barcode: true, name: true } },
        location: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  movements(query: InventoryQuery) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        ...(query.variantId === undefined
          ? {}
          : { variantId: query.variantId }),
        ...(query.locationId === undefined
          ? {}
          : { locationId: query.locationId }),
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  receipt(dto: MovementDto, actor: StaffPrincipal) {
    return this.change(dto, InventoryMovementType.RECEIPT, dto.quantity, actor);
  }

  adjustment(dto: AdjustmentDto, actor: StaffPrincipal) {
    if (dto.quantity === 0)
      throw new BadRequestException('Adjustment cannot be zero');
    return this.change(
      dto,
      InventoryMovementType.ADJUSTMENT,
      dto.quantity,
      actor,
    );
  }

  private async lockBalance(
    tx: Prisma.TransactionClient,
    variantId: string,
    locationId: string,
  ): Promise<LockedBalance> {
    await tx.inventoryBalance.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      create: { variantId, locationId, onHand: 0, reserved: 0 },
      update: {},
    });
    const rows = await tx.$queryRaw<LockedBalance[]>`
      SELECT "id", "on_hand", "reserved"
      FROM "inventory_balances"
      WHERE "variant_id" = ${variantId}::uuid
        AND "location_id" = ${locationId}::uuid
      FOR UPDATE
    `;
    const balance = rows[0];
    if (balance === undefined) throw new ConflictException('Balance not found');
    return balance;
  }

  private async change(
    dto: MovementDto | AdjustmentDto,
    type: InventoryMovementType,
    delta: number,
    actor: StaffPrincipal,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const [variant, location] = await Promise.all([
            tx.productVariant.findUnique({
              where: { id: dto.variantId },
              select: { id: true, status: true },
            }),
            tx.location.findUnique({
              where: { id: dto.locationId },
              select: { id: true, active: true },
            }),
          ]);
          if (variant === null)
            throw new BadRequestException('Unknown variant');
          if (location === null || !location.active)
            throw new BadRequestException('Inactive or unknown location');
          const balance = await this.lockBalance(
            tx,
            dto.variantId,
            dto.locationId,
          );
          let nextOnHand: number;
          try {
            nextOnHand = applyOnHandDelta(
              { onHand: balance.on_hand, reserved: balance.reserved },
              delta,
            ).onHand;
          } catch {
            throw new ConflictException(
              'Negative available stock is forbidden',
            );
          }
          const updated = await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: { onHand: nextOnHand },
          });
          const movement = await tx.inventoryMovement.create({
            data: {
              variantId: dto.variantId,
              locationId: dto.locationId,
              type,
              quantityDelta: delta,
              sourceType: dto.sourceType,
              sourceDocumentId: dto.sourceDocumentId,
              reason: dto.reason,
              actorStaffId: actor.id,
            },
          });
          await tx.auditLog.create({
            data: {
              actorType: 'staff',
              actorId: actor.id,
              action: `inventory.${type.toLowerCase()}`,
              entityType: 'inventory-movement',
              entityId: movement.id,
              before: {
                onHand: balance.on_hand,
                reserved: balance.reserved,
              },
              after: {
                onHand: updated.onHand,
                reserved: updated.reserved,
                quantityDelta: delta,
                sourceType: dto.sourceType,
                sourceDocumentId: dto.sourceDocumentId,
                reason: dto.reason,
              },
            },
          });
          return { balance: updated, movement };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Source document was already applied');
      }
      throw error;
    }
  }

  async transfer(dto: TransferDto, actor: StaffPrincipal) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Transfer locations must differ');
    }
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const locationIds = [dto.fromLocationId, dto.toLocationId].sort();
          for (const locationId of locationIds) {
            const location = await tx.location.findUnique({
              where: { id: locationId },
              select: { active: true },
            });
            if (location === null || !location.active)
              throw new BadRequestException('Inactive or unknown location');
            await tx.inventoryBalance.upsert({
              where: {
                variantId_locationId: {
                  variantId: dto.variantId,
                  locationId,
                },
              },
              create: {
                variantId: dto.variantId,
                locationId,
                onHand: 0,
                reserved: 0,
              },
              update: {},
            });
          }
          const locked = await tx.$queryRaw<LockedBalance[]>`
            SELECT "id", "on_hand", "reserved"
            FROM "inventory_balances"
            WHERE "variant_id" = ${dto.variantId}::uuid
              AND "location_id" IN (${dto.fromLocationId}::uuid, ${dto.toLocationId}::uuid)
            ORDER BY "location_id"
            FOR UPDATE
          `;
          const source = await tx.inventoryBalance.findUniqueOrThrow({
            where: {
              variantId_locationId: {
                variantId: dto.variantId,
                locationId: dto.fromLocationId,
              },
            },
          });
          const destination = await tx.inventoryBalance.findUniqueOrThrow({
            where: {
              variantId_locationId: {
                variantId: dto.variantId,
                locationId: dto.toLocationId,
              },
            },
          });
          if (
            locked.length !== 2 ||
            source.onHand - dto.quantity < source.reserved
          ) {
            throw new ConflictException('Insufficient available stock');
          }
          const transferGroupId = randomUUID();
          const updatedSource = await tx.inventoryBalance.update({
            where: { id: source.id },
            data: { onHand: { decrement: dto.quantity } },
          });
          const updatedDestination = await tx.inventoryBalance.update({
            where: { id: destination.id },
            data: { onHand: { increment: dto.quantity } },
          });
          const outgoing = await tx.inventoryMovement.create({
            data: {
              variantId: dto.variantId,
              locationId: dto.fromLocationId,
              type: InventoryMovementType.TRANSFER_OUT,
              quantityDelta: -dto.quantity,
              sourceType: dto.sourceType,
              sourceDocumentId: dto.sourceDocumentId,
              reason: dto.reason,
              actorStaffId: actor.id,
              transferGroupId,
            },
          });
          const incoming = await tx.inventoryMovement.create({
            data: {
              variantId: dto.variantId,
              locationId: dto.toLocationId,
              type: InventoryMovementType.TRANSFER_IN,
              quantityDelta: dto.quantity,
              sourceType: dto.sourceType,
              sourceDocumentId: dto.sourceDocumentId,
              reason: dto.reason,
              actorStaffId: actor.id,
              transferGroupId,
            },
          });
          await tx.auditLog.create({
            data: {
              actorType: 'staff',
              actorId: actor.id,
              action: 'inventory.transfer',
              entityType: 'inventory-transfer',
              entityId: transferGroupId,
              after: {
                variantId: dto.variantId,
                fromLocationId: dto.fromLocationId,
                toLocationId: dto.toLocationId,
                quantity: dto.quantity,
                sourceType: dto.sourceType,
                sourceDocumentId: dto.sourceDocumentId,
                reason: dto.reason,
              },
            },
          });
          return {
            transferGroupId,
            source: updatedSource,
            destination: updatedDestination,
            movements: [outgoing, incoming],
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Source document was already applied');
      }
      throw error;
    }
  }

  async reconcile() {
    const mismatches = await this.prisma.$queryRaw<
      {
        variant_id: string;
        location_id: string;
        balance_on_hand: number;
        ledger_on_hand: bigint;
      }[]
    >`
      SELECT b."variant_id", b."location_id", b."on_hand" AS "balance_on_hand",
             COALESCE(SUM(m."quantity_delta"), 0) AS "ledger_on_hand"
      FROM "inventory_balances" b
      LEFT JOIN "inventory_movements" m
        ON m."variant_id" = b."variant_id" AND m."location_id" = b."location_id"
      GROUP BY b."variant_id", b."location_id", b."on_hand"
      HAVING b."on_hand" <> COALESCE(SUM(m."quantity_delta"), 0)
    `;
    return {
      healthy: mismatches.length === 0,
      mismatches: mismatches.map((row) => ({
        ...row,
        ledger_on_hand: row.ledger_on_hand.toString(),
      })),
    };
  }
}

@ApiTags('inventory')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.INVENTORY_READ)
@Controller({ path: 'inventory', version: '1' })
class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('locations')
  locations() {
    return this.inventory.locations();
  }

  @Post('locations')
  @RequirePermissions(Permission.STOCK_ADJUSTMENT)
  createLocation(
    @Body() dto: LocationDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.inventory.createLocation(dto, actor);
  }

  @Patch('locations/:id')
  @RequirePermissions(Permission.STOCK_ADJUSTMENT)
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LocationDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.inventory.updateLocation(id, dto, actor);
  }

  @Get('balances')
  balances(@Query() query: InventoryQuery) {
    return this.inventory.balances(query);
  }

  @Get('movements')
  movements(@Query() query: InventoryQuery) {
    return this.inventory.movements(query);
  }

  @Post('receipts')
  @RequirePermissions(Permission.INVENTORY_RECEIPT)
  receipt(@Body() dto: MovementDto, @CurrentStaff() actor: StaffPrincipal) {
    return this.inventory.receipt(dto, actor);
  }

  @Post('adjustments')
  @RequirePermissions(Permission.STOCK_ADJUSTMENT)
  adjustment(
    @Body() dto: AdjustmentDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.inventory.adjustment(dto, actor);
  }

  @Post('transfers')
  @RequirePermissions(Permission.INVENTORY_TRANSFER)
  transfer(@Body() dto: TransferDto, @CurrentStaff() actor: StaffPrincipal) {
    return this.inventory.transfer(dto, actor);
  }

  @Get('reconciliation')
  @RequirePermissions(Permission.STOCK_ADJUSTMENT)
  reconcile() {
    return this.inventory.reconcile();
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
