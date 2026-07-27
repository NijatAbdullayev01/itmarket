import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type {
  CustomerAddressContract,
  CustomerNavCountsContract,
  CustomerOrderSummaryContract,
  CustomerProductReviewContract,
  CustomerProfileContract,
  OrderSummaryContract,
  Page,
  StaffCustomerSummaryContract,
  StaffUnregisteredCustomerSummaryContract,
} from '@itmarket/contracts';
import {
  ORDER_CANCEL_REASON_MAX_LENGTH,
  ORDER_CANCEL_REASON_MIN_LENGTH,
} from '@itmarket/contracts';
import {
  AuthModule,
  CurrentCustomer,
  CustomerAuthGuard,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
  type CustomerPrincipal,
} from '../auth/auth.module';
import {
  OrderStatus,
  PaymentStatus,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  mapOrderSummary,
  orderSummaryInclude,
} from '../orders/order-summary.mapper';
import { OrdersModule, OrdersService } from '../orders/orders.module';
import {
  buildGuestCustomersCountSql,
  buildGuestCustomersListSql,
  decodeGuestCustomerCursor,
  encodeGuestCustomerCursor,
  type GuestCustomerAggRow,
} from './guest-customers-query';

const PRODUCT_REVIEW_COMMENT_MAX_LENGTH = 1000;

class StaffCustomersListQuery {
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
  @IsString()
  @MaxLength(100)
  search?: string;
}

class StaffUnregisteredCustomersListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

class CancelCustomerOrderDto {
  @ApiProperty({
    description: 'Customer-provided cancellation reason (trimmed before validation)',
    minLength: ORDER_CANCEL_REASON_MIN_LENGTH,
    maxLength: ORDER_CANCEL_REASON_MAX_LENGTH,
    example: 'Sifarişi artıq istəmirəm',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(ORDER_CANCEL_REASON_MIN_LENGTH)
  @MaxLength(ORDER_CANCEL_REASON_MAX_LENGTH)
  reason!: string;
}

class CreateCustomerProductReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    maxLength: PRODUCT_REVIEW_COMMENT_MAX_LENGTH,
    example: 'Məhsul gözləntilərimi doğrultdu',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(PRODUCT_REVIEW_COMMENT_MAX_LENGTH)
  comment?: string;
}

class UpdateCustomerProfileDto {
  @ApiProperty({ minLength: 2, maxLength: 60, example: 'Aysel' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({ minLength: 2, maxLength: 60, example: 'Məmmədova' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName!: string;

  @ApiPropertyOptional({ minLength: 7, maxLength: 32, example: '+994501234567' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone?: string;
}

class CustomerAddressDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  administrativeArea?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class AttachCartDto {
  @IsUUID()
  cartId!: string;
}

@Injectable()
class CustomerAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  async getProfile(customerId: string): Promise<CustomerProfileContract> {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });
    return {
      id: customer.id,
      email: customer.email ?? '',
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    };
  }

  async updateProfile(
    customerId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileContract> {
    const phone = dto.phone?.trim() || null;
    if (phone !== null) {
      const conflict = await this.prisma.customer.findFirst({
        where: {
          phone,
          NOT: { id: customerId },
        },
        select: { id: true },
      });
      if (conflict !== null) {
        throw new BadRequestException('Bu telefon nömrəsi artıq istifadə olunur');
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email ?? '',
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
    };
  }

  async listOrders(
    customerId: string,
  ): Promise<CustomerOrderSummaryContract[]> {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        ...orderSummaryInclude,
        items: {
          select: {
            id: true,
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
            lineTotal: true,
            variant: {
              select: {
                product: {
                  select: {
                    id: true,
                    slug: true,
                  },
                },
              },
            },
            review: {
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc' as const,
          },
        },
      },
    });

    return orders.map((order) => {
      const summary = mapOrderSummary(order);
      return {
        ...summary,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          quantity: item.quantity,
          lineTotal: item.lineTotal.toFixed(2),
          productId: item.variant.product.id,
          productSlug: item.variant.product.slug,
          review:
            item.review === null
              ? null
              : {
                  id: item.review.id,
                  rating: item.review.rating,
                  comment: item.review.comment,
                  createdAt: item.review.createdAt.toISOString(),
                },
        })),
      };
    });
  }

