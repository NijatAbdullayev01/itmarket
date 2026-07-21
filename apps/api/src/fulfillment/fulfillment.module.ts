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
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { resolveInventoryLocationDisplayName } from '@itmarket/contracts';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  type StaffPrincipal,
  StaffAuthGuard,
} from '../auth/auth.module';
import { Prisma } from '../generated/prisma/client';
import { LocationType } from '../generated/prisma/enums';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { withCanonicalLocationName } from '../inventory/format-location-display-name';

const ZONE_CODE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const PICKUP_CODE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const AZN_MONEY = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

class DeliveryZoneDto {
  @IsString()
  @Matches(ZONE_CODE)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(AZN_MONEY)
  fee!: string;

  @IsOptional()
  @IsString()
  @Matches(AZN_MONEY)
  freeDeliveryMinimum?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedMinDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedMaxDays!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  coveredAdministrativeAreas!: string[];

  @IsOptional()
  @IsBoolean()
  active = true;
}

class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(AZN_MONEY)
  fee?: string;

  @IsOptional()
  @IsString()
  @Matches(AZN_MONEY)
  freeDeliveryMinimum?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedMinDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedMaxDays?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  coveredAdministrativeAreas?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class PickupLocationDto {
  @IsString()
  @Matches(PICKUP_CODE)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  locationId!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  addressLine!: string;

  @IsObject()
  workingHours!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactLabel?: string;

  @IsOptional()
  @IsBoolean()
  active = true;
}

class UpdatePickupLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  addressLine?: string;

  @IsOptional()
  @IsObject()
  workingHours?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactLabel?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Injectable()
export class FulfillmentService {
  constructor(private readonly prisma: PrismaService) {}

