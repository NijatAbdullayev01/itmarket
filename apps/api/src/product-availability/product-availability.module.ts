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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  IsEmail,
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
import { Type } from 'class-transformer';
import type {
  Page,
  StaffAvailabilityRequestNavCountsContract,
  StaffAvailabilityRequestSummaryContract,
} from '@itmarket/contracts';
import {
  AuthModule,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
} from '../auth/auth.module';
import {
  CatalogStatus,
  Prisma,
  ProductAvailabilityRequestStatus,
  ProductAvailabilityRequestType,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { formatProductDisplayTitle } from '../catalog/format-product-display-title';

export class ProductAvailabilityRequestDto {
  @IsEnum(ProductAvailabilityRequestType)
  type!: ProductAvailabilityRequestType;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  variantId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

@Injectable()
export class ProductAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(dto: ProductAvailabilityRequestDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        productId: dto.productId,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      select: {
        id: true,
        name: true,
        attributes: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            brand: { select: { name: true } },
          },
        },
        balances: { select: { onHand: true, reserved: true } },
      },
    });
    if (variant === null) {
      throw new BadRequestException('Məhsul variantı tapılmadı');
    }

    const available = variant.balances.reduce(
      (sum, balance) =>
        sum + Math.max(0, balance.onHand - balance.reserved),
      0,
    );

    if (dto.type === ProductAvailabilityRequestType.STOCK_ALERT) {
      if (available > 0) {
        throw new BadRequestException('Məhsul artıq stokdadır');
      }
    } else if (available > 0) {
      throw new BadRequestException(
        'Ön sifariş yalnız stokda olmayan məhsullar üçün mümkündür',
      );
    }

    const phone = dto.phone.trim();
    const email =
      dto.email === undefined || dto.email.trim() === ''
        ? null
        : dto.email.trim().toLowerCase();
    const quantity = dto.quantity ?? 1;
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    if (firstName.length < 2 || lastName.length < 2) {
      throw new BadRequestException('Ad və soyad tələb olunur');
    }

    const existing = await this.prisma.productAvailabilityRequest.findFirst({
      where: {
        variantId: dto.variantId,
        phone,
        type: dto.type,
        status: ProductAvailabilityRequestStatus.PENDING,
      },
      select: { id: true, status: true, type: true },
    });
    if (existing !== null) {
      return {
        id: existing.id,
        status: existing.status,
        type: existing.type,
        duplicate: true as const,
      };
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productAvailabilityRequest.create({
        data: {
          type: dto.type,
          firstName,
          lastName,
          phone,
          email,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity,
          ...(dto.customerId === undefined ? {} : { customerId: dto.customerId }),
        },
        select: {
          id: true,
          status: true,
          type: true,
        },
      });

      const topic =
        dto.type === ProductAvailabilityRequestType.PREORDER
          ? 'storefront.preorder.requested'
          : 'storefront.stock_alert.requested';

      await tx.notificationOutbox.create({
        data: {
          topic,
          referenceType: 'product_availability_request',
          referenceId: created.id,
          payload: {
            requestId: created.id,
            type: dto.type,
            firstName,
            lastName,
            phone,
            email,
            productId: variant.product.id,
            productName: formatProductDisplayTitle(variant.product, variant),
            productSlug: variant.product.slug,
            variantId: variant.id,
            variantName: variant.name,
            quantity,
            customerId: dto.customerId ?? null,
          },
        },
      });

      return created;
    });

    return {
      id: request.id,
      status: request.status,
      type: request.type,
      duplicate: false as const,
    };
  }

  async fulfillStockAlertsForVariant(
    tx: Prisma.TransactionClient,
    variantId: string,
  ) {
    const balances = await tx.inventoryBalance.findMany({
      where: { variantId },
      select: { onHand: true, reserved: true },
    });
    const available = balances.reduce(
      (sum, balance) =>
        sum + Math.max(0, balance.onHand - balance.reserved),
      0,
    );
    if (available <= 0) {
      return 0;
    }

    const pendingAlerts = await tx.productAvailabilityRequest.findMany({
      where: {
        variantId,
        type: ProductAvailabilityRequestType.STOCK_ALERT,
        status: ProductAvailabilityRequestStatus.PENDING,
      },
      include: {
        product: {
          select: { name: true, slug: true, brand: { select: { name: true } } },
        },
        variant: { select: { name: true, attributes: true } },
      },
    });
    if (pendingAlerts.length === 0) {
      return 0;
    }

    const fulfilledAt = new Date();
    for (const alert of pendingAlerts) {
      await tx.productAvailabilityRequest.update({
        where: { id: alert.id },
        data: {
          status: ProductAvailabilityRequestStatus.FULFILLED,
          fulfilledAt,
        },
      });
      await tx.notificationOutbox.create({
        data: {
          topic: 'storefront.stock_alert.fulfilled',
          referenceType: 'product_availability_request',
          referenceId: alert.id,
          payload: {
            requestId: alert.id,
            phone: alert.phone,
            email: alert.email,
            productId: alert.productId,
            productName: formatProductDisplayTitle(alert.product, alert.variant),
            productSlug: alert.product.slug,
            variantId: alert.variantId,
            variantName: alert.variant.name,
            available,
          },
        },
      });
    }

    return pendingAlerts.length;
  }
}

class StaffAvailabilityRequestsListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @IsEnum(ProductAvailabilityRequestType)
  type?: ProductAvailabilityRequestType;

  @IsOptional()
  @IsEnum(ProductAvailabilityRequestStatus)
  status?: ProductAvailabilityRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

