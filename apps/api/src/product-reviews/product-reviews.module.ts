import {
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
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type {
  Page,
  StaffProductReviewSummaryContract,
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
import { Prisma } from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export class StaffProductReviewsListQuery {
  @ApiPropertyOptional({
    description: 'Filter by published state',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): boolean | undefined => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  published?: boolean;

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
    description: 'Cursor (review id) for the next page',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class UpdateStaffProductReviewDto {
  @ApiProperty({
    description: 'Whether the review is visible on the storefront',
    example: true,
  })
  @IsBoolean()
  published!: boolean;
}

const staffProductReviewSelect = {
  id: true,
  published: true,
  rating: true,
  comment: true,
  productId: true,
  variantId: true,
  customerId: true,
  orderId: true,
  orderItemId: true,
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
} satisfies Prisma.ProductReviewSelect;

type StaffProductReviewRow = Prisma.ProductReviewGetPayload<{
  select: typeof staffProductReviewSelect;
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

function mapStaffProductReview(
  row: StaffProductReviewRow,
): StaffProductReviewSummaryContract {
  return {
    id: row.id,
    published: row.published,
    rating: row.rating,
    comment: row.comment,
    productId: row.productId,
    productName: formatProductDisplayTitle(row.product, row.variant),
    productSlug: row.product.slug,
    variantId: row.variantId,
    variantName: row.variant.name,
    variantSku: row.variant.sku,
    customerId: row.customerId,
    customerName: formatPersonDisplayName(row.customer),
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
class StaffProductReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: StaffProductReviewsListQuery,
  ): Promise<Page<StaffProductReviewSummaryContract>> {
    const where: Prisma.ProductReviewWhereInput = {
      ...(query.published === undefined ? {} : { published: query.published }),
    };

    const rows = await this.prisma.productReview.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: staffProductReviewSelect,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: pageRows.map(mapStaffProductReview),
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }

  async updatePublished(
    id: string,
    published: boolean,
    actor: StaffPrincipal,
  ): Promise<StaffProductReviewSummaryContract> {
    const existing = await this.prisma.productReview.findUnique({
      where: { id },
      select: { id: true, published: true },
    });
    if (existing === null) {
      throw new NotFoundException({
        code: 'PRODUCT_REVIEW_NOT_FOUND',
        message: 'Məhsul rəyi tapılmadı',
      });
    }

    if (existing.published === published) {
      const unchanged = await this.prisma.productReview.findUniqueOrThrow({
        where: { id },
        select: staffProductReviewSelect,
      });
      return mapStaffProductReview(unchanged);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.productReview.update({
        where: { id },
        data: { published },
        select: staffProductReviewSelect,
      });

      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'product-review.published-changed',
          entityType: 'product_review',
          entityId: row.id,
          before: { published: existing.published },
          after: { published: row.published },
        },
      });

      return row;
    });

    return mapStaffProductReview(updated);
  }
}

@ApiTags('product-reviews')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CATALOG_WRITE)
@Controller({ path: 'product-reviews', version: '1' })
class StaffProductReviewsController {
  constructor(private readonly productReviews: StaffProductReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List product reviews for staff moderation' })
  @ApiOkResponse({ description: 'Paginated product review summaries' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing catalog.write permission',
  })
  list(
    @Query() query: StaffProductReviewsListQuery,
  ): Promise<Page<StaffProductReviewSummaryContract>> {
    return this.productReviews.list(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Publish or unpublish a product review' })
  @ApiOkResponse({ description: 'Updated product review summary' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({
    description: 'Missing catalog.write permission',
  })
  @ApiNotFoundResponse({ description: 'Product review not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffProductReviewDto,
    @CurrentStaff() staff: StaffPrincipal,
  ): Promise<StaffProductReviewSummaryContract> {
    return this.productReviews.updatePublished(id, dto.published, staff);
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StaffProductReviewsController],
  providers: [StaffProductReviewsService],
})
export class ProductReviewsModule {}