  private parseMoney(value: string, field: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${field} must be a valid AZN amount`);
    }
  }

  private assertDeliveryWindow(minDays: number, maxDays: number) {
    if (minDays > maxDays) {
      throw new BadRequestException(
        'estimatedMinDays cannot exceed estimatedMaxDays',
      );
    }
  }

  private normalizeAreas(areas: string[]): string[] {
    const normalized = areas
      .map((area) => area.trim())
      .filter((area) => area.length > 0);
    if (normalized.length === 0) {
      throw new BadRequestException(
        'coveredAdministrativeAreas must contain at least one area',
      );
    }
    return [...new Set(normalized)];
  }

  private async recordAudit(
    actor: StaffPrincipal,
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorType: 'staff',
        actorId: actor.id,
        action,
        entityType,
        entityId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
      },
    });
  }

  listDeliveryZones() {
    return this.prisma.deliveryZone.findMany({
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
    });
  }

  async createDeliveryZone(dto: DeliveryZoneDto, actor: StaffPrincipal) {
    this.assertDeliveryWindow(dto.estimatedMinDays, dto.estimatedMaxDays);
    const areas = this.normalizeAreas(dto.coveredAdministrativeAreas);
    try {
      const zone = await this.prisma.deliveryZone.create({
        data: {
          code: dto.code.toUpperCase(),
          name: dto.name.trim(),
          fee: this.parseMoney(dto.fee, 'fee'),
          freeDeliveryMinimum:
            dto.freeDeliveryMinimum === undefined
              ? null
              : this.parseMoney(dto.freeDeliveryMinimum, 'freeDeliveryMinimum'),
          estimatedMinDays: dto.estimatedMinDays,
          estimatedMaxDays: dto.estimatedMaxDays,
          coveredAdministrativeAreas: areas,
          active: dto.active,
        },
      });
      await this.recordAudit(
        actor,
        'fulfillment.delivery-zone.created',
        'delivery_zone',
        zone.id,
        null,
        zone,
      );
      return zone;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Delivery zone code already exists');
      }
      throw error;
    }
  }

  async updateDeliveryZone(
    id: string,
    dto: UpdateDeliveryZoneDto,
    actor: StaffPrincipal,
  ) {
    const existing = await this.prisma.deliveryZone.findUniqueOrThrow({
      where: { id },
    });
    const estimatedMinDays = dto.estimatedMinDays ?? existing.estimatedMinDays;
    const estimatedMaxDays = dto.estimatedMaxDays ?? existing.estimatedMaxDays;
    this.assertDeliveryWindow(estimatedMinDays, estimatedMaxDays);

    const updated = await this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.fee === undefined
          ? {}
          : { fee: this.parseMoney(dto.fee, 'fee') }),
        ...(dto.freeDeliveryMinimum === undefined
          ? {}
          : {
              freeDeliveryMinimum:
                dto.freeDeliveryMinimum === null
                  ? null
                  : this.parseMoney(
                      dto.freeDeliveryMinimum,
                      'freeDeliveryMinimum',
                    ),
            }),
        ...(dto.estimatedMinDays === undefined
          ? {}
          : { estimatedMinDays: dto.estimatedMinDays }),
        ...(dto.estimatedMaxDays === undefined
          ? {}
          : { estimatedMaxDays: dto.estimatedMaxDays }),
        ...(dto.coveredAdministrativeAreas === undefined
          ? {}
          : {
              coveredAdministrativeAreas: this.normalizeAreas(
                dto.coveredAdministrativeAreas,
              ),
            }),
        ...(dto.active === undefined ? {} : { active: dto.active }),
      },
    });
    await this.recordAudit(
      actor,
      'fulfillment.delivery-zone.updated',
      'delivery_zone',
      updated.id,
      existing,
      updated,
    );
    return updated;
  }

  async listPickupLocations() {
    const rows = await this.prisma.pickupLocation.findMany({
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
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
    });
    return rows.map((pickup) => ({
      ...pickup,
      name: resolveInventoryLocationDisplayName(pickup) ?? pickup.name,
      location: withCanonicalLocationName(pickup.location),
    }));
  }

  private async assertStoreLocation(locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        type: LocationType.STORE,
        active: true,
      },
    });
    if (location === null) {
      throw new BadRequestException(
        'Pickup location must reference an active STORE location',
      );
    }
    return location;
  }

  async createPickupLocation(dto: PickupLocationDto, actor: StaffPrincipal) {
    await this.assertStoreLocation(dto.locationId);
    try {
      const pickup = await this.prisma.pickupLocation.create({
        data: {
          code: dto.code.toUpperCase(),
          name: dto.name.trim(),
          locationId: dto.locationId,
          addressLine: dto.addressLine.trim(),
          workingHours: dto.workingHours as Prisma.InputJsonValue,
          contactLabel: dto.contactLabel?.trim() ?? null,
          active: dto.active,
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
      await this.recordAudit(
        actor,
        'fulfillment.pickup-location.created',
        'pickup_location',
        pickup.id,
        null,
        pickup,
      );
      return pickup;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Pickup location code already exists');
      }
      throw error;
    }
  }

  async updatePickupLocation(
    id: string,
    dto: UpdatePickupLocationDto,
    actor: StaffPrincipal,
  ) {
    const existing = await this.prisma.pickupLocation.findUniqueOrThrow({
      where: { id },
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
    if (dto.locationId !== undefined) {
      await this.assertStoreLocation(dto.locationId);
    }
    const updated = await this.prisma.pickupLocation.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.locationId === undefined ? {} : { locationId: dto.locationId }),
        ...(dto.addressLine === undefined
          ? {}
          : { addressLine: dto.addressLine.trim() }),
        ...(dto.workingHours === undefined
          ? {}
          : { workingHours: dto.workingHours as Prisma.InputJsonValue }),
        ...(dto.contactLabel === undefined
          ? {}
          : { contactLabel: dto.contactLabel?.trim() ?? null }),
        ...(dto.active === undefined ? {} : { active: dto.active }),
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
    await this.recordAudit(
      actor,
      'fulfillment.pickup-location.updated',
      'pickup_location',
      updated.id,
      existing,
      updated,
    );
    return updated;
  }
}

@ApiTags('fulfillment')
@ApiCookieAuth('itmarket_staff_access')
@Controller({ path: 'fulfillment', version: '1' })
@UseGuards(StaffAuthGuard, PermissionsGuard)
export class FulfillmentController {
  constructor(private readonly fulfillment: FulfillmentService) {}

  @Get('delivery-zones')
  @RequirePermissions(Permission.ORDERS_READ)
  listDeliveryZones() {
    return this.fulfillment.listDeliveryZones();
  }

  @Post('delivery-zones')
  @RequirePermissions(Permission.FULFILLMENT_WRITE)
  createDeliveryZone(
    @Body() dto: DeliveryZoneDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.fulfillment.createDeliveryZone(dto, actor);
  }

  @Patch('delivery-zones/:id')
  @RequirePermissions(Permission.FULFILLMENT_WRITE)
  updateDeliveryZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryZoneDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.fulfillment.updateDeliveryZone(id, dto, actor);
  }

  @Get('pickup-locations')
  @RequirePermissions(Permission.ORDERS_READ)
  listPickupLocations() {
    return this.fulfillment.listPickupLocations();
  }

  @Post('pickup-locations')
  @RequirePermissions(Permission.FULFILLMENT_WRITE)
  createPickupLocation(
    @Body() dto: PickupLocationDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.fulfillment.createPickupLocation(dto, actor);
  }

  @Patch('pickup-locations/:id')
  @RequirePermissions(Permission.FULFILLMENT_WRITE)
  updatePickupLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePickupLocationDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.fulfillment.updatePickupLocation(id, dto, actor);
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [FulfillmentService],
  controllers: [FulfillmentController],
  exports: [FulfillmentService],
})
export class FulfillmentModule {}
