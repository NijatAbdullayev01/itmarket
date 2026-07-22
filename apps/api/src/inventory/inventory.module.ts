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
import { Transform, Type } from 'class-transformer';
import {
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
  ValidateIf,
  ValidateNested,
  IsArray,
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
import { ProductAvailabilityModule, ProductAvailabilityService } from '../product-availability/product-availability.module';
import { applyOnHandDelta, inventoryBalanceSearchTokens } from './inventory.domain';
import {
  intakeFieldsProvided,
  normalizeOptionalIntakeBarcode,
  resolveIntakeVariantId,
} from './inventory-intake.catalog';
import {
  buildIntakeVariantAttributesFromRequiredSpecs,
  buildIntakeVariantNameFromRequiredSpecs,
} from './inventory-intake-variant-specs';
import { parseProductRequiredSpecs } from '../catalog/product-required-specs';
import { withCanonicalLocationName } from './format-location-display-name';

const INTAKE_BARCODE = /^[0-9A-Za-z-]{4,64}$/;
const VARIANT_SKU = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;

class IntakeRequiredSpecEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  value!: string;
}

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

class ReceiptDto {
  @ValidateIf((dto: ReceiptDto) => !intakeFieldsProvided(dto))
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  intakeBrandName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  intakeModelName?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalIntakeBarcode(value))
  @Matches(INTAKE_BARCODE)
  intakeBarcode?: string;

  @IsOptional()
  @IsUUID()
  intakeCategoryId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntakeRequiredSpecEntryDto)
  intakeRequiredSpecs?: IntakeRequiredSpecEntryDto[];

  @IsOptional()
  @IsString()
  @Matches(VARIANT_SKU)
  @MaxLength(64)
  intakeVariantSku?: string;

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
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'false' || value === false) return false;
    if (value === 'true' || value === true) return true;
    return undefined;
  })
  @IsBoolean()
  includeZero?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  offset = 0;
}