  async createProductReview(
    customerId: string,
    orderId: string,
    orderItemId: string,
    dto: CreateCustomerProductReviewDto,
  ): Promise<CustomerProductReviewContract> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        items: {
          where: { id: orderItemId },
          select: {
            id: true,
            variantId: true,
            variant: {
              select: {
                id: true,
                productId: true,
              },
            },
            review: {
              select: { id: true },
            },
          },
          take: 1,
        },
      },
    });

    if (order === null) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    if (
      order.status !== OrderStatus.COMPLETED ||
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      throw new ConflictException(
        'Rəy yalnız tamamlanmış və ödənilmiş sifarişlər üçün mümkündür',
      );
    }

    const item = order.items[0];
    if (item === undefined) {
      throw new NotFoundException('Sifariş məhsulu tapılmadı');
    }

    if (item.review !== null) {
      throw new ConflictException('Bu məhsul üçün rəy artıq mövcuddur');
    }

    const comment =
      typeof dto.comment === 'string' && dto.comment.trim() !== ''
        ? dto.comment.trim()
        : null;

    const created = await this.prisma.productReview.create({
      data: {
        productId: item.variant.productId,
        variantId: item.variantId,
        customerId,
        orderId: order.id,
        orderItemId: item.id,
        rating: dto.rating,
        comment,
        published: false,
      },
      select: {
        id: true,
        orderId: true,
        orderItemId: true,
        productId: true,
        variantId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    return {
      id: created.id,
      orderId: created.orderId,
      orderItemId: created.orderItemId,
      productId: created.productId,
      variantId: created.variantId,
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listAddresses(
    customerId: string,
  ): Promise<CustomerAddressContract[]> {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return addresses.map((address) => this.mapAddress(address));
  }

  async createAddress(
    customerId: string,
    dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    const isDefault = dto.isDefault === true;
    const created = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const count = await tx.customerAddress.count({ where: { customerId } });
      return tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName,
          phone: dto.phone,
          administrativeArea: dto.administrativeArea?.trim() || null,
          addressLine: dto.addressLine,
          notes: dto.notes?.trim() || null,
          isDefault: isDefault || count === 0,
        },
      });
    });
    return this.mapAddress(created);
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (existing === null) {
      throw new NotFoundException('Ünvan tapılmadı');
    }

    const isDefault = dto.isDefault === true;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true, NOT: { id: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName,
          phone: dto.phone,
          administrativeArea: dto.administrativeArea?.trim() || null,
          addressLine: dto.addressLine,
          notes: dto.notes?.trim() || null,
          ...(dto.isDefault === undefined ? {} : { isDefault }),
        },
      });
    });
    return this.mapAddress(updated);
  }

  async deleteAddress(customerId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (existing === null) {
      throw new NotFoundException('Ünvan tapılmadı');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.delete({ where: { id: addressId } });
      if (existing.isDefault) {
        const next = await tx.customerAddress.findFirst({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
        });
        if (next !== null) {
          await tx.customerAddress.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { deleted: true };
  }

  async attachCart(customerId: string, cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { id: true, status: true, customerId: true },
    });
    if (cart === null || cart.status !== 'ACTIVE') {
      throw new NotFoundException('Aktiv səbət tapılmadı');
    }
    if (cart.customerId !== null && cart.customerId !== customerId) {
      throw new BadRequestException('Səbət başqa hesaba bağlıdır');
    }
    if (cart.customerId === customerId) {
      return { attached: true };
    }
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { customerId },
    });
    return { attached: true };
  }

  cancelOrder(customerId: string, orderId: string, reason: string) {
    return this.orders.cancelByCustomer(customerId, orderId, reason);
  }

  private mapAddress(address: {
    id: string;
    label: string | null;
    recipientName: string;
    phone: string;
    administrativeArea: string | null;
    addressLine: string;
    notes: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerAddressContract {
    return {
      id: address.id,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      administrativeArea: address.administrativeArea,
      addressLine: address.addressLine,
      notes: address.notes,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }
}

@ApiTags('customer-account')
@ApiCookieAuth('itmarket_customer_session')
@UseGuards(CustomerAuthGuard)
@Controller({ path: 'customer', version: '1' })
class CustomerAccountController {
  constructor(private readonly account: CustomerAccountService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated customer profile' })
  @ApiOkResponse({ description: 'Customer profile' })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  getProfile(
    @CurrentCustomer() customer: CustomerPrincipal,
  ): Promise<CustomerProfileContract> {
    return this.account.getProfile(customer.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated customer profile' })
  @ApiBody({ type: UpdateCustomerProfileDto })
  @ApiOkResponse({ description: 'Updated customer profile' })
  @ApiBadRequestResponse({
    description: 'Validation error or phone number already in use',
  })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  updateProfile(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileContract> {
    return this.account.updateProfile(customer.id, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List recent customer orders' })
  @ApiOkResponse({
    description:
      'Up to 50 most recent order summaries for the authenticated customer',
  })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  listOrders(
    @CurrentCustomer() customer: CustomerPrincipal,
  ): Promise<CustomerOrderSummaryContract[]> {
    return this.account.listOrders(customer.id);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel a customer order',
    description:
      'Cancels an owned order in PENDING_PAYMENT, UNDER_REVIEW, or CONFIRMED status. Requires `{ "reason": string }` (3–240 characters, trimmed). When the online payment is already PAID, cancellation triggers automatic full refund (ADR-0006). Breaking change: body-less cancel requests now return 400.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID', format: 'uuid' })
  @ApiBody({ type: CancelCustomerOrderDto })
  @ApiOkResponse({
    description:
      'Cancelled order summary (`status: CANCELLED`, `cancelledByCustomer: true`; cancellation actor metadata is reflected via status history)',
  })
  @ApiBadRequestResponse({
    description:
      'Missing or invalid request body (reason required, 3–240 characters after trim)',
  })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  @ApiNotFoundResponse({
    description: 'Order not found or not owned by the authenticated customer',
  })
  @ApiConflictResponse({
    description:
      'Order status or payment state does not allow customer cancellation',
  })
  cancelOrder(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCustomerOrderDto,
  ): Promise<OrderSummaryContract> {
    return this.account.cancelOrder(customer.id, id, dto.reason);
  }

  @Post('orders/:orderId/items/:itemId/review')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a product review for a completed order item',
    description:
      'Creates a product review (unpublished until staff moderation) for an owned COMPLETED + PAID order item. One review per order item.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID', format: 'uuid' })
  @ApiParam({ name: 'itemId', description: 'Order item UUID', format: 'uuid' })
  @ApiBody({ type: CreateCustomerProductReviewDto })
  @ApiCreatedResponse({ description: 'Created product review' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  @ApiNotFoundResponse({
    description: 'Order or order item not found / not owned',
  })
  @ApiConflictResponse({
    description:
      'Order is not COMPLETED+PAID, or a review already exists for the item',
  })
  createProductReview(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CreateCustomerProductReviewDto,
  ): Promise<CustomerProductReviewContract> {
    return this.account.createProductReview(
      customer.id,
      orderId,
      itemId,
      dto,
    );
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List saved delivery addresses' })
  @ApiOkResponse({ description: 'Customer address book' })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  listAddresses(
    @CurrentCustomer() customer: CustomerPrincipal,
  ): Promise<CustomerAddressContract[]> {
    return this.account.listAddresses(customer.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create a delivery address' })
  @ApiBody({ type: CustomerAddressDto })
  @ApiOkResponse({ description: 'Created address' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  createAddress(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    return this.account.createAddress(customer.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update a delivery address' })
  @ApiParam({ name: 'id', description: 'Address UUID', format: 'uuid' })
  @ApiBody({ type: CustomerAddressDto })
  @ApiOkResponse({ description: 'Updated address' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  updateAddress(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerAddressDto,
  ): Promise<CustomerAddressContract> {
    return this.account.updateAddress(customer.id, id, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete a delivery address' })
  @ApiParam({ name: 'id', description: 'Address UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Address deleted' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiUnauthorizedResponse({
    description: 'Customer session cookie missing or invalid',
  })
  deleteAddress(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.account.deleteAddress(customer.id, id);
  }

  @Post('carts/attach')
  attachCart(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() dto: AttachCartDto,
  ) {
    return this.account.attachCart(customer.id, dto.cartId);
  }
}

@Injectable()
class StaffCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async counts(): Promise<CustomerNavCountsContract> {
    const [registered, unregisteredRows] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        buildGuestCustomersCountSql(),
      ),
    ]);

    return {
      registered,
      unregistered: Number(unregisteredRows[0]?.count ?? 0n),
    };
  }

  async list(
    query: StaffCustomersListQuery,
  ): Promise<Page<StaffCustomerSummaryContract>> {
    const search = query.search?.trim();
    const rows = await this.prisma.customer.findMany({
      ...(search && search.length > 0
        ? {
            where: {
              OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search } },
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
              ],
            },
          }
        : {}),
      take: query.limit + 1,
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 }
        : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: pageRows.map((row) => ({
        id: row.id,
        email: row.email,
        phone: row.phone,
        firstName: row.firstName,
        lastName: row.lastName,
        active: row.active,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }

  async listUnregistered(
    query: StaffUnregisteredCustomersListQuery,
  ): Promise<Page<StaffUnregisteredCustomerSummaryContract>> {
    const search = query.search?.trim();
    const cursor =
      query.cursor && query.cursor.length > 0
        ? decodeGuestCustomerCursor(query.cursor)
        : null;
    if (query.cursor && query.cursor.length > 0 && cursor === null) {
      throw new BadRequestException({
        code: 'INVALID_CURSOR',
        message: 'Invalid unregistered customers cursor',
      });
    }

    const rows = await this.prisma.$queryRaw<GuestCustomerAggRow[]>(
      buildGuestCustomersListSql({
        limit: query.limit + 1,
        ...(search && search.length > 0 ? { search } : {}),
        ...(cursor ? { cursor } : {}),
      }),
    );

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const last = pageRows.at(-1);

    return {
      items: pageRows.map((row) => ({
        identityKey: row.identityKey,
        email: row.email,
        phone: row.phone,
        displayName: row.displayName,
        orderCount: Number(row.orderCount),
        lastOrderAt: new Date(row.lastOrderAt).toISOString(),
        firstOrderAt: new Date(row.firstOrderAt).toISOString(),
        totalSpent: String(row.totalSpent),
      })),
      nextCursor:
        hasMore && last
          ? encodeGuestCustomerCursor(
              new Date(last.lastOrderAt),
              last.identityKey,
            )
          : null,
    };
  }
}

@ApiTags('customers')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CUSTOMERS_READ)
@Controller({ path: 'customers', version: '1' })
class StaffCustomersController {
  constructor(private readonly customers: StaffCustomersService) {}

  @Get('counts')
  @ApiOperation({
    summary: 'Customer counts for backoffice navigation',
  })
  @ApiOkResponse({
    description: 'Registered and unregistered customer totals',
  })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({ description: 'Missing customers.read permission' })
  counts(): Promise<CustomerNavCountsContract> {
    return this.customers.counts();
  }

  @Get('unregistered')
  @ApiOperation({
    summary: 'List unregistered (guest) customers aggregated from orders',
  })
  @ApiOkResponse({ description: 'Paginated unregistered customer summaries' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({ description: 'Missing customers.read permission' })
  listUnregistered(
    @Query() query: StaffUnregisteredCustomersListQuery,
  ): Promise<Page<StaffUnregisteredCustomerSummaryContract>> {
    return this.customers.listUnregistered(query);
  }

  @Get()
  @ApiOperation({ summary: 'List registered storefront customers' })
  @ApiOkResponse({ description: 'Paginated customer summaries' })
  @ApiUnauthorizedResponse({
    description: 'Staff session cookie missing or invalid',
  })
  @ApiForbiddenResponse({ description: 'Missing customers.read permission' })
  list(
    @Query() query: StaffCustomersListQuery,
  ): Promise<Page<StaffCustomerSummaryContract>> {
    return this.customers.list(query);
  }
}

@Module({
  imports: [PrismaModule, AuthModule, OrdersModule],
  controllers: [CustomerAccountController, StaffCustomersController],
  providers: [CustomerAccountService, StaffCustomersService],
})
export class CustomerModule {}
