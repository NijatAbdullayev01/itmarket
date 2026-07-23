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
import {
  PosBusinessDayService,
  SOLE_REGISTER_CODE,
} from './pos-business-day.service';
import { bakuDayKey } from '../common/baku-timezone';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessDay: PosBusinessDayService,
  ) {}

  private parseMoney(value: string, field: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${field} must be a valid AZN amount`);
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
      businessDate: bakuDayKey(shift.businessDate),
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
      const existingCount = await tx.cashRegister.count();
      if (existingCount > 0) {
        throw new ConflictException(
          `Only one cash register is allowed (use ${SOLE_REGISTER_CODE})`,
        );
      }
      if (dto.code !== SOLE_REGISTER_CODE) {
        throw new BadRequestException(
          `Sole cash register code must be ${SOLE_REGISTER_CODE}`,
        );
      }
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
    const dayShift = await this.prisma.$transaction(
      async (tx) => this.businessDay.ensureTodayShift(actor, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.formatShift(await this.loadShift(this.prisma, dayShift.id));
  }

  /** Legacy/admin: ensures today's implicit business-day session (opening float optional). */
  async openShift(dto: OpenShiftDto, actor: StaffPrincipal) {
    const openingFloat = this.parseMoney(dto.openingFloat, 'openingFloat');
    return this.prisma.$transaction(
      async (tx) => {
        const sole = await this.businessDay.ensureSoleRegister(tx);
        if (dto.registerId !== sole.id) {
          throw new BadRequestException(
            'Only the sole active cash register can open a business day',
          );
        }
        const shift = await this.businessDay.ensureTodayShift(actor, tx);
        if (openingFloat.gt(0)) {
          const alreadyHasFloat = await tx.cashMovement.findFirst({
            where: {
              shiftId: shift.id,
              type: CashMovementType.OPENING_FLOAT,
            },
            select: { id: true },
          });
          if (alreadyHasFloat === null) {
            await tx.cashMovement.create({
              data: {
                shiftId: shift.id,
                type: CashMovementType.OPENING_FLOAT,
                amount: openingFloat,
                reason: 'Opening float recorded',
                actorStaffId: actor.id,
              },
            });
            await tx.cashShift.update({
              where: { id: shift.id },
              data: {
                openingFloat,
                expectedCash: openingFloat,
              },
            });
          }
        }
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
  providers: [CashRegisterService, PosBusinessDayService],
  exports: [CashRegisterService, PosBusinessDayService],
})
export class CashRegisterModule {}
