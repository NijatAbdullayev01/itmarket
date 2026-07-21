import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  hasPermissions,
  type StaffPrincipal,
  StaffAuthGuard,
} from '../auth/auth.module';
import { Prisma } from '../generated/prisma/client';
import {
  CashMovementType,
  CashShiftStatus,
  LocationType,
} from '../generated/prisma/enums';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { withCanonicalLocationName } from '../inventory/format-location-display-name';

const AZN_MONEY_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

class CashRegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  locationId!: string;

  @IsOptional()
  @IsBoolean()
  active = true;
}

class OpenShiftDto {
  @IsUUID()
  registerId!: string;

  @IsString()
  @Matches(AZN_MONEY_PATTERN)
  openingFloat!: string;
}

class CashMovementDto {
  @IsEnum(CashMovementType)
  type!: CashMovementType;

  @IsString()
  @Matches(AZN_MONEY_PATTERN)
  amount!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

class CloseShiftDto {
  @IsString()
  @Matches(AZN_MONEY_PATTERN)
  countedCash!: string;
}

const SHIFT_WITH_RELATIONS = {
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
  movements: { orderBy: { createdAt: 'asc' as const } },
  sales: {
    select: {
      id: true,
      grandTotal: true,
      paymentMethod: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.CashShiftInclude;

type ShiftWithRelations = Prisma.CashShiftGetPayload<{
  include: typeof SHIFT_WITH_RELATIONS;
}>;

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  private parseMoney(value: string, field: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${field} must be a valid AZN amount`);
    }
  }

  private assertShiftActor(
    shift: { staffUserId: string },
    actor: StaffPrincipal,
  ) {
    if (
      shift.staffUserId !== actor.id &&
      !hasPermissions(actor.permissions, [Permission.SHIFT_APPROVAL])
    ) {
      throw new ForbiddenException('The shift belongs to another cashier');
    }
  }

  private expectedCashFromMovements(
    movements: { type: CashMovementType; amount: Prisma.Decimal }[],
  ): Prisma.Decimal {
    return movements.reduce((sum, movement) => {
      if (
        movement.type === CashMovementType.CASH_OUT ||
        movement.type === CashMovementType.REFUND
      ) {
        return sum.sub(movement.amount);
      }
      return sum.add(movement.amount);
    }, new Prisma.Decimal(0));
  }

  private formatShift(shift: ShiftWithRelations) {
    const expectedCash =
      shift.status === CashShiftStatus.CLOSED
        ? shift.expectedCash
        : this.expectedCashFromMovements(
            shift.movements.map((movement) => ({
              type: movement.type,
              amount: movement.amount,
            })),
          );
    return {
      id: shift.id,
      status: shift.status,
      openingFloat: shift.openingFloat.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      countedCash: shift.countedCash?.toFixed(2) ?? null,
      discrepancy: shift.discrepancy?.toFixed(2) ?? null,
      openedAt: shift.openedAt.toISOString(),
      closingStartedAt: shift.closingStartedAt?.toISOString() ?? null,
      closedAt: shift.closedAt?.toISOString() ?? null,
      register: {
        id: shift.register.id,
        code: shift.register.code,
        name: shift.register.name,
        active: shift.register.active,
        location: withCanonicalLocationName({
          id: shift.register.location.id,
          code: shift.register.location.code,
          name: shift.register.location.name,
          type: shift.register.location.type,
          active: shift.register.location.active,
        }),
      },
      sales: shift.sales.map((sale) => ({
        id: sale.id,
        grandTotal: sale.grandTotal.toFixed(2),
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt.toISOString(),
      })),
      movements: shift.movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        amount: movement.amount.toFixed(2),
        reason: movement.reason,
        reference: movement.reference,
        createdAt: movement.createdAt.toISOString(),
      })),
    };
  }

  private loadShift(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<ShiftWithRelations> {
    return tx.cashShift.findUniqueOrThrow({
      where: { id },
      include: SHIFT_WITH_RELATIONS,
    });
  }

  listRegisters() {
    return this.prisma.cashRegister.findMany({
      include: {
        location: {
          select: { id: true, code: true, name: true, active: true },
        },
      },
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
    });
  }

  async createRegister(dto: CashRegisterDto, actor: StaffPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.location.findFirst({
        where: {
          id: dto.locationId,
          active: true,
          type: LocationType.STORE,
        },
      });
      if (location === null) {
        throw new BadRequestException(
          'Cash register must target an active STORE location',
        );
      }
      const created = await tx.cashRegister.create({ data: dto });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'cash-register.created',
          entityType: 'cash-register',
          entityId: created.id,
          after: {
            code: created.code,
            name: created.name,
            locationId: created.locationId,
            active: created.active,
          },
        },
      });
      return created;
    });
  }

  async activeShift(actor: StaffPrincipal) {
    const shift = await this.prisma.cashShift.findFirst({
      where: {
        staffUserId: actor.id,
        status: { in: [CashShiftStatus.OPEN, CashShiftStatus.CLOSING] },
      },
      orderBy: { openedAt: 'desc' },
      include: SHIFT_WITH_RELATIONS,
    });
    return shift === null ? null : this.formatShift(shift);
  }

  async openShift(dto: OpenShiftDto, actor: StaffPrincipal) {
    const openingFloat = this.parseMoney(dto.openingFloat, 'openingFloat');
    return this.prisma.$transaction(
      async (tx) => {
        const register = await tx.cashRegister.findFirst({
          where: {
            id: dto.registerId,
            active: true,
            location: {
              active: true,
              type: LocationType.STORE,
            },
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
        if (register === null) {
          throw new BadRequestException(
            'Register must be active and bound to an active STORE location',
          );
        }
        const conflictingRegisterShift = await tx.cashShift.findFirst({
          where: {
            registerId: dto.registerId,
            status: { in: [CashShiftStatus.OPEN, CashShiftStatus.CLOSING] },
          },
          select: { id: true },
        });
        if (conflictingRegisterShift !== null) {
          throw new ConflictException(
            'This register already has an active shift',
          );
        }
        const conflictingCashierShift = await tx.cashShift.findFirst({
          where: {
            staffUserId: actor.id,
            status: { in: [CashShiftStatus.OPEN, CashShiftStatus.CLOSING] },
          },
          select: { id: true },
        });
        if (conflictingCashierShift !== null) {
          throw new ConflictException('Cashier already has an active shift');
        }
        const shift = await tx.cashShift.create({
          data: {
            registerId: register.id,
            staffUserId: actor.id,
            openingFloat,
            expectedCash: openingFloat,
            movements: {
              create: {
                type: CashMovementType.OPENING_FLOAT,
                amount: openingFloat,
                reason: 'Opening float recorded',
                actorStaffId: actor.id,
              },
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: 'staff',
            actorId: actor.id,
            action: 'cash-shift.opened',
            entityType: 'cash-shift',
            entityId: shift.id,
            after: {
              registerId: register.id,
              locationId: register.locationId,
              openingFloat: openingFloat.toFixed(2),
            },
          },
        });
        return this.formatShift(await this.loadShift(tx, shift.id));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async addMovement(id: string, dto: CashMovementDto, actor: StaffPrincipal) {
    if (
      dto.type !== CashMovementType.CASH_IN &&
      dto.type !== CashMovementType.CASH_OUT
    ) {
      throw new BadRequestException(
        'Only CASH_IN and CASH_OUT can be created manually',
      );
    }
    const amount = this.parseMoney(dto.amount, 'amount');
    return this.prisma.$transaction(async (tx) => {
      const shift = await this.loadShift(tx, id);
      this.assertShiftActor(shift, actor);
      if (shift.status !== CashShiftStatus.OPEN) {
        throw new ConflictException('Only OPEN shifts accept cash movements');
      }
      const movement = await tx.cashMovement.create({
        data: {
          shiftId: shift.id,
          type: dto.type,
          amount,
          reason: dto.reason,
          reference: dto.reference ?? null,
          actorStaffId: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'cash-shift.movement-recorded',
          entityType: 'cash-movement',
          entityId: movement.id,
          after: {
            shiftId: shift.id,
            type: dto.type,
            amount: amount.toFixed(2),
            reason: dto.reason,
            reference: dto.reference ?? null,
          },
        },
      });
      return this.formatShift(await this.loadShift(tx, shift.id));
    });
  }

  async closeShift(id: string, dto: CloseShiftDto, actor: StaffPrincipal) {
    const countedCash = this.parseMoney(dto.countedCash, 'countedCash');
    return this.prisma.$transaction(async (tx) => {
      const shift = await this.loadShift(tx, id);
      this.assertShiftActor(shift, actor);
      if (shift.status !== CashShiftStatus.OPEN) {
        throw new ConflictException('Only OPEN shifts can be closed');
      }
      const expectedCash = this.expectedCashFromMovements(shift.movements);
      const discrepancy = countedCash.sub(expectedCash);
      const needsApproval = !discrepancy.isZero();
      const nextStatus =
        needsApproval &&
        !hasPermissions(actor.permissions, [Permission.SHIFT_APPROVAL])
          ? CashShiftStatus.CLOSING
          : CashShiftStatus.CLOSED;
      await tx.cashShift.update({
        where: { id: shift.id },
        data: {
          status: nextStatus,
          expectedCash,
          countedCash,
          discrepancy,
          closingStartedAt: new Date(),
          ...(nextStatus === CashShiftStatus.CLOSED
            ? { closedAt: new Date() }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action:
            nextStatus === CashShiftStatus.CLOSED
              ? 'cash-shift.closed'
              : 'cash-shift.close-submitted',
          entityType: 'cash-shift',
          entityId: shift.id,
          after: {
            expectedCash: expectedCash.toFixed(2),
            countedCash: countedCash.toFixed(2),
            discrepancy: discrepancy.toFixed(2),
            approvalRequired: nextStatus === CashShiftStatus.CLOSING,
          },
        },
      });
      return {
        approvalRequired: nextStatus === CashShiftStatus.CLOSING,
        shift: this.formatShift(await this.loadShift(tx, shift.id)),
      };
    });
  }

  async approveClose(id: string, actor: StaffPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const shift = await this.loadShift(tx, id);
      if (shift.status !== CashShiftStatus.CLOSING) {
        throw new ConflictException(
          'Shift is not waiting for discrepancy approval',
        );
      }
      await tx.cashShift.update({
        where: { id: shift.id },
        data: {
          status: CashShiftStatus.CLOSED,
          closedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'cash-shift.closed-approved',
          entityType: 'cash-shift',
          entityId: shift.id,
          after: {
            discrepancy: shift.discrepancy?.toFixed(2) ?? '0.00',
            approvalBy: actor.id,
          },
        },
      });
      return this.formatShift(await this.loadShift(tx, shift.id));
    });
  }
}

@ApiTags('cash-register')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CASH_SHIFT_OPEN)
@Controller({ path: 'cash-register', version: '1' })
class CashRegisterController {
  constructor(private readonly registers: CashRegisterService) {}

  @Get('registers')
  listRegisters() {
    return this.registers.listRegisters();
  }

  @Post('registers')
  @RequirePermissions(Permission.CASH_REGISTER_MANAGE)
  createRegister(
    @Body() dto: CashRegisterDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.registers.createRegister(dto, actor);
  }

  @Get('shifts/active')
  async activeShift(
    @CurrentStaff() actor: StaffPrincipal,
    @Res() response: Response,
  ) {
    const shift = await this.registers.activeShift(actor);
    return response.status(200).json(shift);
  }

  @Post('shifts/open')
  openShift(@Body() dto: OpenShiftDto, @CurrentStaff() actor: StaffPrincipal) {
    return this.registers.openShift(dto, actor);
  }

  @Post('shifts/:id/movements')
  @RequirePermissions(Permission.CASH_MOVEMENT_WRITE)
  addMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CashMovementDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.registers.addMovement(id, dto, actor);
  }

  @Post('shifts/:id/close')
  @RequirePermissions(Permission.CASH_SHIFT_CLOSE)
  closeShift(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseShiftDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.registers.closeShift(id, dto, actor);
  }

  @Post('shifts/:id/approve-close')
  @RequirePermissions(Permission.SHIFT_APPROVAL)
  approveClose(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.registers.approveClose(id, actor);
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
