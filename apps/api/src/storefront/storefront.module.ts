import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { resolveInventoryLocationDisplayName } from '@itmarket/contracts';
import { withCanonicalLocationName } from '../inventory/format-location-display-name';
import { buildStorefrontCatalogFacetWhere } from './catalog-facet-filters.domain';
import { scoreCatalogSearchHit } from './catalog-search.domain';
import { selectCompanionCandidates } from './companion-products.domain';
import { buildStorefrontCatalogSearchWhere } from './storefront-catalog-search';
import { queryBestsellerSoldQuantities } from '../catalog/bestsellers-query';
import { HOME_BESTSELLERS_LIMIT } from '../catalog/bestsellers-ranking';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
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
  CatalogSlugEntityType,
  CatalogStatus,
  FulfillmentStatus,
  FulfillmentType,
  LocationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  StorefrontCampaignKind,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { recordFulfillmentEvent } from '../orders/fulfillment-events';
import { PaymentsModule, PaymentsService } from '../payments/payments.module';
import { AuthModule, LoginThrottle } from '../auth/auth.module';
import {
  matchesAdministrativeArea,
  normalizeAdministrativeAreaQuery,
  parseDeliverySpeedFromNotes,
  resolveCheckoutDeliveryFee,
} from '../common/administrative-areas';
import { encryptFinCode } from '../common/fin-code-crypto';
import type { Environment } from '../config/environment';
import { getClientIp } from '../security/client-ip';
import {
  ProductAvailabilityModule,
  ProductAvailabilityRequestDto,
  ProductAvailabilityService,
} from '../product-availability/product-availability.module';
import { CatalogModule } from '../catalog/catalog.module';
import {
  withMediaReadUrl,
  withMediaReadUrlList,
} from '../catalog/media-read-url';
import {
  PRODUCT_MEDIA_STORAGE,
  type ProductMediaStorage,
} from '../catalog/media-storage.port';
import { parseProductRequiredSpecs } from '../catalog/product-required-specs';
import { formatProductDisplayTitle } from '../catalog/format-product-display-title';
import {
  assertCartGuestAccess,
  CART_GUEST_TOKEN_HEADER,
  hashCartGuestToken,
} from './cart-guest-token';

export { CART_GUEST_TOKEN_HEADER };

const RESERVATION_TTL_MS = 15 * 60 * 1000;

const CHECKOUT_FIN_CODE_PATTERN = /^[A-Z0-9]{7}$/;

function normalizeCheckoutFinCode(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (!CHECKOUT_FIN_CODE_PATTERN.test(normalized)) {
    return undefined;
  }
  return normalized;
}

type CheckoutCartItem = {
  quantity: number;
  variant: {
    price: Prisma.Decimal;
    previousPrice: Prisma.Decimal | null;
  };
};

function resolveCheckoutLinePricing(item: CheckoutCartItem) {
  const saleUnitPrice = item.variant.price;
  const previousUnitPrice = item.variant.previousPrice;
  const hasSale =
    previousUnitPrice !== null &&
    previousUnitPrice !== undefined &&
    previousUnitPrice.gt(saleUnitPrice);
  const unitPrice = hasSale ? previousUnitPrice : saleUnitPrice;
  const discountTotal = hasSale
    ? previousUnitPrice.sub(saleUnitPrice).mul(item.quantity)
    : new Prisma.Decimal(0);
  const lineTotal = unitPrice.mul(item.quantity).sub(discountTotal);

  return { unitPrice, lineTotal, discountTotal };
}

function resolveCheckoutTotals(items: CheckoutCartItem[]) {
  return items.reduce(
    (totals, item) => {
      const line = resolveCheckoutLinePricing(item);
      return {
        subtotal: totals.subtotal.add(line.unitPrice.mul(item.quantity)),
        discountTotal: totals.discountTotal.add(line.discountTotal),
        payableSubtotal: totals.payableSubtotal.add(line.lineTotal),
      };
    },
    {
      subtotal: new Prisma.Decimal(0),
      discountTotal: new Prisma.Decimal(0),
      payableSubtotal: new Prisma.Decimal(0),
    },
  );
}

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