type LockedBalance = {
  id: string;
  on_hand: number;
  reserved: number;
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ProductAvailabilityService,
  ) {}

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

  async locations() {
    const rows = await this.prisma.location.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    return rows.map((row) => withCanonicalLocationName(row));
  }

  private variantSearchOrConditions(
    token: string,
  ): Prisma.ProductVariantWhereInput[] {
    return [
      { sku: { contains: token, mode: 'insensitive' } },
      { name: { contains: token, mode: 'insensitive' } },
      { barcode: { contains: token, mode: 'insensitive' } },
      {
        product: { name: { contains: token, mode: 'insensitive' } },
      },
      {
        product: {
          brand: { name: { contains: token, mode: 'insensitive' } },
        },
      },
    ];
  }

  private balanceWhere(query: InventoryQuery): Prisma.InventoryBalanceWhereInput {
    const filters: Prisma.InventoryBalanceWhereInput[] = [];
    if (query.variantId !== undefined) {
      filters.push({ variantId: query.variantId });
    }
    if (query.locationId !== undefined) {
      filters.push({ locationId: query.locationId });
    }
    if (query.includeZero === false) {
      filters.push({
        OR: [{ onHand: { gt: 0 } }, { reserved: { gt: 0 } }],
      });
    }
    const search = query.search?.trim();
    const searchTokens =
      search === undefined || search.length === 0
        ? []
        : inventoryBalanceSearchTokens(search);
    if (searchTokens.length > 0) {
      filters.push({
        AND: searchTokens.map((token) => ({
          variant: {
            OR: this.variantSearchOrConditions(token),
          },
        })),
      });
    }
    return filters.length > 0 ? { AND: filters } : {};
  }

  private async loadLatestQuantityEntryMeta(
    pairs: { variantId: string; locationId: string }[],
  ): Promise<
    Map<
      string,
      {
        enteredBy: { id: string; displayName: string; email: string };
        enteredAt: Date;
      }
    >
  > {
    if (pairs.length === 0) {
      return new Map();
    }
    const tupleList = Prisma.join(
      pairs.map(
        (pair) =>
          Prisma.sql`(${pair.variantId}::uuid, ${pair.locationId}::uuid)`,
      ),
    );
    const rows = await this.prisma.$queryRaw<
      {
        variant_id: string;
        location_id: string;
        actor_staff_id: string;
        created_at: Date;
      }[]
    >`
      SELECT DISTINCT ON (m."variant_id", m."location_id")
        m."variant_id",
        m."location_id",
        m."actor_staff_id",
        m."created_at"
      FROM "inventory_movements" m
      WHERE m."quantity_delta" > 0
        AND (m."variant_id", m."location_id") IN (${tupleList})
      ORDER BY m."variant_id", m."location_id", m."created_at" DESC
    `;
    const staffIds = [...new Set(rows.map((row) => row.actor_staff_id))];
    if (staffIds.length === 0) {
      return new Map();
    }
    const staffUsers = await this.prisma.staffUser.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, displayName: true, email: true },
    });
    const staffById = new Map(staffUsers.map((user) => [user.id, user]));
    const result = new Map<
      string,
      {
        enteredBy: { id: string; displayName: string; email: string };
        enteredAt: Date;
      }
    >();
    for (const row of rows) {
      const staff = staffById.get(row.actor_staff_id);
      if (staff === undefined) {
        continue;
      }
      result.set(`${row.variant_id}:${row.location_id}`, {
        enteredBy: staff,
        enteredAt: row.created_at,
      });
    }
    return result;
  }

  async balances(query: InventoryQuery) {
    const where = this.balanceWhere(query);
    const [items, total, aggregates] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where,
        skip: query.offset,
        take: query.limit,
        include: {
          variant: {
            select: {
              sku: true,
              barcode: true,
              name: true,
              attributes: true,
              product: {
                select: {
                  name: true,
                  brand: { select: { id: true, name: true } },
                },
              },
            },
          },
          location: { select: { code: true, name: true, type: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.inventoryBalance.count({ where }),
      this.prisma.inventoryBalance.aggregate({
        where,
        _sum: { onHand: true, reserved: true },
      }),
    ]);
    const quantityEntryMeta = await this.loadLatestQuantityEntryMeta(
      items.map((item) => ({
        variantId: item.variantId,
        locationId: item.locationId,
      })),
    );
    const onHand = aggregates._sum.onHand ?? 0;
    const reserved = aggregates._sum.reserved ?? 0;
    return {
      items: items.map((item) => {
        const entryMeta = quantityEntryMeta.get(
          `${item.variantId}:${item.locationId}`,
        );
        return {
          ...item,
          location: withCanonicalLocationName(item.location),
          quantityEnteredBy: entryMeta?.enteredBy ?? null,
          quantityEnteredAt: entryMeta?.enteredAt.toISOString() ?? null,
        };
      }),
      total,
      summary: {
        onHand,
        reserved,
        available: onHand - reserved,
      },
    };
  }

  async movements(query: InventoryQuery) {
    const rows = await this.prisma.inventoryMovement.findMany({
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
      include: {
        variant: {
          select: {
            sku: true,
            barcode: true,
            name: true,
            attributes: true,
            product: {
              select: {
                name: true,
                brand: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    const staffIds = [...new Set(rows.map((row) => row.actorStaffId))];
    if (staffIds.length === 0) {
      return rows.map((row) => ({ ...row, actorStaff: null }));
    }
    const staffUsers = await this.prisma.staffUser.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, displayName: true, email: true },
    });
    const staffById = new Map(staffUsers.map((user) => [user.id, user]));
    return rows.map((row) => ({
      ...row,
      actorStaff: staffById.get(row.actorStaffId) ?? null,
    }));
  }

  async receipt(dto: ReceiptDto, actor: StaffPrincipal) {
    const variantId = dto.variantId?.trim();
    if (variantId !== undefined && variantId !== '') {
      return this.change(
        {
          variantId,
          locationId: dto.locationId,
          quantity: dto.quantity,
          sourceType: dto.sourceType,
          sourceDocumentId: dto.sourceDocumentId,
          reason: dto.reason,
        },
        InventoryMovementType.RECEIPT,
        dto.quantity,
        actor,
      );
    }

    if (!intakeFieldsProvided(dto)) {
      throw new BadRequestException(
        'Variant seçin və ya yeni məhsul üçün brend və model daxil edin',
      );
    }

    const brandName = dto.intakeBrandName?.trim() ?? '';
    const modelName = dto.intakeModelName?.trim() ?? '';
    const barcode = dto.intakeBarcode?.trim() ?? '';
    if (brandName === '' || modelName === '') {
      throw new BadRequestException(
        'Yeni məhsul qəbulu üçün brend və model tələb olunur',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const intakeRequiredSpecs = parseProductRequiredSpecs(
            dto.intakeRequiredSpecs,
          );
          const variantDetails =
            intakeRequiredSpecs.length === 0
              ? undefined
              : {
                  sku: dto.intakeVariantSku?.trim() ?? '',
                  name: buildIntakeVariantNameFromRequiredSpecs(
                    intakeRequiredSpecs,
                    modelName,
                  ),
                  attributes:
                    buildIntakeVariantAttributesFromRequiredSpecs(
                      intakeRequiredSpecs,
                    ),
                };

          const variantId = await resolveIntakeVariantId(
            tx,
            {
              brandName,
              modelName,
              barcode,
              ...(dto.intakeCategoryId === undefined
                ? {}
                : { categoryId: dto.intakeCategoryId }),
              ...(variantDetails === undefined ? {} : { variantDetails }),
            },
            actor,
          );
          return this.changeWithinTransaction(
            tx,
            {
              variantId,
              locationId: dto.locationId,
              quantity: dto.quantity,
              sourceType: dto.sourceType,
              sourceDocumentId: dto.sourceDocumentId,
              reason: dto.reason,
            },
            InventoryMovementType.RECEIPT,
            dto.quantity,
            actor,
          );
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
        async (tx) =>
          this.changeWithinTransaction(tx, dto, type, delta, actor),
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

  private async changeWithinTransaction(
    tx: Prisma.TransactionClient,
    dto: MovementDto,
    type: InventoryMovementType,
    delta: number,
    actor: StaffPrincipal,
  ) {
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
    if (variant === null) throw new BadRequestException('Unknown variant');
    if (location === null || !location.active)
      throw new BadRequestException('Inactive or unknown location');
    const balance = await this.lockBalance(tx, dto.variantId, dto.locationId);
    let nextOnHand: number;
    try {
      nextOnHand = applyOnHandDelta(
        { onHand: balance.on_hand, reserved: balance.reserved },
        delta,
      ).onHand;
    } catch {
      throw new ConflictException('Negative available stock is forbidden');
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
    if (delta > 0) {
      await this.availability.fulfillStockAlertsForVariant(tx, dto.variantId);
    }
    return { balance: updated, movement };
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
  receipt(@Body() dto: ReceiptDto, @CurrentStaff() actor: StaffPrincipal) {
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
  imports: [PrismaModule, AuthModule, ProductAvailabilityModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
