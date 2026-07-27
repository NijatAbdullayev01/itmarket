import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import type {
  Page,
  StaffCreditApplicationSummaryContract,
} from '@itmarket/contracts';
import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
  type StaffPrincipal,
} from '../auth/auth.module';
import { formatProductDisplayTitle } from '../catalog/format-product-display-title';
import {
  CreditApplicationStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { canTransitionCreditApplicationStatus } from './credit-application-status.domain';

export class StaffCreditApplicationsListQuery {
  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: CreditApplicationStatus,
  })
  @IsOptional()
  @IsEnum(CreditApplicationStatus)
  status?: CreditApplicationStatus;

  @ApiPropertyOptional({
    description: 'Page size',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @ApiPropertyOptional({
    description: 'Cursor (application id) for the next page',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class UpdateStaffCreditApplicationDto {
  @ApiProperty({
    description:
      'Next status. Allowed: PENDING→PROCESSING|REJECTED; PROCESSING→APPROVED|REJECTED',
    enum: CreditApplicationStatus,
    example: CreditApplicationStatus.PROCESSING,
  })
  @IsEnum(CreditApplicationStatus)
  status!: CreditApplicationStatus;
}

const staffCreditApplicationSelect = {
  id: true,
  status: true,
  finCode: true,
  phone: true,
  email: true,
  quantity: true,
  amount: true,
  productId: true,
  variantId: true,
  customerId: true,
  cartId: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      name: true,
      slug: true,
      brand: { select: { name: true } },
    },
  },
  variant: {
    select: {
      name: true,
      sku: true,
      attributes: true,
    },
  },
  customer: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.CreditApplicationSelect;

type StaffCreditApplicationRow = Prisma.CreditApplicationGetPayload<{
  select: typeof staffCreditApplicationSelect;
}>;

function formatPersonDisplayName(
  person: { firstName: string | null; lastName: string | null } | null,
): string | null {
  if (person === null) {
    return null;
  }
  const parts = [person.firstName, person.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : null;
}

function mapStaffCreditApplication(
  row: StaffCreditApplicationRow,
): StaffCreditApplicationSummaryContract {
  return {
    id: row.id,
    status: row.status,
    finCode: row.finCode,
    phone: row.phone,
    email: row.email,
    quantity: row.quantity,
    amount: row.amount.toFixed(2),
    currency: 'AZN',
    productId: row.productId,
    productName: formatProductDisplayTitle(row.product, row.variant),
    productSlug: row.product.slug,
    variantId: row.variantId,
    variantName: row.variant.name,
    variantSku: row.variant.sku,
    customerId: row.customerId,
    customerName: formatPersonDisplayName(row.customer),
    cartId: row.cartId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
class StaffCreditApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  private creditStatusTopic(
    status: CreditApplicationStatus,
  ): string | null {
    if (status === CreditApplicationStatus.APPROVED) {
      return 'credit-application.approved';
    }
    if (status === CreditApplicationStatus.REJECTED) {
      return 'credit-application.rejected';
    }
    if (status === CreditApplicationStatus.PROCESSING) {
      return 'credit-application.processing';
    }
    return null;
  }

  async list(
    query: StaffCreditApplicationsListQuery,
  ): Promise<Page<StaffCreditApplicationSummaryContract>> {
    const where: Prisma.CreditApplicationWhereInput = {
      ...(query.status === undefined ? {} : { status: query.status }),
    };

    const rows = await this.prisma.creditApplication.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: staffCreditApplicationSelect,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: pageRows.map(mapStaffCreditApplication),
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }

  async updateStatus(
    id: string,
    status: CreditApplicationStatus,
    actor: StaffPrincipal,
  ): Promise<StaffCreditApplicationSummaryContract> {
    const existing = await this.prisma.creditApplication.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (existing === null) {
      throw new NotFoundException({
        code: 'CREDIT_APPLICATION_NOT_FOUND',
        message: 'Kredit müraciəti tapılmadı',
      });
    }

    if (existing.status === status) {
      const unchanged = await this.prisma.creditApplication.findUniqueOrThrow({
        where: { id },
        select: staffCreditApplicationSelect,
      });
      return mapStaffCreditApplication(unchanged);
    }

    if (!canTransitionCreditApplicationStatus(existing.status, status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Status keçidi icazəli deyil: ${existing.status} → ${status}`,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.creditApplication.update({
        where: { id },
        data: { status },
        select: {
          ...staffCreditApplicationSelect,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'credit-application.status-changed',
          entityType: 'credit_application',
          entityId: row.id,
          before: { status: existing.status },
          after: { status: row.status },
        },
      });

      const topic = this.creditStatusTopic(row.status);
      const recipientEmail = row.email ?? row.customer?.email ?? null;
      if (topic !== null && recipientEmail !== null) {
        await tx.notificationOutbox.create({
          data: {
            topic,
            referenceType: 'credit_application',
            referenceId: row.id,
            payload: {
              email: recipientEmail,
              status: row.status,
              productName: formatProductDisplayTitle(row.product, row.variant),
              phone: row.phone,
            },
          },
        });
      }

      return row;
    });

    return mapStaffCreditApplication(updated);
  }
}

@ApiTags('credit-applications')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CREDIT_APPLICATIONS_MANAGE)
@Controller({ path: 'credit-applications', version: '1' })
class StaffCreditApplicationsController {
  constructor(
    private readonly creditApplications: StaffCreditApplicationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List storefront credit applications for staff review',
  })
  @ApiOkResponse({ description: 'Paginated credit application summaries' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing credit-applications.manage permission',
  })
  list(
    @Query() query: StaffCreditApplicationsListQuery,
  ): Promise<Page<StaffCreditApplicationSummaryContract>> {
    return this.creditApplications.list(query);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update credit application status with allowed transitions',
  })
  @ApiOkResponse({ description: 'Updated credit application summary' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing credit-applications.manage permission',
  })
  @ApiNotFoundResponse({ description: 'Credit application not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffCreditApplicationDto,
    @CurrentStaff() staff: StaffPrincipal,
  ): Promise<StaffCreditApplicationSummaryContract> {
    return this.creditApplications.updateStatus(id, dto.status, staff);
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StaffCreditApplicationsController],
  providers: [StaffCreditApplicationsService],
})
export class CreditApplicationsModule {}
