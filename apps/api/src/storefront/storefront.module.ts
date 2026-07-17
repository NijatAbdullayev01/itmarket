import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
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
} from 'class-validator';
import { randomBytes } from 'node:crypto';
import {
  CartStatus,
  CatalogStatus,
  FulfillmentStatus,
  FulfillmentType,
  LocationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { recordFulfillmentEvent } from '../orders/fulfillment-events';
import { PaymentsModule, PaymentsService } from '../payments/payments.module';
import {
  matchesAdministrativeArea,
  normalizeAdministrativeAreaQuery,
} from '../common/administrative-areas';
import {
  ProductAvailabilityModule,
  ProductAvailabilityRequestDto,
  ProductAvailabilityService,
} from '../product-availability/product-availability.module';

const RESERVATION_TTL_MS = 30 * 60 * 1000;

const COMPANION_CATEGORY_SLUGS: Record<string, string[]> = {
  smartfonlar: [
    'sebeke-avadanliqlari',
    'tehlukesizlik-avadanliqlari',
    'printerler',
    'kamera-foto',
  ],
  noutbuklar: ['monitorlar', 'sebeke-avadanliqlari', 'printerler'],
  apple: ['monitorlar', 'smartfonlar', 'sebeke-avadanliqlari'],
  'gamer-zona': ['monitorlar', 'sebeke-avadanliqlari'],
  monitorlar: ['sebeke-avadanliqlari', 'noutbuklar', 'gamer-zona'],
  'tv-audio': ['sebeke-avadanliqlari', 'tehlukesizlik-avadanliqlari'],
  'meiset-texnikasi': ['tehlukesizlik-avadanliqlari'],
  printerler: ['sebeke-avadanliqlari', 'noutbuklar'],
  'kamera-foto': ['sebeke-avadanliqlari', 'printerler'],
  'sebeke-avadanliqlari': [
    'tehlukesizlik-avadanliqlari',
    'smartfonlar',
    'noutbuklar',
  ],
  'tehlukesizlik-avadanliqlari': [
    'sebeke-avadanliqlari',
    'smartfonlar',
    'noutbuklar',
  ],
};

type LockedBalance = {
  id: string;
  on_hand: number;
  reserved: number;
};

function coveredAdministrativeAreas(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function formatReviewAuthorName(customer: {
  firstName: string | null;
  lastName: string | null;
}) {
  const firstName = customer.firstName?.trim();
  const lastName = customer.lastName?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return `${lastName.charAt(0).toUpperCase()}.`;
  }
  return 'Alıcı';
}

class StorefrontCatalogQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 24;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  sort: 'newest' | 'name' | 'price' = 'newest';
}

class SimilarProductsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  limit = 8;
}

class CompanionProductsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  limit = 4;
}

class CreateCartDto {
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(160)
  guestToken?: string;
}

class CartItemDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

class FulfillmentOptionsQuery {
  @IsOptional()
  @IsUUID()
  cartId?: string;

  @ValidateIf(
    (dto: CashCheckoutDto) => dto.fulfillmentType === FulfillmentType.DELIVERY,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  administrativeArea?: string;
}

class CheckoutContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @IsEmail()
  email!: string;
}

class CashCheckoutDto extends CheckoutContactDto {
  @IsUUID()
  cartId!: string;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsOptional()
  @IsUUID()
  deliveryZoneId?: string;

  @IsOptional()
  @IsUUID()
  pickupLocationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  administrativeArea?: string;