function parseOptionalBooleanQuery(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value as boolean;
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
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    parseOptionalBooleanQuery(value),
  )
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    parseOptionalBooleanQuery(value),
  )
  @IsBoolean()
  onSale?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  storage?: string;

  @IsOptional()
  @IsString()
  sort: 'newest' | 'name' | 'price' = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page?: number;

  /** Include extra gallery frames (Merchant additional_image_link). Cards use primary only. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    parseOptionalBooleanQuery(value),
  )
  @IsBoolean()
  gallery?: boolean;
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
    (dto: BaseCheckoutDto) => dto.fulfillmentType === FulfillmentType.DELIVERY,
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

class BaseCheckoutDto extends CheckoutContactDto {
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
    (dto: BaseCheckoutDto) => dto.fulfillmentType === FulfillmentType.DELIVERY,
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

class CashCheckoutDto extends BaseCheckoutDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ValidateIf(
    (dto: CashCheckoutDto) => dto.paymentMethod === PaymentMethod.INSTALLMENT,
  )
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(24)
  installmentMonths?: number;

  @ValidateIf(
    (dto: CashCheckoutDto) => dto.paymentMethod === PaymentMethod.INSTALLMENT,
  )
  @IsString()
  @MinLength(7)
  @MaxLength(7)
  @Matches(/^[A-Za-z0-9]{7}$/)
  finCode?: string;
}

class OnlineCheckoutDto extends BaseCheckoutDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(24)
  installmentMonths?: number;

  @IsOptional()
  @IsIn(['birbank', 'tamkart', 'leobank'])
  installmentProvider?: 'birbank' | 'tamkart' | 'leobank';

  @ValidateIf(
    (dto: OnlineCheckoutDto) => dto.paymentMethod === PaymentMethod.INSTALLMENT,
  )
  @IsString()
  @MinLength(7)
  @MaxLength(7)
  @Matches(/^[A-Za-z0-9]{7}$/)
  finCode?: string;
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

  @IsOptional()
  @IsEmail()
  email?: string;

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

const catalogVariantScalarOmit = {
  searchDocument: true,
  cost: true,
} as const;

const productSummaryInclude = {
  category: {
    select: {
      name: true,
      slug: true,
      parentId: true,
      parent: { select: { slug: true } },
    },
  },
  brand: { select: { name: true, slug: true } },
  media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  variants: {
    where: { status: CatalogStatus.ACTIVE },
    take: 1,
    omit: catalogVariantScalarOmit,
    include: {
      media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
      balances: { select: { onHand: true, reserved: true } },
    },
    orderBy: { price: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

type ProductSummaryRow = Prisma.ProductGetPayload<{
  include: typeof productSummaryInclude;
}>;

type ProductSummaryVariantRow = ProductSummaryRow['variants'][number];

const LISTING_PRIMARY_MEDIA_TAKE = 1;
const LISTING_GALLERY_MEDIA_TAKE = 10;

function catalogVariantListingInclude(gallery: boolean) {
  const mediaTake = gallery
    ? LISTING_GALLERY_MEDIA_TAKE
    : LISTING_PRIMARY_MEDIA_TAKE;
  return {
    media: { orderBy: { sortOrder: 'asc' as const }, take: mediaTake },
    balances: { select: { onHand: true, reserved: true } },
    product: {
      select: {
        id: true,
        name: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
        category: {
          select: {
            name: true,
            slug: true,
            parentId: true,
            parent: { select: { slug: true } },
          },
        },
        brand: { select: { name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' as const }, take: mediaTake },
        requiredSpecs: true,
      },
    },
  } satisfies Prisma.ProductVariantInclude;
}

type CatalogVariantListingRow = Prisma.ProductVariantGetPayload<{
  omit: typeof catalogVariantScalarOmit;
  include: ReturnType<typeof catalogVariantListingInclude>;
}>;

type CatalogListingProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: ProductSummaryRow['category'];
  brand: ProductSummaryRow['brand'];
  media: ProductSummaryRow['media'];
  requiredSpecs?: ProductSummaryRow['requiredSpecs'];
  updatedAt: Date;
};

function mapStorefrontCategory(category: {
  name: string;
  slug: string;
  parentId: string | null;
  parent?: { slug: string } | null;
}) {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    parentSlug: category.parent?.slug ?? null,
  };
}

function variantStockAvailable(
  balances: { onHand: number; reserved: number }[],
): number {
  return balances.reduce(
    (sum, balance) => sum + Math.max(0, balance.onHand - balance.reserved),
    0,
  );
}

type CatalogMediaFrame = {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder?: number;
};

function mapVariantMedia(
  media: CatalogMediaFrame | CatalogMediaFrame[] | null | undefined,
) {
  const entry = Array.isArray(media) ? (media[0] ?? null) : (media ?? null);
  if (entry === null || entry === undefined) {
    return null;
  }

  return {
    id: entry.id,
    objectKey: entry.objectKey,
    altText: entry.altText,
    mimeType: entry.mimeType,
    byteSize: entry.byteSize,
    sortOrder: entry.sortOrder ?? 0,
  };
}

function mapVariantMediaList(media: CatalogMediaFrame[] | null | undefined) {
  const entries = Array.isArray(media) ? media : [];
  return entries
    .map((entry) => mapVariantMedia(entry))
    .filter(
      (
        entry,
      ): entry is {
        id: string;
        objectKey: string;
        altText: string;
        mimeType: string;
        byteSize: number;
        sortOrder: number;
      } => entry !== null,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function parseVariantAttributeRecord(
  value: Prisma.JsonValue,
): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const attributes: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry.trim() !== '') {
      attributes[key] = entry.trim();
    }
  }

  return attributes;
}

function mapVariantToCatalogItem(
  product: CatalogListingProduct,
  variant: ProductSummaryVariantRow,
) {
  const variantGallery = mapVariantMediaList(variant.media);
  const productGallery = mapVariantMediaList(product.media);
  const gallery = variantGallery.length > 0 ? variantGallery : productGallery;
  const primary = gallery[0] ?? null;
  const additionalImages = gallery.slice(1);

  return {
    id: product.id,
    name: formatProductDisplayTitle(product, variant),
    slug: product.slug,
    description: product.description ?? null,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    category: mapStorefrontCategory(product.category),
    brand: product.brand,
    image: primary,
    ...(additionalImages.length > 0 ? { additionalImages } : {}),
    price: variant.price.toFixed(2),
    previousPrice:
      variant.previousPrice === null || variant.previousPrice === undefined
        ? null
        : variant.previousPrice.toFixed(2),
    currency: variant.currency ?? 'AZN',
    available: variantStockAvailable(variant.balances),
    availableByOrder: variant.availableByOrder,
    defaultVariantId: variant.id,
    sku: variant.sku,
    barcode: variant.barcode,
    variantName: variant.name,
    variantAttributes: parseVariantAttributeRecord(variant.attributes),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function mapCatalogVariantListingRow(row: CatalogVariantListingRow) {
  return mapVariantToCatalogItem(row.product, row);
}

const STOREFRONT_SEARCH_RANK_FETCH = 48;

function storefrontSearchRankFields(
  item: ReturnType<typeof mapVariantToCatalogItem>,
) {
  const attributes = item.variantAttributes ?? {};
  return {
    sku: item.sku,
    barcode: item.barcode,
    variantName: item.variantName ?? '',
    productName: item.name,
    brandName: item.brand?.name ?? null,
    colorName:
      attributes['Rəng'] ?? attributes.Color ?? attributes.color ?? null,
    extraText: Object.values(attributes).join(' '),
  };
}

function rankStorefrontSearchItems<
  T extends ReturnType<typeof mapVariantToCatalogItem>,
>(search: string, items: T[]): T[] {
  return [...items].sort((left, right) => {
    const delta =
      scoreCatalogSearchHit(search, storefrontSearchRankFields(right)) -
      scoreCatalogSearchHit(search, storefrontSearchRankFields(left));
    if (delta !== 0) {
      return delta;
    }
    return left.name.localeCompare(right.name, 'az');
  });
}

function collectCatalogItemsFromProducts(
  products: ProductSummaryRow[],
  limit?: number,
) {
  const items: ReturnType<typeof mapVariantToCatalogItem>[] = [];

  for (const product of products) {
    for (const variant of product.variants) {
      items.push(mapVariantToCatalogItem(product, variant));
      if (limit !== undefined && items.length >= limit) {
        return items;
      }
    }
  }

  return items;
}

function collectPrimaryCatalogItemsFromProducts(products: ProductSummaryRow[]) {
  const items: ReturnType<typeof mapVariantToCatalogItem>[] = [];

  for (const product of products) {
    const variant = product.variants[0];
    if (variant === undefined) {
      continue;
    }
    items.push(mapVariantToCatalogItem(product, variant));
  }

  return items;
}

type ProductReviewSummary = {
  averageRating: number | null;
  count: number;
};

const EMPTY_PRODUCT_REVIEW_SUMMARY: ProductReviewSummary = {
  averageRating: null,
  count: 0,
};

function withReviewSummaries<T extends { id: string }>(
  items: T[],
  summaries: Map<string, ProductReviewSummary>,
): (T & { reviewSummary: ProductReviewSummary })[] {
  return items.map((item) => ({
    ...item,
    reviewSummary: summaries.get(item.id) ?? EMPTY_PRODUCT_REVIEW_SUMMARY,
  }));
}

@Injectable()
class StorefrontCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_MEDIA_STORAGE)
    private readonly mediaStorage: ProductMediaStorage,
  ) {}

  private async withCatalogItemImageUrl<
    T extends {
      image: {
        id: string;
        objectKey: string;
        altText: string;
        mimeType: string;
        byteSize: number;
        sortOrder: number;
      } | null;
    },
  >(item: T): Promise<T> {
    return {
      ...item,
      image: await withMediaReadUrl(this.mediaStorage, item.image),
    };
  }

  private async categoryWhereForSlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, status: CatalogStatus.ACTIVE },
      select: { id: true, parentId: true },
    });

    if (category === null) {
      return { slug, status: CatalogStatus.ACTIVE };
    }

    if (category.parentId === null) {
      return {
        status: CatalogStatus.ACTIVE,
        OR: [
          { id: category.id },
          { parentId: category.id, status: CatalogStatus.ACTIVE },
        ],
      };
    }

    return { slug, status: CatalogStatus.ACTIVE };
  }

  private async attachReviewSummaries<
    T extends { id: string; defaultVariantId: string | null },
  >(items: T[]): Promise<(T & { reviewSummary: ProductReviewSummary })[]> {
    if (items.length === 0) {
      return [];
    }

    const variantIds = [
      ...new Set(
        items
          .map((item) => item.defaultVariantId)
          .filter((variantId): variantId is string => variantId !== null),
      ),
    ];
    if (variantIds.length === 0) {
      return withReviewSummaries(items, new Map());
    }

    const groups = await this.prisma.productReview.groupBy({
      by: ['variantId'],
      where: {
        variantId: { in: variantIds },
        published: true,
        order: {
          status: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const summaries = new Map(
      groups.map((group) => [
        group.variantId,
        {
          averageRating:
            group._avg.rating === null
              ? null
              : Math.round(group._avg.rating * 10) / 10,
          count: group._count.rating,
        },
      ]),
    );

    return items.map((item) => ({
      ...item,
      reviewSummary:
        item.defaultVariantId === null
          ? EMPTY_PRODUCT_REVIEW_SUMMARY
          : (summaries.get(item.defaultVariantId) ??
            EMPTY_PRODUCT_REVIEW_SUMMARY),
    }));
  }

  async listProducts(query: StorefrontCatalogQuery) {
    const categoryFilter =
      query.category === undefined
        ? { status: CatalogStatus.ACTIVE }
        : await this.categoryWhereForSlug(query.category);
    const orderBy =
      query.sort === 'name'
        ? ([
            { product: { name: 'asc' as const } },
            { price: 'asc' as const },
            { id: 'asc' as const },
          ] as const)
        : query.sort === 'price'
          ? ([
              { price: 'asc' as const },
              { product: { name: 'asc' as const } },
              { id: 'asc' as const },
            ] as const)
          : ([
              { product: { createdAt: 'desc' as const } },
              { price: 'asc' as const },
              { id: 'asc' as const },
            ] as const);
    const searchWhere = buildStorefrontCatalogSearchWhere(query.search);
    const facetWhere = buildStorefrontCatalogFacetWhere({
      ...(query.minPrice === undefined ? {} : { minPrice: query.minPrice }),
      ...(query.maxPrice === undefined ? {} : { maxPrice: query.maxPrice }),
      ...(query.inStock === undefined ? {} : { inStock: query.inStock }),
      ...(query.onSale === undefined ? {} : { onSale: query.onSale }),
      ...(query.color === undefined ? {} : { color: query.color }),
      ...(query.ram === undefined ? {} : { ram: query.ram }),
      ...(query.storage === undefined ? {} : { storage: query.storage }),
    });
    const andFilters = [searchWhere, facetWhere].filter(
      (entry): entry is Prisma.ProductVariantWhereInput => entry !== undefined,
    );
    const where: Prisma.ProductVariantWhereInput = {
      status: CatalogStatus.ACTIVE,
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
      product: {
        status: CatalogStatus.ACTIVE,
        category: categoryFilter,
        ...(query.brand === undefined
          ? {}
          : { brand: { slug: query.brand, status: CatalogStatus.ACTIVE } }),
      },
    };

    if (query.page !== undefined) {
      const pageSize = query.limit;
      const page = query.page;
      const [totalCount, rows] = await Promise.all([
        this.prisma.productVariant.count({ where }),
        this.prisma.productVariant.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where,
          omit: catalogVariantScalarOmit,
          include: catalogVariantListingInclude(query.gallery === true),
          orderBy: [...orderBy],
        }),
      ]);
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const mapped = await Promise.all(
        rows
          .map(mapCatalogVariantListingRow)
          .map((item) => this.withCatalogItemImageUrl(item)),
      );
      return {
        items: await this.attachReviewSummaries(mapped),
        nextCursor:
          page < totalPages ? (mapped.at(-1)?.defaultVariantId ?? null) : null,
        page,
        pageSize,
        totalCount,
        totalPages,
      };
    }

    const searchText = query.search?.trim() ?? '';
    const rankSearch = searchText !== '' && query.cursor === undefined;
    const fetchLimit = rankSearch
      ? Math.max(query.limit + 1, STOREFRONT_SEARCH_RANK_FETCH)
      : query.limit + 1;
    const rows = await this.prisma.productVariant.findMany({
      take: fetchLimit,
      ...(query.cursor === undefined
        ? {}
        : { cursor: { id: query.cursor }, skip: 1 }),
      where,
      omit: catalogVariantScalarOmit,
      include: catalogVariantListingInclude(query.gallery === true),
      orderBy: [...orderBy],
    });
    const mappedRows = rankSearch ? rows : rows.slice(0, query.limit);
    const ranked = await Promise.all(
      mappedRows
        .map(mapCatalogVariantListingRow)
        .map((item) => this.withCatalogItemImageUrl(item)),
    );
    const mapped = rankSearch
      ? rankStorefrontSearchItems(searchText, ranked).slice(0, query.limit)
      : ranked;
    return {
      items: await this.attachReviewSummaries(mapped),
      nextCursor:
        rows.length > query.limit ? mapped.at(-1)?.defaultVariantId : null,
      page: null,
      pageSize: query.limit,
      totalCount: null,
      totalPages: null,
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
    const sortedProducts = rows.sort((left, right) => {
      const leftSameBrand = left.brandId === source.brandId ? 0 : 1;
      const rightSameBrand = right.brandId === source.brandId ? 0 : 1;
      return (
        leftSameBrand - rightSameBrand ||
        right.createdAt.getTime() - left.createdAt.getTime()
      );
    });
    const items = await Promise.all(
      collectCatalogItemsFromProducts(sortedProducts, limit).map((item) =>
        this.withCatalogItemImageUrl(item),
      ),
    );
    return { items: await this.attachReviewSummaries(items) };
  }

  private async categoryFamilyIds(category: {
    id: string;
    parentId: string | null;
  }): Promise<string[]> {
    let rootId = category.id;
    let parentId = category.parentId;
    while (parentId !== null) {
      const parent = await this.prisma.category.findFirst({
        where: { id: parentId, status: CatalogStatus.ACTIVE },
        select: { id: true, parentId: true },
      });
      if (parent === null) {
        break;
      }
      rootId = parent.id;
      parentId = parent.parentId;
    }

    const children = await this.prisma.category.findMany({
      where: { parentId: rootId, status: CatalogStatus.ACTIVE },
      select: { id: true },
    });
    return [rootId, ...children.map((child) => child.id)];
  }

  async companionProducts(slug: string, limit = 4) {
    const source = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: CatalogStatus.ACTIVE },
      select: {
        id: true,
        brandId: true,
        category: {
          select: { id: true, parentId: true, slug: true, name: true },
        },
      },
    });
    const familyCategoryIds = await this.categoryFamilyIds(source.category);
    const rows = await this.prisma.product.findMany({
      take: Math.min(limit * 8, 48),
      where: {
        status: CatalogStatus.ACTIVE,
        id: { not: source.id },
        categoryId: { in: familyCategoryIds },
        variants: { some: { status: CatalogStatus.ACTIVE } },
      },
      include: productSummaryInclude,
      orderBy: { createdAt: 'desc' },
    });
    const selected = selectCompanionCandidates(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        brandId: row.brandId,
        createdAt: row.createdAt,
        category: {
          name: row.category.name,
          slug: row.category.slug,
        },
        price: row.variants[0]?.price.toNumber() ?? null,
      })),
      { id: source.id, brandId: source.brandId },
      limit,
    );
    const selectedIds = new Set(selected.map((item) => item.id));
    const sortedProducts = rows
      .filter((row) => selectedIds.has(row.id))
      .sort(
        (left, right) =>
          selected.findIndex((item) => item.id === left.id) -
          selected.findIndex((item) => item.id === right.id),
      );
    const items = await Promise.all(
      collectCatalogItemsFromProducts(sortedProducts, limit).map((item) =>
        this.withCatalogItemImageUrl(item),
      ),
    );
    return { items: await this.attachReviewSummaries(items) };
  }

  async resolveSlugRedirect(entityTypeRaw: string, oldSlug: string) {
    const normalizedType = entityTypeRaw.trim().toUpperCase();
    if (
      normalizedType !== CatalogSlugEntityType.PRODUCT &&
      normalizedType !== CatalogSlugEntityType.CATEGORY &&
      normalizedType !== CatalogSlugEntityType.BRAND
    ) {
      throw new BadRequestException('Unsupported slug entity type');
    }
    const entityType = normalizedType as CatalogSlugEntityType;
    const slug = oldSlug.trim();
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const redirect = await this.prisma.catalogSlugRedirect.findUnique({
      where: {
        entityType_oldSlug: { entityType, oldSlug: slug },
      },
    });
    if (redirect === null) {
      throw new NotFoundException('Slug redirect not found');
    }

    if (redirect.targetPath !== null) {
      return {
        entityType,
        oldSlug: redirect.oldSlug,
        newSlug: redirect.newSlug,
        path: redirect.targetPath,
      };
    }

    let targetActive = false;
    if (entityType === CatalogSlugEntityType.PRODUCT) {
      targetActive =
        (await this.prisma.product.count({
          where: {
            id: redirect.entityId,
            slug: redirect.newSlug,
            status: CatalogStatus.ACTIVE,
          },
        })) > 0;
    } else if (entityType === CatalogSlugEntityType.CATEGORY) {
      targetActive =
        (await this.prisma.category.count({
          where: {
            id: redirect.entityId,
            slug: redirect.newSlug,
            status: CatalogStatus.ACTIVE,
          },
        })) > 0;
    } else {
      targetActive =
        (await this.prisma.brand.count({
          where: {
            id: redirect.entityId,
            slug: redirect.newSlug,
            status: CatalogStatus.ACTIVE,
          },
        })) > 0;
    }

    if (!targetActive) {
      await this.prisma.catalogSlugRedirect.delete({
        where: { id: redirect.id },
      });
      throw new NotFoundException('Slug redirect target is inactive');
    }

    const pathPrefix =
      entityType === CatalogSlugEntityType.PRODUCT
        ? '/products'
        : entityType === CatalogSlugEntityType.CATEGORY
          ? '/categories'
          : '/brands';

    return {
      entityType,
      oldSlug: redirect.oldSlug,
      newSlug: redirect.newSlug,
      path: `${pathPrefix}/${redirect.newSlug}`,
    };
  }

  async product(slug: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: CatalogStatus.ACTIVE },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
            parentId: true,
            parent: { select: { slug: true } },
          },
        },
        brand: { select: { name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { status: CatalogStatus.ACTIVE },
          include: {
            media: { orderBy: { sortOrder: 'asc' as const } },
            balances: { select: { onHand: true, reserved: true } },
          },
          orderBy: { price: 'asc' },
        },
      },
    });
    const media = await withMediaReadUrlList(this.mediaStorage, product.media);
    const variants = await Promise.all(
      product.variants.map(async (variant) => {
        const variantMedia = await withMediaReadUrlList(
          this.mediaStorage,
          variant.media,
        );
        return {
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
          availableByOrder: variant.availableByOrder,
          media: variantMedia,
          image: variantMedia[0] ?? null,
        };
      }),
    );
    const firstVariant = variants[0];
    const publishedReviewWhere = {
      productId: product.id,
      published: true,
      order: {
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
      },
    } as const;
    const [reviews, defaultVariantSummary] = await Promise.all([
      this.prisma.productReview.findMany({
        where: publishedReviewWhere,
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          variantId: true,
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
      firstVariant === undefined
        ? Promise.resolve(null)
        : this.prisma.productReview.aggregate({
            where: {
              ...publishedReviewWhere,
              variantId: firstVariant.id,
            },
            _avg: { rating: true },
            _count: { rating: true },
          }),
    ]);
    const mappedReviews = reviews.map((review) => ({
      id: review.id,
      variantId: review.variantId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      authorName: formatReviewAuthorName(review.customer),
    }));
    const reviewSummary: ProductReviewSummary =
      defaultVariantSummary === null ||
      defaultVariantSummary._count.rating === 0
        ? EMPTY_PRODUCT_REVIEW_SUMMARY
        : {
            averageRating:
              defaultVariantSummary._avg.rating === null
                ? null
                : Math.round(defaultVariantSummary._avg.rating * 10) / 10,
            count: defaultVariantSummary._count.rating,
          };

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      category: mapStorefrontCategory(product.category),
      brand: product.brand,
      image: media[0] ?? null,
      media,
      price: firstVariant === undefined ? null : firstVariant.price,
      previousPrice: firstVariant?.previousPrice ?? null,
      currency: firstVariant?.currency ?? 'AZN',
      available: variants.reduce((sum, variant) => sum + variant.available, 0),
      availableByOrder: firstVariant?.availableByOrder ?? false,
      reviewSummary,
      reviews: mappedReviews,
      requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
      variants,
    };
  }

  categories() {
    return this.prisma.category.findMany({
      where: { status: CatalogStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        sortOrder: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  brands() {
    return this.prisma.brand.findMany({
      where: { status: CatalogStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        logoObjectKey: true,
        logoScalePercent: true,
        logoOffsetX: true,
        logoOffsetY: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async primaryPickupLocation() {
    return this.prisma.pickupLocation.findFirst({
      where: { active: true },
      select: {
        name: true,
        addressLine: true,
        workingHours: true,
        contactLabel: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  banners() {
    return this.prisma.storefrontBanner.findMany({
      where: { status: CatalogStatus.ACTIVE },
      select: {
        id: true,
        placement: true,
        altText: true,
        href: true,
        imageObjectKey: true,
        sortOrder: true,
      },
      orderBy: [
        { placement: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  private async mapPrimaryProductsByIds(productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: CatalogStatus.ACTIVE,
        variants: { some: { status: CatalogStatus.ACTIVE } },
      },
      include: productSummaryInclude,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = productIds.flatMap((id) => {
      const product = byId.get(id);
      return product === undefined ? [] : [product];
    });
    const mapped = await Promise.all(
      collectPrimaryCatalogItemsFromProducts(ordered).map((item) =>
        this.withCatalogItemImageUrl(item),
      ),
    );
    return this.attachReviewSummaries(mapped);
  }

  async bestsellers() {
    const ranked = await queryBestsellerSoldQuantities(this.prisma, {
      limit: HOME_BESTSELLERS_LIMIT,
    });
    return {
      items: await this.mapPrimaryProductsByIds(
        ranked.map((row) => row.productId),
      ),
    };
  }

  async weeklyDeals() {
    const rows = await this.prisma.storefrontCampaignProduct.findMany({
      where: { kind: StorefrontCampaignKind.WEEKLY_DEAL },
      select: { productId: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      items: await this.mapPrimaryProductsByIds(
        rows.map((row) => row.productId),
      ),
    };
  }
}

@Injectable()
class CartCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    @Inject(PRODUCT_MEDIA_STORAGE)
    private readonly mediaStorage: ProductMediaStorage,
    private readonly throttle: LoginThrottle,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private appSecret(): string {
    return this.config.get('APP_SECRET', { infer: true });
  }

  async createCart(dto: CreateCartDto, ip: string) {
    await this.throttle.assertAllowed('storefront-cart-create', ip, ip);
    if (dto.guestToken !== undefined) {
      const tokenHash = hashCartGuestToken(dto.guestToken);
      const existing = await this.prisma.cart.findFirst({
        where: {
          status: CartStatus.ACTIVE,
          guestTokenHash: tokenHash,
        },
        select: {
          id: true,
          status: true,
          guestToken: true,
          guestTokenHash: true,
        },
      });
      if (existing !== null) {
        if (existing.guestToken !== null) {
          await this.prisma.cart.update({
            where: { id: existing.id },
            data: { guestToken: null },
          });
        }
        await this.throttle.consumeSuccessQuota(
          'storefront-cart-create',
          ip,
          ip,
          {
            maxUses: 30,
            windowSeconds: 3600,
          },
        );
        return {
          id: existing.id,
          guestToken: dto.guestToken,
          status: existing.status,
        };
      }
      // Do not accept client-chosen tokens for new carts (entropy / predictability).
    }
    const guestToken = randomBytes(32).toString('base64url');
    const created = await this.prisma.cart.create({
      data: { guestTokenHash: hashCartGuestToken(guestToken) },
      select: { id: true, status: true },
    });
    await this.throttle.consumeSuccessQuota('storefront-cart-create', ip, ip, {
      maxUses: 30,
      windowSeconds: 3600,
    });
    return { id: created.id, guestToken, status: created.status };
  }

  async getCart(id: string, guestToken: string | undefined) {
    await this.assertCartGuestAccess(id, guestToken);
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                media: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
                product: {
                  select: {
                    name: true,
                    slug: true,
                    brand: { select: { name: true } },
                    requiredSpecs: true,
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
    const items = await Promise.all(
      cart.items.map(async (item) => {
        const unitPrice = item.variant.price;
        const previousUnitPrice = item.variant.previousPrice;
        const hasSale =
          previousUnitPrice !== null &&
          previousUnitPrice !== undefined &&
          previousUnitPrice.gt(unitPrice);
        return {
          id: item.id,
          variantId: item.variantId,
          productName: formatProductDisplayTitle(
            item.variant.product,
            item.variant,
          ),
          productSlug: item.variant.product.slug,
          image: await withMediaReadUrl(
            this.mediaStorage,
            mapVariantMedia(item.variant.media) ??
              mapVariantMedia(item.variant.product.media[0] ?? null),
          ),
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
      }),
    );
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );
    return {
      id: cart.id,
      status: cart.status,
      items,
      subtotal: subtotal.toFixed(2),
      currency: cart.currency,
    };
  }

  async upsertItem(
    cartId: string,
    dto: CartItemDto,
    guestToken: string | undefined,
    ip: string,
  ) {
    await this.throttle.assertAllowed('storefront-cart-mutate', ip, ip);
    await this.assertCartGuestAccess(cartId, guestToken);
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        status: CatalogStatus.ACTIVE,
        product: { status: CatalogStatus.ACTIVE },
      },
      select: {
        id: true,
        balances: { select: { onHand: true, reserved: true } },
      },
    });
    if (variant === null)
      throw new BadRequestException('Variant is not active');
    const available = variantStockAvailable(variant.balances);
    if (dto.quantity > available) {
      throw new ConflictException('Insufficient available stock');
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: dto.variantId } },
      create: { cartId, variantId: dto.variantId, quantity: dto.quantity },
      update: { quantity: dto.quantity },
    });
    await this.throttle.consumeSuccessQuota('storefront-cart-mutate', ip, ip, {
      maxUses: 120,
      windowSeconds: 3600,
    });
    return this.getCart(cartId, guestToken);
  }

  async removeItem(
    cartId: string,
    variantId: string,
    guestToken: string | undefined,
    ip: string,
  ) {
    await this.throttle.assertAllowed('storefront-cart-mutate', ip, ip);
    await this.assertCartGuestAccess(cartId, guestToken);
    await this.prisma.cartItem.deleteMany({ where: { cartId, variantId } });
    await this.throttle.consumeSuccessQuota('storefront-cart-mutate', ip, ip, {
      maxUses: 120,
      windowSeconds: 3600,
    });
    return this.getCart(cartId, guestToken);
  }

  async fulfillmentOptions(
    query: FulfillmentOptionsQuery,
    guestToken: string | undefined,
  ) {
    const administrativeArea = normalizeAdministrativeAreaQuery(
      query.administrativeArea,
    );
    const subtotal =
      query.cartId === undefined
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(
            (await this.getCart(query.cartId, guestToken)).subtotal,
          );
    const allZones = await this.prisma.deliveryZone.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    const zones =
      administrativeArea === undefined
        ? allZones
        : allZones.filter((zone) =>
            coveredAdministrativeAreas(zone.coveredAdministrativeAreas).some(
              (area) => matchesAdministrativeArea(area, administrativeArea),
            ),
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
        fee: resolveCheckoutDeliveryFee({
          zoneFee: zone.fee.toFixed(2),
          freeDeliveryMinimum: zone.freeDeliveryMinimum?.toFixed(2) ?? null,
          subtotal: subtotal.toFixed(2),
          administrativeArea: administrativeArea ?? null,
          fulfillmentType: 'DELIVERY',
        }),
        freeDeliveryMinimum: zone.freeDeliveryMinimum?.toFixed(2) ?? null,
        estimatedMinDays: zone.estimatedMinDays,
        estimatedMaxDays: zone.estimatedMaxDays,
      })),
      pickupLocations: pickupLocations.map((pickup) => ({
        id: pickup.id,
        code: pickup.code,
        name: resolveInventoryLocationDisplayName(pickup) ?? pickup.name,
        addressLine: pickup.addressLine,
        workingHours: pickup.workingHours,
        stockLocation: withCanonicalLocationName(pickup.location),
      })),
    };
  }

  paymentOptions(cartId: string | undefined) {
    return this.payments.paymentOptions(cartId);
  }

  async onlineCheckout(
    dto: OnlineCheckoutDto,
    idempotencyKey: string | undefined,
    guestToken: string | undefined,
    ip: string,
  ) {
    await this.throttle.assertAllowed('storefront-checkout-online', ip, ip);
    await this.assertCartGuestAccess(dto.cartId, guestToken);
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

    const paymentOptions = await this.payments.paymentOptions(
      dto.cartId,
      guestToken,
    );
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
    if (
      dto.paymentMethod === PaymentMethod.INSTALLMENT &&
      dto.installmentProvider === undefined
    ) {
      throw new BadRequestException(
        'Installment provider selection is required',
      );
    }
    if (
      dto.paymentMethod !== PaymentMethod.INSTALLMENT &&
      dto.installmentProvider !== undefined
    ) {
      throw new BadRequestException(
        'Installment provider can only be sent for installment payments',
      );
    }
    if (dto.paymentMethod === PaymentMethod.INSTALLMENT) {
      const finCode = normalizeCheckoutFinCode(dto.finCode);
      if (finCode === undefined) {
        throw new BadRequestException(
          'FIN code is required for installment checkout',
        );
      }
      dto.finCode = finCode;
    } else if (dto.finCode !== undefined) {
      throw new BadRequestException(
        'FIN code can only be sent for installment payments',
      );
    }

    const result = await this.prisma.$transaction(
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
          // Never put providerCheckoutToken (hash-at-rest) into the handoff URL.
          const attemptToken = await this.payments.rotateAttemptCapabilityToken(
            tx,
            existingAttempt.id,
          );
          return {
            id: existing.id,
            orderNumber: existing.orderNumber,
            grandTotal: existing.grandTotal.toFixed(2),
            currency: existing.currency,
            checkoutUrl: this.payments.buildHandoffUrl({
              attemptToken,
              orderNumber: existing.orderNumber,
              paymentMethod: existing.payment.method,
              amount: existingAttempt.amount,
              installmentMonths: existingAttempt.installmentMonths,
              ...(dto.installmentProvider === undefined
                ? {}
                : { installmentProvider: dto.installmentProvider }),
            }),
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
        const checkoutTotals = resolveCheckoutTotals(cart.items);
        const subtotal = checkoutTotals.subtotal;
        const discountTotal = checkoutTotals.discountTotal;
        const payableSubtotal = checkoutTotals.payableSubtotal;
        const deliveryFee =
          dto.fulfillmentType === FulfillmentType.DELIVERY
            ? this.deliveryFee(
                fulfillment.deliveryZone ??
                  (() => {
                    throw new BadRequestException('Delivery zone is required');
                  })(),
                payableSubtotal,
                normalizeAdministrativeAreaQuery(dto.administrativeArea),
                dto.notes,
              )
            : new Prisma.Decimal(0);
        const grandTotal = subtotal.sub(discountTotal).add(deliveryFee);
        const orderAddressLine =
          dto.fulfillmentType === FulfillmentType.PICKUP
            ? fulfillment.pickupLocation!.addressLine
            : (dto.addressLine ??
              (() => {
                throw new BadRequestException(
                  'Address line is required for delivery',
                );
              })());
        const customerId = this.resolveCustomerId(cart.customerId);
        const order = await tx.order.create({
          data: {
            orderNumber: await this.nextOrderNumber(tx),
            checkoutIdempotencyKey: idempotencyKey,
            cartId: cart.id,
            customerId,
            guestEmail: dto.email,
            guestPhone: dto.phone,
            ...(dto.paymentMethod === PaymentMethod.INSTALLMENT &&
            dto.finCode !== undefined
              ? { finCode: encryptFinCode(dto.finCode, this.appSecret()) }
              : {}),
            fulfillmentType: dto.fulfillmentType,
            deliveryZoneId: dto.deliveryZoneId ?? null,
            pickupLocationId: dto.pickupLocationId ?? null,
            status: 'PENDING_PAYMENT',
            paymentStatus: 'PENDING',
            fulfillmentStatus: FulfillmentStatus.RESERVED,
            subtotal,
            discountTotal,
            deliveryFee,
            grandTotal,
            items: {
              create: cart.items.map((item) => {
                const pricing = resolveCheckoutLinePricing(item);
                return {
                  variant: { connect: { id: item.variantId } },
                  productName: formatProductDisplayTitle(
                    item.variant.product,
                    item.variant,
                  ),
                  variantName: item.variant.name,
                  sku: item.variant.sku,
                  barcode: item.variant.barcode,
                  quantity: item.quantity,
                  unitPrice: pricing.unitPrice,
                  discountTotal: pricing.discountTotal,
                  lineTotal: pricing.lineTotal,
                  currency: item.variant.currency,
                  attributesSnapshot:
                    item.variant.attributes === null
                      ? Prisma.JsonNull
                      : (item.variant.attributes as Prisma.InputJsonValue),
                };
              }),
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
                fulfillmentStatus: FulfillmentStatus.RESERVED,
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
          ...(dto.installmentProvider === undefined
            ? {}
            : { installmentProvider: dto.installmentProvider }),
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
          fulfillmentStatus: FulfillmentStatus.RESERVED,
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
    await this.throttle.consumeSuccessQuota(
      'storefront-checkout-online',
      ip,
      ip,
      { maxUses: 20, windowSeconds: 3600 },
    );
    return result;
  }

  async cashCheckout(
    dto: CashCheckoutDto,
    idempotencyKey: string | undefined,
    guestToken: string | undefined,
    ip: string,
  ) {
    await this.throttle.assertAllowed('storefront-checkout-cash', ip, ip);
    await this.assertCartGuestAccess(dto.cartId, guestToken);
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
    const isInstallmentCheckout =
      dto.paymentMethod === PaymentMethod.INSTALLMENT;
    // D-004: çatdırılmada nağd (COD) yoxdur; yalnız pickup nağd və ya delivery taksit/online.
    if (
      dto.fulfillmentType === FulfillmentType.DELIVERY &&
      !isInstallmentCheckout
    ) {
      throw new BadRequestException(
        'Cash on delivery is not available (D-004). Use card/installment for delivery, or cash at pickup.',
      );
    }
    const result = await this.prisma.$transaction(
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
        const checkoutTotals = resolveCheckoutTotals(cart.items);
        const subtotal = checkoutTotals.subtotal;
        const discountTotal = checkoutTotals.discountTotal;
        const payableSubtotal = checkoutTotals.payableSubtotal;
        const deliveryFee =
          dto.fulfillmentType === FulfillmentType.DELIVERY
            ? this.deliveryFee(
                fulfillment.deliveryZone ??
                  (() => {
                    throw new BadRequestException('Delivery zone is required');
                  })(),
                payableSubtotal,
                normalizeAdministrativeAreaQuery(dto.administrativeArea),
                dto.notes,
              )
            : new Prisma.Decimal(0);
        const grandTotal = subtotal.sub(discountTotal).add(deliveryFee);
        const orderAddressLine =
          dto.fulfillmentType === FulfillmentType.PICKUP
            ? fulfillment.pickupLocation!.addressLine
            : (dto.addressLine ??
              (() => {
                throw new BadRequestException(
                  'Address line is required for delivery',
                );
              })());
        const customerId = this.resolveCustomerId(cart.customerId);
        const isInstallmentCheckout =
          dto.paymentMethod === PaymentMethod.INSTALLMENT;
        if (isInstallmentCheckout && dto.installmentMonths === undefined) {
          throw new BadRequestException(
            'Installment month selection is required',
          );
        }
        if (isInstallmentCheckout) {
          const finCode = normalizeCheckoutFinCode(dto.finCode);
          if (finCode === undefined) {
            throw new BadRequestException(
              'FIN code is required for installment checkout',
            );
          }
          dto.finCode = finCode;
        } else if (dto.finCode !== undefined) {
          throw new BadRequestException(
            'FIN code can only be sent for installment payments',
          );
        }
        const initialOrderStatus = isInstallmentCheckout
          ? OrderStatus.UNDER_REVIEW
          : OrderStatus.CONFIRMED;
        const initialFulfillmentStatus = FulfillmentStatus.RESERVED;
        const order = await tx.order.create({
          data: {
            orderNumber: await this.nextOrderNumber(tx),
            checkoutIdempotencyKey: idempotencyKey,
            cartId: cart.id,
            customerId,
            guestEmail: dto.email,
            guestPhone: dto.phone,
            ...(isInstallmentCheckout && dto.finCode !== undefined
              ? { finCode: encryptFinCode(dto.finCode, this.appSecret()) }
              : {}),
            fulfillmentType: dto.fulfillmentType,
            deliveryZoneId: dto.deliveryZoneId ?? null,
            pickupLocationId: dto.pickupLocationId ?? null,
            status: initialOrderStatus,
            paymentStatus: PaymentStatus.PENDING,
            fulfillmentStatus: initialFulfillmentStatus,
            subtotal,
            discountTotal,
            deliveryFee,
            grandTotal,
            items: {
              create: cart.items.map((item) => {
                const pricing = resolveCheckoutLinePricing(item);
                return {
                  variant: { connect: { id: item.variantId } },
                  productName: formatProductDisplayTitle(
                    item.variant.product,
                    item.variant,
                  ),
                  variantName: item.variant.name,
                  sku: item.variant.sku,
                  barcode: item.variant.barcode,
                  quantity: item.quantity,
                  unitPrice: pricing.unitPrice,
                  discountTotal: pricing.discountTotal,
                  lineTotal: pricing.lineTotal,
                  currency: item.variant.currency,
                  attributesSnapshot:
                    item.variant.attributes === null
                      ? Prisma.JsonNull
                      : (item.variant.attributes as Prisma.InputJsonValue),
                };
              }),
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
                orderStatus: initialOrderStatus,
                paymentStatus: PaymentStatus.PENDING,
                fulfillmentStatus: initialFulfillmentStatus,
                reason: isInstallmentCheckout
                  ? 'installment checkout created'
                  : 'cash checkout created',
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
            action: isInstallmentCheckout
              ? 'order.installment-created'
              : 'order.cash-created',
            entityType: 'order',
            entityId: order.id,
            after: {
              orderNumber: order.orderNumber,
              cartId: cart.id,
              idempotencyKey,
              grandTotal: grandTotal.toFixed(2),
              currency: 'AZN',
              ...(isInstallmentCheckout
                ? {
                    paymentMethod: PaymentMethod.INSTALLMENT,
                    installmentMonths: dto.installmentMonths,
                  }
                : {}),
            },
          },
        });
        await recordFulfillmentEvent(tx, order.id, {
          orderStatus: initialOrderStatus,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: initialFulfillmentStatus,
          eventType: isInstallmentCheckout
            ? 'orders.installment.created'
            : 'orders.cash.created',
          reason: isInstallmentCheckout
            ? 'installment checkout created'
            : 'cash checkout created',
          payload: {
            orderNumber: order.orderNumber,
            cartId: cart.id,
            ...(isInstallmentCheckout
              ? {
                  paymentMethod: PaymentMethod.INSTALLMENT,
                  installmentMonths: dto.installmentMonths,
                }
              : {}),
          },
        });
        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { items: true, address: true, reservations: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.throttle.consumeSuccessQuota(
      'storefront-checkout-cash',
      ip,
      ip,
      { maxUses: 20, windowSeconds: 3600 },
    );
    return result;
  }

  private async assertCartGuestAccess(
    cartId: string,
    guestToken: string | undefined,
  ) {
    await assertCartGuestAccess(this.prisma, cartId, guestToken);
  }

  /**
   * Only bind orders to accounts via an already-attached cart (login + attach).
   * Guest checkout email is contact-only — never auto-link by email lookup.
   */
  private resolveCustomerId(cartCustomerId: string | null): string | null {
    return cartCustomerId;
  }

  private deliveryFee(
    zone: { fee: Prisma.Decimal; freeDeliveryMinimum: Prisma.Decimal | null },
    subtotal: Prisma.Decimal,
    administrativeArea?: string,
    notes?: string,
  ) {
    return new Prisma.Decimal(
      resolveCheckoutDeliveryFee({
        zoneFee: zone.fee.toFixed(2),
        freeDeliveryMinimum: zone.freeDeliveryMinimum?.toFixed(2) ?? null,
        subtotal: subtotal.toFixed(2),
        administrativeArea: administrativeArea ?? null,
        deliverySpeed: parseDeliverySpeedFromNotes(notes),
        fulfillmentType: 'DELIVERY',
      }),
    );
  }

  private async resolveFulfillment(
    tx: Prisma.TransactionClient,
    dto: BaseCheckoutDto,
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
    const balances = await tx.inventoryBalance.findMany({
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
    const balance = balances.find(
      (row) => row.onHand - row.reserved >= quantity,
    );
    if (balance === undefined) {
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

  async createCreditApplication(
    dto: CreditApplicationDto,
    ip: string,
    guestToken?: string,
  ) {
    await this.throttle.assertAllowed(
      'credit-application',
      dto.phone.trim(),
      ip,
    );
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
      await this.assertCartGuestAccess(dto.cartId, guestToken);
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
        finCode: encryptFinCode(
          dto.finCode.trim().toUpperCase(),
          this.appSecret(),
        ),
        phone: dto.phone.trim(),
        ...(dto.email === undefined
          ? {}
          : { email: dto.email.trim().toLowerCase() }),
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

    await this.throttle.consumeSuccessQuota(
      'credit-application',
      dto.phone.trim(),
      ip,
      { maxUses: 5, windowSeconds: 3600 },
    );

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

  @Get('slug-redirects/:entityType/:slug')
  @ApiOperation({
    summary:
      'Resolve catalog slug redirect (rename or archive targetPath) for storefront 308',
  })
  slugRedirect(
    @Param('entityType') entityType: string,
    @Param('slug') slug: string,
  ) {
    return this.catalog.resolveSlugRedirect(entityType, slug);
  }

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

  @Get('banners')
  banners() {
    return this.catalog.banners();
  }

  @Get('bestsellers')
  bestsellers() {
    return this.catalog.bestsellers();
  }

  @Get('weekly-deal')
  weeklyDeals() {
    return this.catalog.weeklyDeals();
  }

  @Get('pickup-location')
  pickupLocation() {
    return this.catalog.primaryPickupLocation();
  }
}

@ApiTags('storefront-checkout')
@Controller({ path: 'storefront', version: '1' })
class StorefrontCheckoutController {
  constructor(
    private readonly checkout: CartCheckoutService,
    private readonly availability: ProductAvailabilityService,
  ) {}

  private requestIp(request: {
    ip?: string;
    socket?: { remoteAddress?: string };
  }): string {
    return getClientIp(request);
  }

  @Post('cart')
  createCart(
    @Body() dto: CreateCartDto,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.createCart(dto, this.requestIp(request));
  }

  @Get('cart/:id')
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: true })
  cart(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
  ) {
    return this.checkout.getCart(id, guestToken);
  }

  @Post('cart/:id/items')
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: true })
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CartItemDto,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.upsertItem(
      id,
      dto,
      guestToken,
      this.requestIp(request),
    );
  }

  @Patch('cart/:id/items/:variantId')
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: true })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: CartItemDto,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.upsertItem(
      id,
      { ...dto, variantId },
      guestToken,
      this.requestIp(request),
    );
  }

  @Post('cart/:id/items/:variantId/remove')
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: true })
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.removeItem(
      id,
      variantId,
      guestToken,
      this.requestIp(request),
    );
  }

  @Get('fulfillment/options')
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: false })
  fulfillmentOptions(
    @Query() query: FulfillmentOptionsQuery,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
  ) {
    return this.checkout.fulfillmentOptions(query, guestToken);
  }

  @Post('checkout/cash')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: true })
  cashCheckout(
    @Body() dto: CashCheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.cashCheckout(
      dto,
      idempotencyKey,
      guestToken,
      this.requestIp(request),
    );
  }

  @Post('checkout/online')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: true })
  onlineCheckout(
    @Body() dto: OnlineCheckoutDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.onlineCheckout(
      dto,
      idempotencyKey,
      guestToken,
      this.requestIp(request),
    );
  }

  @Post('credit-applications')
  @ApiHeader({ name: CART_GUEST_TOKEN_HEADER, required: false })
  creditApplication(
    @Body() dto: CreditApplicationDto,
    @Headers(CART_GUEST_TOKEN_HEADER) guestToken: string | undefined,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.checkout.createCreditApplication(
      dto,
      this.requestIp(request),
      guestToken,
    );
  }

  @Post('product-availability-requests')
  productAvailabilityRequest(
    @Body() dto: ProductAvailabilityRequestDto,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.availability.createRequest(dto, this.requestIp(request));
  }
}

@Module({
  imports: [
    PrismaModule,
    PaymentsModule,
    ProductAvailabilityModule,
    CatalogModule,
    AuthModule,
  ],
  controllers: [StorefrontCatalogController, StorefrontCheckoutController],
  providers: [StorefrontCatalogService, CartCheckoutService],
})
export class StorefrontModule {}