class UpdateStaffAvailabilityRequestDto {
  @IsEnum(ProductAvailabilityRequestStatus)
  status!: ProductAvailabilityRequestStatus;
}

const staffAvailabilityRequestSelect = {
  id: true,
  type: true,
  status: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  quantity: true,
  productId: true,
  variantId: true,
  customerId: true,
  fulfilledAt: true,
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
} satisfies Prisma.ProductAvailabilityRequestSelect;

type StaffAvailabilityRequestRow = Prisma.ProductAvailabilityRequestGetPayload<{
  select: typeof staffAvailabilityRequestSelect;
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

function mapStaffAvailabilityRequest(
  row: StaffAvailabilityRequestRow,
): StaffAvailabilityRequestSummaryContract {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    phone: row.phone,
    email: row.email,
    quantity: row.quantity,
    productId: row.productId,
    productName: formatProductDisplayTitle(row.product, row.variant),
    productSlug: row.product.slug,
    variantId: row.variantId,
    variantName: row.variant.name,
    variantSku: row.variant.sku,
    customerId: row.customerId,
    customerName:
      formatPersonDisplayName({
        firstName: row.firstName,
        lastName: row.lastName,
      }) ?? formatPersonDisplayName(row.customer),
    fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
class StaffAvailabilityRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async counts(): Promise<StaffAvailabilityRequestNavCountsContract> {
    const [pendingPreorders, pendingStockAlerts] = await Promise.all([
      this.prisma.productAvailabilityRequest.count({
        where: {
          type: ProductAvailabilityRequestType.PREORDER,
          status: ProductAvailabilityRequestStatus.PENDING,
        },
      }),
      this.prisma.productAvailabilityRequest.count({
        where: {
          type: ProductAvailabilityRequestType.STOCK_ALERT,
          status: ProductAvailabilityRequestStatus.PENDING,
        },
      }),
    ]);

    return { pendingPreorders, pendingStockAlerts };
  }

  async list(
    query: StaffAvailabilityRequestsListQuery,
  ): Promise<Page<StaffAvailabilityRequestSummaryContract>> {
    const search = query.search?.trim();
    const where: Prisma.ProductAvailabilityRequestWhereInput = {
      ...(query.type === undefined ? {} : { type: query.type }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(search && search.length > 0
        ? {
            OR: [
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' as const } },
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
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
              {
                variant: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                variant: {
                  sku: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.productAvailabilityRequest.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: staffAvailabilityRequestSelect,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: pageRows.map(mapStaffAvailabilityRequest),
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }

  async updateStatus(
    id: string,
    status: ProductAvailabilityRequestStatus,
  ): Promise<StaffAvailabilityRequestSummaryContract> {
    if (status === ProductAvailabilityRequestStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: 'Sorğunu yenidən gözləyən statusuna qaytarmaq olmaz',
      });
    }

    const existing = await this.prisma.productAvailabilityRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (existing === null) {
      throw new NotFoundException({
        code: 'AVAILABILITY_REQUEST_NOT_FOUND',
        message: 'Sorğu tapılmadı',
      });
    }
    if (existing.status !== ProductAvailabilityRequestStatus.PENDING) {
      throw new BadRequestException({
        code: 'REQUEST_ALREADY_CLOSED',
        message: 'Bu sorğu artıq bağlanıb',
      });
    }

    const fulfilledAt =
      status === ProductAvailabilityRequestStatus.FULFILLED
        ? new Date()
        : null;

    const updated = await this.prisma.productAvailabilityRequest.update({
      where: { id },
      data: { status, fulfilledAt },
      select: staffAvailabilityRequestSelect,
    });

    return mapStaffAvailabilityRequest(updated);
  }
}

@ApiTags('product-availability-requests')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@Controller({ path: 'product-availability-requests', version: '1' })
class StaffAvailabilityRequestsController {
  constructor(
    private readonly requests: StaffAvailabilityRequestsService,
  ) {}

  @Get('counts')
  @RequirePermissions(Permission.INQUIRIES_READ)
  @ApiOperation({
    summary: 'Pending inquiry counts for backoffice navigation',
  })
  @ApiOkResponse({ description: 'Pending preorder and stock-alert totals' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({ description: 'Missing inquiries.read permission' })
  counts(): Promise<StaffAvailabilityRequestNavCountsContract> {
    return this.requests.counts();
  }

  @Get()
  @RequirePermissions(Permission.INQUIRIES_READ)
  @ApiOperation({
    summary: 'List storefront product availability requests (preorder / stock alert)',
  })
  @ApiOkResponse({ description: 'Paginated inquiry summaries' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({ description: 'Missing inquiries.read permission' })
  list(
    @Query() query: StaffAvailabilityRequestsListQuery,
  ): Promise<Page<StaffAvailabilityRequestSummaryContract>> {
    return this.requests.list(query);
  }

  @Patch(':id')
  @RequirePermissions(Permission.INQUIRIES_WRITE)
  @ApiOperation({
    summary: 'Update inquiry status (fulfill or cancel a pending request)',
  })
  @ApiOkResponse({ description: 'Updated inquiry summary' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({ description: 'Missing inquiries.write permission' })
  @ApiNotFoundResponse({ description: 'Inquiry not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffAvailabilityRequestDto,
  ): Promise<StaffAvailabilityRequestSummaryContract> {
    return this.requests.updateStatus(id, dto.status);
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StaffAvailabilityRequestsController],
  providers: [ProductAvailabilityService, StaffAvailabilityRequestsService],
  exports: [ProductAvailabilityService],
})
export class ProductAvailabilityModule {}