  @ValidateIf(
    (dto: CashCheckoutDto) => dto.fulfillmentType === FulfillmentType.DELIVERY,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class OnlineCheckoutDto extends CashCheckoutDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(24)
  installmentMonths?: number;
}

class CreditApplicationDto {
  @IsString()
  @MinLength(7)
  @MaxLength(7)
  @Matches(/^[A-Za-z0-9]{7}$/)
  finCode!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  cartId?: string;
}

const productSummaryInclude = {
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  variants: {
    where: { status: CatalogStatus.ACTIVE },
    include: {
      balances: { select: { onHand: true, reserved: true } },
    },
    orderBy: { price: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

type ProductSummaryRow = Prisma.ProductGetPayload<{
  include: typeof productSummaryInclude;
}>;

function mapProductSummary(product: ProductSummaryRow) {
  const firstVariant = product.variants[0];
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    brand: product.brand,
    image: product.media[0] ?? null,
    price: firstVariant === undefined ? null : firstVariant.price.toFixed(2),
    previousPrice:
      firstVariant?.previousPrice === null ||
      firstVariant?.previousPrice === undefined
        ? null
        : firstVariant.previousPrice.toFixed(2),
    currency: firstVariant?.currency ?? 'AZN',
    available: product.variants.reduce(
      (sum, variant) =>
        sum +
        variant.balances.reduce(
          (variantSum, balance) =>
            variantSum + Math.max(0, balance.onHand - balance.reserved),
          0,
        ),
      0,
    ),
    defaultVariantId: firstVariant?.id ?? null,
  };
}

@Injectable()
class StorefrontCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: StorefrontCatalogQuery) {
    const orderBy =
      query.sort === 'name'
        ? { name: 'asc' as const }
        : { createdAt: 'desc' as const };
    const rows = await this.prisma.product.findMany({
      take: query.limit + 1,
      ...(query.cursor === undefined
        ? {}
        : { cursor: { id: query.cursor }, skip: 1 }),
      where: {
        status: CatalogStatus.ACTIVE,
        category:
          query.category === undefined
            ? { status: CatalogStatus.ACTIVE }
            : { slug: query.category, status: CatalogStatus.ACTIVE },
        ...(query.brand === undefined
          ? {}
          : { brand: { slug: query.brand, status: CatalogStatus.ACTIVE } }),
        variants: { some: { status: CatalogStatus.ACTIVE } },
        ...(query.search === undefined
          ? {}
          : {
              OR: [
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  variants: {
                    some: {
                      sku: {
                        contains: query.search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              ],
            }),
      },
      include: productSummaryInclude,
      orderBy,
    });
    const items = rows.slice(0, query.limit).map(mapProductSummary);
    if (query.sort === 'price') {
      items.sort((left, right) => {
        const leftPrice =
          left.price === null ? Number.POSITIVE_INFINITY : Number(left.price);
        const rightPrice =
          right.price === null ? Number.POSITIVE_INFINITY : Number(right.price);
        return leftPrice - rightPrice || left.name.localeCompare(right.name);
      });
    }
    return {
      items,
      nextCursor: rows.length > query.limit ? items.at(-1)?.id : null,
    };
  }

  async similarProducts(slug: string, limit = 8) {
    const source = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: CatalogStatus.ACTIVE },
      select: { id: true, categoryId: true, brandId: true },
    });
    const rows = await this.prisma.product.findMany({
      take: Math.min(limit * 3, 36),
      where: {
        status: CatalogStatus.ACTIVE,
        id: { not: source.id },
        categoryId: source.categoryId,
        variants: { some: { status: CatalogStatus.ACTIVE } },
      },
      include: productSummaryInclude,
      orderBy: { createdAt: 'desc' },
    });
    const items = rows
      .sort((left, right) => {
        const leftSameBrand = left.brandId === source.brandId ? 0 : 1;
        const rightSameBrand = right.brandId === source.brandId ? 0 : 1;
        return (
          leftSameBrand - rightSameBrand ||
          right.createdAt.getTime() - left.createdAt.getTime()
        );
      })
      .slice(0, limit)
      .map(mapProductSummary);
    return { items };
  }

  async companionProducts(slug: string, limit = 4) {
    const source = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: CatalogStatus.ACTIVE },
      select: {
        id: true,
        brandId: true,
        categoryId: true,
        category: { select: { slug: true } },
      },
    });
    const companionSlugs =
      COMPANION_CATEGORY_SLUGS[source.category.slug] ?? [
        'sebeke-avadanliqlari',
        'tehlukesizlik-avadanliqlari',
        'printerler',
      ];
    const rows = await this.prisma.product.findMany({
      take: Math.min(limit * 4, 24),
      where: {
        status: CatalogStatus.ACTIVE,
        id: { not: source.id },
        categoryId: { not: source.categoryId },
        category: {
          slug: { in: companionSlugs },
          status: CatalogStatus.ACTIVE,
        },
        variants: { some: { status: CatalogStatus.ACTIVE } },
      },
      include: productSummaryInclude,
      orderBy: { createdAt: 'desc' },
    });
    let items = rows
      .sort((left, right) => {
        const leftSameBrand = left.brandId === source.brandId ? 0 : 1;
        const rightSameBrand = right.brandId === source.brandId ? 0 : 1;
        if (leftSameBrand !== rightSameBrand) {
          return leftSameBrand - rightSameBrand;
        }
        const leftPrice = left.variants[0]?.price.toNumber() ?? Number.POSITIVE_INFINITY;
        const rightPrice = right.variants[0]?.price.toNumber() ?? Number.POSITIVE_INFINITY;
        return leftPrice - rightPrice || right.createdAt.getTime() - left.createdAt.getTime();
      })
      .slice(0, limit)
      .map(mapProductSummary);

    if (items.length === 0) {
      const fallbackRows = await this.prisma.product.findMany({
        take: Math.min(limit * 4, 24),
        where: {
          status: CatalogStatus.ACTIVE,
          id: { not: source.id },
          categoryId: { not: source.categoryId },
          variants: { some: { status: CatalogStatus.ACTIVE } },
        },
        include: productSummaryInclude,
        orderBy: { createdAt: 'desc' },
      });
      items = fallbackRows
        .sort((left, right) => {
          const leftPrice = left.variants[0]?.price.toNumber() ?? Number.POSITIVE_INFINITY;
          const rightPrice = right.variants[0]?.price.toNumber() ?? Number.POSITIVE_INFINITY;
          return leftPrice - rightPrice || right.createdAt.getTime() - left.createdAt.getTime();
        })
        .slice(0, limit)
        .map(mapProductSummary);
    }

    return { items };
  }

  async product(slug: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: CatalogStatus.ACTIVE },
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { status: CatalogStatus.ACTIVE },
          include: {
            balances: {
              include: {
                location: { select: { id: true, code: true, name: true } },
              },
            },
          },
          orderBy: { price: 'asc' },
        },
      },
    });
    const variants = product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      name: variant.name,
      attributes: variant.attributes,
      price: variant.price.toFixed(2),
      previousPrice: variant.previousPrice?.toFixed(2) ?? null,
      currency: variant.currency,
      available: variant.balances.reduce(
        (sum, balance) =>
          sum + Math.max(0, balance.onHand - balance.reserved),
        0,
      ),
    }));
    const firstVariant = variants[0];
    const publishedReviewWhere = {
      productId: product.id,
      published: true,
      order: {
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
      },
    } as const;
    const [reviewStats, reviews] = await Promise.all([
      this.prisma.productReview.aggregate({
        where: publishedReviewWhere,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.productReview.findMany({
        where: publishedReviewWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);
    const reviewCount = reviewStats._count.rating;
    const averageRating =
      reviewStats._avg.rating === null
        ? null
        : Math.round(reviewStats._avg.rating * 10) / 10;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      brand: product.brand,
      image: product.media[0] ?? null,
      media: product.media,
      price: firstVariant === undefined ? null : firstVariant.price,
      previousPrice: firstVariant?.previousPrice ?? null,
      currency: firstVariant?.currency ?? 'AZN',
      available: variants.reduce(
        (sum, variant) => sum + variant.available,
        0,
      ),
      reviewSummary: {
        averageRating,
        count: reviewCount,
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        authorName: formatReviewAuthorName(review.customer),
      })),
      variants,
    };
  }

  categories() {
    return this.prisma.category.findMany({
      where: { status: CatalogStatus.ACTIVE },
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: 'asc' },
    });
  }

  brands() {
    return this.prisma.brand.findMany({
      where: { status: CatalogStatus.ACTIVE },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }
}

@Injectable()
class CartCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async createCart(dto: CreateCartDto) {
    if (dto.guestToken !== undefined) {
      const existing = await this.prisma.cart.findUnique({
        where: { guestToken: dto.guestToken },
        select: { id: true, guestToken: true, status: true },
      });
      if (existing?.status === CartStatus.ACTIVE) {
        return existing;
      }
      if (existing === null) {
        return this.prisma.cart.create({
          data: { guestToken: dto.guestToken },
          select: { id: true, guestToken: true, status: true },
        });
      }
    }
    const guestToken = randomBytes(32).toString('base64url');
    return this.prisma.cart.create({
      data: { guestToken },
      select: { id: true, guestToken: true, status: true },
    });
  }

  async getCart(id: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    name: true,
                    slug: true,
                    media: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  },
                },
                balances: { select: { onHand: true, reserved: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const items = cart.items.map((item) => {
      const unitPrice = item.variant.price;
      const previousUnitPrice = item.variant.previousPrice;
      const hasSale =
        previousUnitPrice !== null &&
        previousUnitPrice !== undefined &&
        previousUnitPrice.gt(unitPrice);
      return {
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        productSlug: item.variant.product.slug,
        image: item.variant.product.media[0] ?? null,
        variantName: item.variant.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: unitPrice.mul(item.quantity).toFixed(2),
        linePreviousTotal: hasSale
          ? previousUnitPrice.mul(item.quantity).toFixed(2)
          : null,
        currency: item.variant.currency,
        available: item.variant.balances.reduce(
          (sum, balance) =>
            sum + Math.max(0, balance.onHand - balance.reserved),
          0,
        ),
      };
    });
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );
    return {
      id: cart.id,
      guestToken: cart.guestToken,
      status: cart.status,
      items,
      subtotal: subtotal.toFixed(2),
      currency: cart.currency,
    };
  }

  async upsertItem(cartId: string, dto: CartItemDto) {
    await this.assertActiveCart(cartId);
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      select: { id: true },
    });
    if (variant === null)
      throw new BadRequestException('Variant is not active');
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: dto.variantId } },
      create: { cartId, variantId: dto.variantId, quantity: dto.quantity },
      update: { quantity: dto.quantity },
    });
    return this.getCart(cartId);
  }

  async removeItem(cartId: string, variantId: string) {
    await this.assertActiveCart(cartId);
    await this.prisma.cartItem.deleteMany({ where: { cartId, variantId } });
    return this.getCart(cartId);
  }

  async fulfillmentOptions(query: FulfillmentOptionsQuery) {
    const administrativeArea = normalizeAdministrativeAreaQuery(
      query.administrativeArea,
    );
    const subtotal =
      query.cartId === undefined
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal((await this.getCart(query.cartId)).subtotal);
    const allZones = await this.prisma.deliveryZone.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    const zones =
      administrativeArea === undefined
        ? allZones
        : allZones.filter((zone) =>
            coveredAdministrativeAreas(
              zone.coveredAdministrativeAreas,
            ).some((area) => matchesAdministrativeArea(area, administrativeArea)),
          );
    const pickupLocations = await this.prisma.pickupLocation.findMany({
      where: { active: true, location: { active: true } },
      include: { location: { select: { id: true, code: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return {
      deliveryZones: zones.map((zone) => ({
        id: zone.id,
        code: zone.code,
        name: zone.name,
        fee:
          zone.freeDeliveryMinimum !== null &&
          subtotal.greaterThanOrEqualTo(zone.freeDeliveryMinimum)
            ? '0.00'
            : zone.fee.toFixed(2),
        freeDeliveryMinimum: zone.freeDeliveryMinimum?.toFixed(2) ?? null,
        estimatedMinDays: zone.estimatedMinDays,
        estimatedMaxDays: zone.estimatedMaxDays,
      })),
      pickupLocations: pickupLocations.map((pickup) => ({
        id: pickup.id,
        code: pickup.code,
        name: pickup.name,
        addressLine: pickup.addressLine,
        workingHours: pickup.workingHours,
        stockLocation: pickup.location,
      })),
    };
  }

  paymentOptions(cartId: string | undefined) {
    return this.payments.paymentOptions(cartId);
  }

  async onlineCheckout(
    dto: OnlineCheckoutDto,
    idempotencyKey: string | undefined,
  ) {
    if (idempotencyKey === undefined || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (dto.paymentMethod === PaymentMethod.CASH) {
      throw new BadRequestException('Cash payment must use the cash checkout');
    }
    if (
      (dto.fulfillmentType === FulfillmentType.DELIVERY) !==
      (dto.deliveryZoneId !== undefined)
    ) {
      throw new BadRequestException('Delivery zone is required for delivery');
    }
    if (
      (dto.fulfillmentType === FulfillmentType.PICKUP) !==
      (dto.pickupLocationId !== undefined)
    ) {
      throw new BadRequestException('Pickup location is required for pickup');
    }

    const paymentOptions = await this.payments.paymentOptions(dto.cartId);
    const selectedMethod = paymentOptions.methods.find(
      (method) => method.method === dto.paymentMethod,
    );
    if (selectedMethod === undefined) {
      throw new BadRequestException('Selected payment method is unavailable');
    }
    const installmentOption = paymentOptions.methods.find(
      (method) => method.method === PaymentMethod.INSTALLMENT,
    );
    if (dto.paymentMethod === PaymentMethod.INSTALLMENT) {
      if (dto.installmentMonths === undefined) {
        throw new BadRequestException(
          'Installment month selection is required',
        );
      }
      if (
        installmentOption === undefined ||
        !installmentOption.installmentMonths.some(
          (months) => months === dto.installmentMonths,
        )
      ) {
        throw new BadRequestException('Selected installment option is invalid');
      }
    }
    if (
      dto.paymentMethod !== PaymentMethod.INSTALLMENT &&
      dto.installmentMonths !== undefined
    ) {
      throw new BadRequestException(
        'Installment months can only be sent for installment payments',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.order.findUnique({
          where: { cartId: dto.cartId },
          include: {
            payment: {
              include: {
                attempts: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });
        if (existing !== null) {
          if (existing.checkoutIdempotencyKey !== idempotencyKey) {
            throw new ConflictException(
              'Cart already belongs to another checkout flow',
            );
          }
          const existingAttempt = existing.payment?.attempts[0];
          if (existing.payment === null || existingAttempt === undefined) {
            throw new ConflictException(
              'Cart already belongs to another checkout flow',
            );
          }
          return {
            id: existing.id,
            orderNumber: existing.orderNumber,
            grandTotal: existing.grandTotal.toFixed(2),
            currency: existing.currency,
            checkoutUrl: existingAttempt.providerCheckoutUrl,
            paymentMethod: existing.payment.method,
            provider: existing.payment.provider,
            sandbox:
              existing.payment.provider === 'mock' ||
              (existing.payment.provider === 'epoint' &&
                process.env.NODE_ENV !== 'production'),
          };
        }

        const cart = await tx.cart.findUniqueOrThrow({
          where: { id: dto.cartId },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        });
        if (cart.status !== CartStatus.ACTIVE) {
          throw new ConflictException('Cart is not active');
        }
        if (cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        const fulfillment = await this.resolveFulfillment(tx, dto);
        const subtotal = cart.items.reduce(
          (sum, item) => sum.add(item.variant.price.mul(item.quantity)),
          new Prisma.Decimal(0),
        );
        const deliveryFee =
          dto.fulfillmentType === FulfillmentType.DELIVERY
            ? this.deliveryFee(
                fulfillment.deliveryZone ??
                  (() => {
                    throw new BadRequestException('Delivery zone is required');
                  })(),
                subtotal,
              )
            : new Prisma.Decimal(0);
        const grandTotal = subtotal.add(deliveryFee);
        const orderAddressLine =
          dto.fulfillmentType === FulfillmentType.PICKUP
            ? fulfillment.pickupLocation!.addressLine
            : (dto.addressLine ??
              (() => {
                throw new BadRequestException(
                  'Address line is required for delivery',
                );
              })());
        const customerId = await this.resolveCustomerId(
          tx,
          cart.customerId,
          dto.email,
        );
        const order = await tx.order.create({
          data: {
            orderNumber: await this.nextOrderNumber(tx),
            checkoutIdempotencyKey: idempotencyKey,
            cartId: cart.id,
            customerId,
            guestEmail: dto.email,
            guestPhone: dto.phone,
            fulfillmentType: dto.fulfillmentType,
            deliveryZoneId: dto.deliveryZoneId ?? null,
            pickupLocationId: dto.pickupLocationId ?? null,
            status: 'PENDING_PAYMENT',
            paymentStatus: 'PENDING',
            fulfillmentStatus: 'PENDING',
            subtotal,
            deliveryFee,
            grandTotal,
            items: {
              create: cart.items.map((item) => ({
                variant: { connect: { id: item.variantId } },
                productName: item.variant.product.name,
                variantName: item.variant.name,
                sku: item.variant.sku,
                barcode: item.variant.barcode,
                quantity: item.quantity,
                unitPrice: item.variant.price,
                lineTotal: item.variant.price.mul(item.quantity),
                currency: item.variant.currency,
                attributesSnapshot:
                  item.variant.attributes === null
                    ? Prisma.JsonNull
                    : (item.variant.attributes as Prisma.InputJsonValue),
              })),
            },
            address: {
              create: {
                recipientName: dto.recipientName,
                phone: dto.phone,
                administrativeArea: dto.administrativeArea ?? null,
                addressLine: orderAddressLine,
                notes: dto.notes ?? null,
              },
            },
            statusHistory: {
              create: {
                orderStatus: 'PENDING_PAYMENT',
                paymentStatus: 'PENDING',
                fulfillmentStatus: 'PENDING',
                reason: 'online checkout created',
              },
            },
          },
        });

        for (const item of cart.items) {
          const locationId =
            dto.fulfillmentType === FulfillmentType.PICKUP
              ? fulfillment.pickupLocation!.locationId
              : await this.deliveryStockLocation(
                  tx,
                  item.variantId,
                  item.quantity,
                );
          await this.reserveStock(tx, {
            orderId: order.id,
            variantId: item.variantId,
            locationId,
            quantity: item.quantity,
          });
        }

        const paymentSession = await this.payments.createHostedPayment(tx, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: grandTotal,
          currency: 'AZN',
          paymentMethod: dto.paymentMethod,
          ...(dto.installmentMonths === undefined
            ? {}
            : { installmentMonths: dto.installmentMonths }),
          idempotencyKey,
        });

        await tx.cart.update({
          where: { id: cart.id },
          data: { status: CartStatus.CHECKED_OUT },
        });
        await tx.auditLog.create({
          data: {
            actorType: cart.customerId === null ? 'guest' : 'customer',
            actorId: cart.customerId,
            action: 'order.online-created',
            entityType: 'order',
            entityId: order.id,
            after: {
              orderNumber: order.orderNumber,
              cartId: cart.id,
              idempotencyKey,
              grandTotal: grandTotal.toFixed(2),
              currency: 'AZN',
              paymentMethod: dto.paymentMethod,
              provider: paymentSession.provider,
            },
          },
        });
        await recordFulfillmentEvent(tx, order.id, {
          orderStatus: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.PENDING,
          eventType: 'orders.online.created',
          reason: 'online checkout created',
          payload: {
            orderNumber: order.orderNumber,
            cartId: cart.id,
            paymentMethod: dto.paymentMethod,
          },
        });
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          grandTotal: grandTotal.toFixed(2),
          currency: 'AZN',
          checkoutUrl: paymentSession.checkoutUrl,
          paymentMethod: dto.paymentMethod,
          provider: paymentSession.provider,
          sandbox: paymentSession.sandbox,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cashCheckout(dto: CashCheckoutDto, idempotencyKey: string | undefined) {
    if (idempotencyKey === undefined || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (
      (dto.fulfillmentType === FulfillmentType.DELIVERY) !==
      (dto.deliveryZoneId !== undefined)
    ) {
      throw new BadRequestException('Delivery zone is required for delivery');
    }
    if (
      (dto.fulfillmentType === FulfillmentType.PICKUP) !==
      (dto.pickupLocationId !== undefined)
    ) {
      throw new BadRequestException('Pickup location is required for pickup');
    }
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.order.findUnique({
          where: { cartId: dto.cartId },
          include: { items: true, address: true, reservations: true },
        });
        if (existing !== null) {
          if (existing.checkoutIdempotencyKey !== idempotencyKey) {
            throw new ConflictException(
              'Cart already belongs to another checkout flow',
            );
          }
          return existing;
        }

        const cart = await tx.cart.findUniqueOrThrow({
          where: { id: dto.cartId },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        });
        if (cart.status !== CartStatus.ACTIVE) {
          throw new ConflictException('Cart is not active');
        }
        if (cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        const fulfillment = await this.resolveFulfillment(tx, dto);
        const subtotal = cart.items.reduce(
          (sum, item) => sum.add(item.variant.price.mul(item.quantity)),
          new Prisma.Decimal(0),
        );
        const deliveryFee =
          dto.fulfillmentType === FulfillmentType.DELIVERY
            ? this.deliveryFee(
                fulfillment.deliveryZone ??
                  (() => {
                    throw new BadRequestException('Delivery zone is required');
                  })(),
                subtotal,
              )
            : new Prisma.Decimal(0);
        const grandTotal = subtotal.add(deliveryFee);
        const orderAddressLine =
          dto.fulfillmentType === FulfillmentType.PICKUP
            ? fulfillment.pickupLocation!.addressLine
            : (dto.addressLine ??
              (() => {
                throw new BadRequestException(
                  'Address line is required for delivery',
                );
              })());
        const customerId = await this.resolveCustomerId(
          tx,
          cart.customerId,
          dto.email,
        );
        const order = await tx.order.create({
          data: {
            orderNumber: await this.nextOrderNumber(tx),
            checkoutIdempotencyKey: idempotencyKey,
            cartId: cart.id,
            customerId,
            guestEmail: dto.email,
            guestPhone: dto.phone,
            fulfillmentType: dto.fulfillmentType,
            deliveryZoneId: dto.deliveryZoneId ?? null,
            pickupLocationId: dto.pickupLocationId ?? null,
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PENDING,
            fulfillmentStatus: FulfillmentStatus.RESERVED,
            subtotal,
            deliveryFee,
            grandTotal,
            items: {
              create: cart.items.map((item) => ({
                variant: { connect: { id: item.variantId } },
                productName: item.variant.product.name,
                variantName: item.variant.name,
                sku: item.variant.sku,
                barcode: item.variant.barcode,
                quantity: item.quantity,
                unitPrice: item.variant.price,
                lineTotal: item.variant.price.mul(item.quantity),
                currency: item.variant.currency,
                attributesSnapshot:
                  item.variant.attributes === null
                    ? Prisma.JsonNull
                    : (item.variant.attributes as Prisma.InputJsonValue),
              })),
            },
            address: {
              create: {
                recipientName: dto.recipientName,
                phone: dto.phone,
                administrativeArea: dto.administrativeArea ?? null,
                addressLine: orderAddressLine,
                notes: dto.notes ?? null,
              },
            },
            statusHistory: {
              create: {
                orderStatus: 'CONFIRMED',
                paymentStatus: 'PENDING',
                fulfillmentStatus: 'RESERVED',
                reason: 'cash checkout created',
              },
            },
          },
        });

        for (const item of cart.items) {
          const locationId =
            dto.fulfillmentType === FulfillmentType.PICKUP
              ? fulfillment.pickupLocation!.locationId
              : await this.deliveryStockLocation(
                  tx,
                  item.variantId,
                  item.quantity,
                );
          await this.reserveStock(tx, {
            orderId: order.id,
            variantId: item.variantId,
            locationId,
            quantity: item.quantity,
          });
        }

        await tx.cart.update({
          where: { id: cart.id },
          data: { status: CartStatus.CHECKED_OUT },
        });
        await tx.auditLog.create({
          data: {
            actorType: cart.customerId === null ? 'guest' : 'customer',
            actorId: cart.customerId,
            action: 'order.cash-created',
            entityType: 'order',
            entityId: order.id,
            after: {
              orderNumber: order.orderNumber,
              cartId: cart.id,
              idempotencyKey,
              grandTotal: grandTotal.toFixed(2),
              currency: 'AZN',
            },
          },
        });
        await recordFulfillmentEvent(tx, order.id, {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.RESERVED,
          eventType: 'orders.cash.created',
          reason: 'cash checkout created',
          payload: {
            orderNumber: order.orderNumber,
            cartId: cart.id,
          },
        });
        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { items: true, address: true, reservations: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async assertActiveCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { status: true },
    });
    if (cart === null) throw new BadRequestException('Unknown cart');
    if (cart.status !== CartStatus.ACTIVE) {
      throw new ConflictException('Cart is not active');
    }
  }

  private async resolveCustomerId(
    tx: Prisma.TransactionClient,
    cartCustomerId: string | null,
    email: string,
  ): Promise<string | null> {
    if (cartCustomerId !== null) return cartCustomerId;
    const customer = await tx.customer.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, active: true },
    });
    if (customer === null || !customer.active) return null;
    return customer.id;
  }

  private deliveryFee(
    zone: { fee: Prisma.Decimal; freeDeliveryMinimum: Prisma.Decimal | null },
    subtotal: Prisma.Decimal,
  ) {
    return zone.freeDeliveryMinimum !== null &&
      subtotal.greaterThanOrEqualTo(zone.freeDeliveryMinimum)
      ? new Prisma.Decimal(0)
      : zone.fee;
  }

  private async resolveFulfillment(
    tx: Prisma.TransactionClient,
    dto: CashCheckoutDto,
  ) {
    const administrativeArea = normalizeAdministrativeAreaQuery(
      dto.administrativeArea,
    );
    if (dto.fulfillmentType === FulfillmentType.DELIVERY) {
      if (dto.deliveryZoneId === undefined) {
        throw new BadRequestException('Delivery zone is required for delivery');
      }
      if (administrativeArea === undefined) {
        throw new BadRequestException(
          'Administrative area is required for delivery',
        );
      }
      const deliveryZone = await tx.deliveryZone.findFirst({
        where: { id: dto.deliveryZoneId, active: true },
      });
      if (deliveryZone === null) {
        throw new BadRequestException('Inactive or unknown delivery zone');
      }
      if (
        administrativeArea !== undefined &&
        !coveredAdministrativeAreas(
          deliveryZone.coveredAdministrativeAreas,
        ).some((area) => matchesAdministrativeArea(area, administrativeArea))
      ) {
        throw new BadRequestException(
          'Selected delivery zone does not cover this administrative area',
        );
      }
      return { deliveryZone, pickupLocation: null };
    }
    if (dto.pickupLocationId === undefined) {
      throw new BadRequestException('Pickup location is required for pickup');
    }
    const pickupLocation = await tx.pickupLocation.findFirst({
      where: {
        id: dto.pickupLocationId,
        active: true,
        location: { active: true },
      },
    });
    if (pickupLocation === null) {
      throw new BadRequestException('Inactive or unknown pickup location');
    }
    return { deliveryZone: null, pickupLocation };
  }

  private async deliveryStockLocation(
    tx: Prisma.TransactionClient,
    variantId: string,
    quantity: number,
  ) {
    const balance = await tx.inventoryBalance.findFirst({
      where: {
        variantId,
        location: {
          active: true,
          type: { in: [LocationType.WAREHOUSE, LocationType.STORE] },
        },
        onHand: { gt: 0 },
      },
      orderBy: [{ location: { type: 'asc' } }, { updatedAt: 'asc' }],
    });
    if (balance === null || balance.onHand - balance.reserved < quantity) {
      throw new ConflictException('Insufficient available stock');
    }
    return balance.locationId;
  }

  private async reserveStock(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      variantId: string;
      locationId: string;
      quantity: number;
    },
  ) {
    const rows = await tx.$queryRaw<LockedBalance[]>`
      SELECT "id", "on_hand", "reserved"
      FROM "inventory_balances"
      WHERE "variant_id" = ${input.variantId}::uuid
        AND "location_id" = ${input.locationId}::uuid
      FOR UPDATE
    `;
    const balance = rows[0];
    if (
      balance === undefined ||
      balance.on_hand - balance.reserved < input.quantity
    ) {
      throw new ConflictException('Insufficient available stock');
    }
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { reserved: { increment: input.quantity } },
    });
    await tx.stockReservation.create({
      data: {
        orderId: input.orderId,
        variantId: input.variantId,
        locationId: input.locationId,
        quantity: input.quantity,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      },
    });
  }

  private async nextOrderNumber(tx: Prisma.TransactionClient) {
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await tx.order.count({
      where: { orderNumber: { startsWith: `ITM-${today}-` } },
    });
    return `ITM-${today}-${String(count + 1).padStart(6, '0')}`;
  }

  async createCreditApplication(dto: CreditApplicationDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        productId: dto.productId,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      select: { id: true, price: true },
    });
    if (variant === null) {
      throw new BadRequestException('Məhsul variantı tapılmadı');
    }

    if (dto.cartId !== undefined) {
      const cart = await this.prisma.cart.findFirst({
        where: { id: dto.cartId, status: CartStatus.ACTIVE },
        select: { id: true },
      });
      if (cart === null) {
        throw new BadRequestException('Səbət tapılmadı');
      }
    }

    const application = await this.prisma.creditApplication.create({
      data: {
        finCode: dto.finCode.trim().toUpperCase(),
        phone: dto.phone.trim(),
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        amount: variant.price.mul(dto.quantity),
        ...(dto.cartId === undefined ? {} : { cartId: dto.cartId }),
      },
      select: {
        id: true,
        status: true,
        amount: true,
      },
    });

    return {
      id: application.id,
      status: application.status,
      amount: application.amount.toFixed(2),
      currency: 'AZN' as const,
    };
  }
}

@ApiTags('storefront-catalog')
@Controller({ path: 'storefront/catalog', version: '1' })
class StorefrontCatalogController {
  constructor(private readonly catalog: StorefrontCatalogService) {}

  @Get('products')
  products(@Query() query: StorefrontCatalogQuery) {
    return this.catalog.listProducts(query);
  }

  @Get('products/:slug/similar')
  similarProducts(
    @Param('slug') slug: string,
    @Query() query: SimilarProductsQuery,
  ) {
    return this.catalog.similarProducts(slug, query.limit);
  }

  @Get('products/:slug/companions')
  companionProducts(
    @Param('slug') slug: string,
    @Query() query: CompanionProductsQuery,
  ) {
    return this.catalog.companionProducts(slug, query.limit);
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.product(slug);
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('brands')
  brands() {
    return this.catalog.brands();
  }
}

@ApiTags('storefront-checkout')
@Controller({ path: 'storefront', version: '1' })
class StorefrontCheckoutController {
  constructor(
    private readonly checkout: CartCheckoutService,
    private readonly availability: ProductAvailabilityService,
  ) {}

  @Post('cart')
  createCart(@Body() dto: CreateCartDto) {
    return this.checkout.createCart(dto);
  }

  @Get('cart/:id')
  cart(@Param('id', ParseUUIDPipe) id: string) {
    return this.checkout.getCart(id);
  }

  @Post('cart/:id/items')
  addItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CartItemDto) {
    return this.checkout.upsertItem(id, dto);
  }

  @Patch('cart/:id/items/:variantId')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: CartItemDto,
  ) {
    return this.checkout.upsertItem(id, { ...dto, variantId });
  }

  @Post('cart/:id/items/:variantId/remove')
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.checkout.removeItem(id, variantId);
  }

  @Get('fulfillment/options')
  fulfillmentOptions(@Query() query: FulfillmentOptionsQuery) {
    return this.checkout.fulfillmentOptions(query);
  }

  @Post('checkout/cash')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  cashCheckout(
    @Body() dto: CashCheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.checkout.cashCheckout(dto, idempotencyKey);
  }

  @Post('checkout/online')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  onlineCheckout(
    @Body() dto: OnlineCheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.checkout.onlineCheckout(dto, idempotencyKey);
  }

  @Post('credit-applications')
  creditApplication(@Body() dto: CreditApplicationDto) {
    return this.checkout.createCreditApplication(dto);
  }

  @Post('product-availability-requests')
  productAvailabilityRequest(@Body() dto: ProductAvailabilityRequestDto) {
    return this.availability.createRequest(dto);
  }
}

@Module({
  imports: [PrismaModule, PaymentsModule, ProductAvailabilityModule],
  controllers: [StorefrontCatalogController, StorefrontCheckoutController],
  providers: [StorefrontCatalogService, CartCheckoutService],
})
export class StorefrontModule {}
