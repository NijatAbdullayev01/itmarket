import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
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
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CatalogStatus, Prisma } from '../generated/prisma/client';
import {
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  type StaffPrincipal,
  StaffAuthGuard,
  AuthModule,
} from '../auth/auth.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  archivedVariantSku,
  conflictMessageForVariantUniqueViolation,
  normalizeVariantBarcode,
  normalizeVariantSku,
  variantUniqueViolationMessage,
} from './variant.domain';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;
const BARCODE = /^[0-9A-Za-z-]{4,64}$/;
const MONEY = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;

  @IsOptional()
  @IsString()
  sort: 'createdAt' | 'name' | 'sortOrder' = 'createdAt';

  @IsOptional()
  @IsString()
  direction: 'asc' | 'desc' = 'desc';
}

class CategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @Matches(SLUG)
  @MaxLength(120)
  slug!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsEnum(CatalogStatus)
  status!: CatalogStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;
}

class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

class BrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @Matches(SLUG)
  @MaxLength(120)
  slug!: string;

  @IsEnum(CatalogStatus)
  status!: CatalogStatus;
}

class ProductRequiredSpecEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  value!: string;
}

class ProductDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @Matches(SLUG)
  @MaxLength(200)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  warrantyMonths?: number;

  @IsEnum(CatalogStatus)
  status!: CatalogStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductRequiredSpecEntryDto)
  requiredSpecs?: ProductRequiredSpecEntryDto[];
}

class VariantDto {
  @Matches(SKU)
  sku!: string;

  @IsOptional()
  @Matches(BARCODE)
  barcode?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsObject()
  attributes!: Record<string, string>;

  @IsString()
  @Matches(MONEY)
  price!: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY)
  previousPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY)
  cost?: string;

  @IsEnum(CatalogStatus)
  status!: CatalogStatus;
}

class VariantMetadataDto {
  @Matches(SKU)
  sku!: string;

  @IsOptional()
  @Matches(BARCODE)
  barcode?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsObject()
  attributes!: Record<string, string>;

  @IsEnum(CatalogStatus)
  status!: CatalogStatus;
}

class PriceDto {
  @IsString()
  @Matches(MONEY)
  price!: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY)
  previousPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY)
  cost?: string;
}

class MediaDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/)
  @MaxLength(500)
  objectKey!: string;

  @IsString()
  @Length(3, 100)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25_000_000)
  byteSize!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  altText!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder = 0;
}

class AttributeDto {
  @Matches(/^[a-z][a-z0-9_]{1,63}$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

class AttributeValueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value!: string;
}

type CatalogActor = Pick<StaffPrincipal, 'id'>;

function productWriteData(
  dto: ProductDto,
): Prisma.ProductUncheckedCreateInput {
  const {
    requiredSpecs,
    brandId,
    description,
    warrantyMonths,
    categoryId,
    name,
    slug,
    status,
  } = dto;

  return {
    categoryId,
    name,
    slug,
    status,
    brandId: brandId ?? null,
    description: description ?? null,
    warrantyMonths: warrantyMonths ?? null,
    requiredSpecs:
      requiredSpecs === undefined
        ? []
        : (requiredSpecs as unknown as Prisma.InputJsonValue),
  };
}

@Injectable()
class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private archivedCategorySlug(id: string) {
    return `archived-${id}`;
  }

  private archivedProductSlug(id: string) {
    return `archived-${id}`;
  }

  private productSlugConflictMessage(slug: string) {
    return `Slug "${slug}" artıq istifadə olunur. Eyni modeldirsə, mövcud məhsula yeni SKU əlavə edin.`;
  }

  private async prepareProductSlugForCreate(tx: Prisma.TransactionClient, slug: string) {
    const existing = await tx.product.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (existing === null) {
      return;
    }
    if (existing.status === CatalogStatus.ARCHIVED) {
      await tx.product.update({
        where: { id: existing.id },
        data: { slug: this.archivedProductSlug(existing.id) },
      });
      return;
    }
    throw new ConflictException(this.productSlugConflictMessage(slug));
  }

  private async prepareProductSlugForUpdate(
    tx: Prisma.TransactionClient,
    slug: string,
    productId: string,
  ) {
    const existing = await tx.product.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (existing === null || existing.id === productId) {
      return;
    }
    if (existing.status === CatalogStatus.ARCHIVED) {
      await tx.product.update({
        where: { id: existing.id },
        data: { slug: this.archivedProductSlug(existing.id) },
      });
      return;
    }
    throw new ConflictException(this.productSlugConflictMessage(slug));
  }

  private pagination(query: PageQuery) {
    if (!['createdAt', 'name', 'sortOrder'].includes(query.sort)) {
      throw new BadRequestException('Unsupported sort field');
    }
    if (!['asc', 'desc'].includes(query.direction)) {
      throw new BadRequestException('Unsupported sort direction');
    }
    return {
      take: query.limit + 1,
      ...(query.cursor === undefined
        ? {}
        : { cursor: { id: query.cursor }, skip: 1 }),
    };
  }

  private page<T extends { id: string }>(rows: T[], limit: number) {
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id : null,
    };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: CatalogActor,
    action: string,
    entityType: string,
    entityId: string,
    before: Prisma.InputJsonValue | undefined,
    after: Prisma.InputJsonValue | undefined,
  ) {
    await tx.auditLog.create({
      data: {
        actorType: 'staff',
        actorId: actor.id,
        action,
        entityType,
        entityId,
        before: before === undefined ? Prisma.DbNull : before,
        after: after === undefined ? Prisma.DbNull : after,
      },
    });
  }

  listCategories(query: PageQuery) {
    return this.prisma.category
      .findMany({
        ...this.pagination(query),
        where: {
          ...(query.status === undefined ? {} : { status: query.status }),
          ...(query.search
            ? { name: { contains: query.search, mode: 'insensitive' as const } }
            : {}),
        },
        orderBy: { [query.sort]: query.direction },
      })
      .then((rows) => this.page(rows, query.limit));
  }

  private async nextCategorySortOrder(
    tx: Prisma.TransactionClient,
    parentId?: string | null,
  ) {
    const aggregate = await tx.category.aggregate({
      where: { parentId: parentId ?? null },
      _max: { sortOrder: true },
    });

    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  reorderRootCategories(orderedIds: string[], actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const roots = await tx.category.findMany({
        where: { parentId: null, status: { not: CatalogStatus.ARCHIVED } },
        select: { id: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      if (orderedIds.length !== roots.length) {
        throw new BadRequestException(
          'Root category order must include every active category',
        );
      }

      const rootIds = new Set(roots.map((category) => category.id));
      if (orderedIds.some((id) => !rootIds.has(id))) {
        throw new BadRequestException('Invalid root category id in order');
      }

      if (new Set(orderedIds).size !== orderedIds.length) {
        throw new BadRequestException('Duplicate category id in order');
      }

      await Promise.all(
        orderedIds.map((id, index) =>
          tx.category.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );

      await this.audit(
        tx,
        actor,
        'category.reordered',
        'category',
        'root',
        { orderedIds: roots.map((category) => category.id) },
        { orderedIds },
      );

      return { orderedIds };
    });
  }

  createCategory(dto: CategoryDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.category.findUnique({
        where: { slug: dto.slug },
        select: { id: true, status: true },
      });
      if (existing) {
        if (existing.status === CatalogStatus.ARCHIVED) {
          await tx.category.update({
            where: { id: existing.id },
            data: { slug: this.archivedCategorySlug(existing.id) },
          });
        } else {
          throw new ConflictException(
            `Slug "${dto.slug}" artıq istifadə olunur`,
          );
        }
      }

      const sortOrder = await this.nextCategorySortOrder(tx, dto.parentId);
      const created = await tx.category.create({ data: { ...dto, sortOrder } });
      await this.audit(
        tx,
        actor,
        'category.created',
        'category',
        created.id,
        undefined,
        { name: created.name, slug: created.slug, status: created.status },
      );
      return created;
    });
  }

  updateCategory(id: string, dto: CategoryDto, actor: CatalogActor) {
    if (dto.parentId === id)
      throw new BadRequestException('Category cannot be its own parent');
    return this.prisma.$transaction(async (tx) => {
      let ancestor = dto.parentId;
      while (ancestor !== undefined) {
        if (ancestor === id)
          throw new BadRequestException('Category cycle is not allowed');
        const parent = await tx.category.findUnique({
          where: { id: ancestor },
          select: { parentId: true },
        });
        ancestor = parent?.parentId ?? undefined;
      }
      const before = await tx.category.findUniqueOrThrow({ where: { id } });
      const updated = await tx.category.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        actor,
        'category.updated',
        'category',
        id,
        { name: before.name, slug: before.slug, status: before.status },
        { name: updated.name, slug: updated.slug, status: updated.status },
      );
      return updated;
    });
  }

  archiveCategory(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.category.findUniqueOrThrow({ where: { id } });
      const updated = await tx.category.update({
        where: { id },
        data: {
          status: CatalogStatus.ARCHIVED,
          slug: this.archivedCategorySlug(id),
        },
      });
      await this.audit(
        tx,
        actor,
        'category.archived',
        'category',
        id,
        { name: before.name, slug: before.slug, status: before.status },
        { name: updated.name, slug: updated.slug, status: updated.status },
      );
      return updated;
    });
  }

  listBrands(query: PageQuery) {
    return this.prisma.brand
      .findMany({
        ...this.pagination(query),
        where: {
          ...(query.status === undefined ? {} : { status: query.status }),
          ...(query.search
            ? { name: { contains: query.search, mode: 'insensitive' as const } }
            : {}),
        },
        orderBy: { [query.sort]: query.direction },
      })
      .then((rows) => this.page(rows, query.limit));
  }

  createBrand(dto: BrandDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({ data: dto });
      await this.audit(
        tx,
        actor,
        'brand.created',
        'brand',
        created.id,
        undefined,
        { name: created.name, slug: created.slug, status: created.status },
      );
      return created;
    });
  }

  updateBrand(id: string, dto: BrandDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUniqueOrThrow({ where: { id } });
      const updated = await tx.brand.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        actor,
        'brand.updated',
        'brand',
        id,
        { name: before.name, slug: before.slug, status: before.status },
        { name: updated.name, slug: updated.slug, status: updated.status },
      );
      return updated;
    });
  }

  archiveBrand(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.brand.update({
        where: { id },
        data: { status: CatalogStatus.ARCHIVED },
      });
      await this.audit(tx, actor, 'brand.archived', 'brand', id, undefined, {
        status: updated.status,
      });
      return updated;
    });
  }

  listProducts(query: PageQuery) {
    return this.prisma.product
      .findMany({
        ...this.pagination(query),
        where: {
          ...(query.status === undefined ? {} : { status: query.status }),
          ...(query.search
            ? {
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
                        OR: [
                          {
                            sku: {
                              contains: query.search,
                              mode: 'insensitive' as const,
                            },
                          },
                          { barcode: query.search },
                        ],
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          category: { select: { id: true, name: true, status: true } },
          brand: { select: { id: true, name: true } },
          variants: { include: { media: true } },
          media: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { [query.sort]: query.direction },
      })
      .then((rows) => this.page(rows, query.limit));
  }

  getProduct(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: { include: { media: true } },
        media: true,
      },
    });
  }

  createProduct(dto: ProductDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      await this.prepareProductSlugForCreate(tx, dto.slug);
      const created = await tx.product.create({ data: productWriteData(dto) });
      await this.audit(
        tx,
        actor,
        'product.created',
        'product',
        created.id,
        undefined,
        { name: created.name, slug: created.slug, status: created.status },
      );
      return created;
    });
  }

  updateProduct(id: string, dto: ProductDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({ where: { id } });
      if (before.slug !== dto.slug) {
        await this.prepareProductSlugForUpdate(tx, dto.slug, id);
      }
      const updated = await tx.product.update({
        where: { id },
        data: productWriteData(dto),
      });
      await this.audit(
        tx,
        actor,
        'product.updated',
        'product',
        id,
        { name: before.name, slug: before.slug, status: before.status },
        { name: updated.name, slug: updated.slug, status: updated.status },
      );
      return updated;
    });
  }

  archiveProduct(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          variants: { select: { id: true, sku: true, barcode: true } },
        },
      });

      for (const variant of before.variants) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            status: CatalogStatus.ARCHIVED,
            sku: archivedVariantSku(variant.id),
            barcode: null,
          },
        });
      }

      const product = await tx.product.update({
        where: { id },
        data: {
          status: CatalogStatus.ARCHIVED,
          slug: this.archivedProductSlug(id),
        },
      });
      await this.audit(
        tx,
        actor,
        'product.archived',
        'product',
        id,
        {
          name: before.name,
          slug: before.slug,
          status: before.status,
          variants: before.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode,
          })),
        },
        { name: product.name, slug: product.slug, status: product.status },
      );
      return product;
    });
  }

  private throwVariantUniqueViolation(
    error: Prisma.PrismaClientKnownRequestError,
  ): never {
    const kind = variantUniqueViolationMessage(error.meta?.target);
    throw new ConflictException(conflictMessageForVariantUniqueViolation(kind));
  }

  private async assertActiveBarcodeAvailable(
    tx: Prisma.TransactionClient,
    barcode: string | null,
    status: CatalogStatus,
    excludeVariantId?: string,
  ): Promise<void> {
    if (status !== CatalogStatus.ACTIVE || barcode === null) {
      return;
    }
    const duplicate = await tx.productVariant.findFirst({
      where: {
        status: CatalogStatus.ACTIVE,
        barcode,
        ...(excludeVariantId === undefined
          ? {}
          : { id: { not: excludeVariantId } }),
      },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new ConflictException('Active barcode already exists');
    }
  }

  createVariant(productId: string, dto: VariantDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const sku = normalizeVariantSku(dto.sku);
      const barcode = normalizeVariantBarcode(dto.barcode);
      await this.assertActiveBarcodeAvailable(tx, barcode, dto.status);

      const existing = await tx.productVariant.findUnique({
        where: { sku },
      });
      if (existing !== null) {
        if (
          existing.status === CatalogStatus.ARCHIVED &&
          existing.productId === productId
        ) {
          const reactivated = await tx.productVariant.update({
            where: { id: existing.id },
            data: {
              barcode,
              name: dto.name,
              attributes: dto.attributes,
              price: new Prisma.Decimal(dto.price),
              previousPrice:
                dto.previousPrice === undefined
                  ? null
                  : new Prisma.Decimal(dto.previousPrice),
              cost:
                dto.cost === undefined ? null : new Prisma.Decimal(dto.cost),
              currency: 'AZN',
              status: dto.status,
            },
          });
          await this.audit(
            tx,
            actor,
            'variant.updated',
            'product-variant',
            reactivated.id,
            {
              sku: existing.sku,
              barcode: existing.barcode,
              status: existing.status,
              price: existing.price.toFixed(2),
            },
            {
              sku: reactivated.sku,
              barcode: reactivated.barcode,
              status: reactivated.status,
              price: reactivated.price.toFixed(2),
              currency: reactivated.currency,
            },
          );
          return reactivated;
        }
        throw new ConflictException(
          existing.productId === productId
            ? 'SKU already exists for this product'
            : 'SKU already exists',
        );
      }

      try {
        const created = await tx.productVariant.create({
          data: {
            productId,
            sku,
            barcode,
            name: dto.name,
            attributes: dto.attributes,
            price: new Prisma.Decimal(dto.price),
            previousPrice:
              dto.previousPrice === undefined
                ? null
                : new Prisma.Decimal(dto.previousPrice),
            cost: dto.cost === undefined ? null : new Prisma.Decimal(dto.cost),
            currency: 'AZN',
            status: dto.status,
          },
        });
        await this.audit(
          tx,
          actor,
          'variant.created',
          'product-variant',
          created.id,
          undefined,
          {
            sku: created.sku,
            barcode: created.barcode,
            status: created.status,
            price: created.price.toFixed(2),
            currency: created.currency,
          },
        );
        return created;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.throwVariantUniqueViolation(error);
        }
        throw error;
      }
    });
  }

  updateVariant(id: string, dto: VariantMetadataDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findUniqueOrThrow({
        where: { id },
      });
      const sku = normalizeVariantSku(dto.sku);
      const barcode = normalizeVariantBarcode(dto.barcode);
      await this.assertActiveBarcodeAvailable(tx, barcode, dto.status, id);

      if (sku !== before.sku) {
        const skuOwner = await tx.productVariant.findUnique({
          where: { sku },
          select: { id: true },
        });
        if (skuOwner !== null && skuOwner.id !== id) {
          throw new ConflictException('SKU already exists');
        }
      }

      try {
        const updated = await tx.productVariant.update({
          where: { id },
          data: {
            sku,
            barcode,
            name: dto.name,
            attributes: dto.attributes,
            status: dto.status,
          },
        });
        await this.audit(
          tx,
          actor,
          'variant.updated',
          'product-variant',
          id,
          { sku: before.sku, barcode: before.barcode, status: before.status },
          {
            sku: updated.sku,
            barcode: updated.barcode,
            status: updated.status,
          },
        );
        return updated;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.throwVariantUniqueViolation(error);
        }
        throw error;
      }
    });
  }

  updatePrice(id: string, dto: PriceDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findUniqueOrThrow({
        where: { id },
      });
      const updated = await tx.productVariant.update({
        where: { id },
        data: {
          price: new Prisma.Decimal(dto.price),
          previousPrice:
            dto.previousPrice === undefined
              ? null
              : new Prisma.Decimal(dto.previousPrice),
          cost: dto.cost === undefined ? null : new Prisma.Decimal(dto.cost),
        },
      });
      await this.audit(
        tx,
        actor,
        'variant.price-changed',
        'product-variant',
        id,
        {
          price: before.price.toFixed(2),
          previousPrice: before.previousPrice?.toFixed(2) ?? null,
          cost: before.cost?.toFixed(2) ?? null,
        },
        {
          price: updated.price.toFixed(2),
          previousPrice: updated.previousPrice?.toFixed(2) ?? null,
          cost: updated.cost?.toFixed(2) ?? null,
          currency: 'AZN',
        },
      );
      return updated;
    });
  }

  archiveVariant(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findUniqueOrThrow({
        where: { id },
      });
      const updated = await tx.productVariant.update({
        where: { id },
        data: {
          status: CatalogStatus.ARCHIVED,
          sku: archivedVariantSku(id),
          barcode: null,
        },
      });
      await this.audit(
        tx,
        actor,
        'variant.archived',
        'product-variant',
        id,
        {
          sku: before.sku,
          barcode: before.barcode,
          status: before.status,
        },
        { status: updated.status, sku: updated.sku, barcode: updated.barcode },
      );
      return updated;
    });
  }

  addMedia(productId: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.productMedia.create({
        data: { ...dto, productId },
      });
      await this.audit(
        tx,
        actor,
        'product-media.created',
        'product-media',
        created.id,
        undefined,
        {
          productId,
          objectKey: created.objectKey,
          mimeType: created.mimeType,
          byteSize: created.byteSize,
        },
      );
      return created;
    });
  }

  removeMedia(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.productMedia.delete({ where: { id } });
      await this.audit(
        tx,
        actor,
        'product-media.deleted',
        'product-media',
        id,
        {
          productId: removed.productId,
          objectKey: removed.objectKey,
          mimeType: removed.mimeType,
          byteSize: removed.byteSize,
        },
        undefined,
      );
      return { deleted: true };
    });
  }

  updateMedia(id: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.productMedia.findUniqueOrThrow({ where: { id } });
      const updated = await tx.productMedia.update({
        where: { id },
        data: dto,
      });
      await this.audit(
        tx,
        actor,
        'product-media.updated',
        'product-media',
        id,
        {
          objectKey: before.objectKey,
          mimeType: before.mimeType,
          byteSize: before.byteSize,
          altText: before.altText,
          sortOrder: before.sortOrder,
        },
        {
          objectKey: updated.objectKey,
          mimeType: updated.mimeType,
          byteSize: updated.byteSize,
          altText: updated.altText,
          sortOrder: updated.sortOrder,
        },
      );
      return updated;
    });
  }

  addVariantMedia(variantId: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
      const existing = await tx.productVariantMedia.findUnique({
        where: { variantId },
      });
      if (existing !== null) {
        throw new ConflictException(
          'Bu variant üçün artıq şəkil var; yeniləmək üçün variant-media PATCH istifadə edin',
        );
      }
      const created = await tx.productVariantMedia.create({
        data: {
          variantId,
          objectKey: dto.objectKey,
          mimeType: dto.mimeType,
          byteSize: dto.byteSize,
          altText: dto.altText,
        },
      });
      await this.audit(
        tx,
        actor,
        'variant-media.created',
        'product-variant-media',
        created.id,
        undefined,
        {
          variantId,
          objectKey: created.objectKey,
          mimeType: created.mimeType,
          byteSize: created.byteSize,
        },
      );
      return created;
    });
  }

  removeVariantMedia(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.productVariantMedia.delete({ where: { id } });
      await this.audit(
        tx,
        actor,
        'variant-media.deleted',
        'product-variant-media',
        id,
        {
          variantId: removed.variantId,
          objectKey: removed.objectKey,
          mimeType: removed.mimeType,
          byteSize: removed.byteSize,
        },
        undefined,
      );
      return { deleted: true };
    });
  }

  updateVariantMedia(id: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariantMedia.findUniqueOrThrow({
        where: { id },
      });
      const updated = await tx.productVariantMedia.update({
        where: { id },
        data: {
          objectKey: dto.objectKey,
          mimeType: dto.mimeType,
          byteSize: dto.byteSize,
          altText: dto.altText,
        },
      });
      await this.audit(
        tx,
        actor,
        'variant-media.updated',
        'product-variant-media',
        id,
        {
          objectKey: before.objectKey,
          mimeType: before.mimeType,
          byteSize: before.byteSize,
          altText: before.altText,
        },
        {
          objectKey: updated.objectKey,
          mimeType: updated.mimeType,
          byteSize: updated.byteSize,
          altText: updated.altText,
        },
      );
      return updated;
    });
  }

  listAttributes() {
    return this.prisma.attributeDefinition.findMany({
      include: { values: true },
      orderBy: { code: 'asc' },
    });
  }

  createAttribute(dto: AttributeDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.attributeDefinition.create({ data: dto });
      await this.audit(
        tx,
        actor,
        'attribute.created',
        'attribute-definition',
        created.id,
        undefined,
        { code: created.code, name: created.name },
      );
      return created;
    });
  }

  updateAttribute(id: string, dto: AttributeDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.attributeDefinition.findUniqueOrThrow({
        where: { id },
      });
      const updated = await tx.attributeDefinition.update({
        where: { id },
        data: dto,
      });
      await this.audit(
        tx,
        actor,
        'attribute.updated',
        'attribute-definition',
        id,
        { code: before.code, name: before.name },
        { code: updated.code, name: updated.name },
      );
      return updated;
    });
  }

  deleteAttribute(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.attributeDefinition.delete({ where: { id } });
      await this.audit(
        tx,
        actor,
        'attribute.deleted',
        'attribute-definition',
        id,
        { code: removed.code, name: removed.name },
        undefined,
      );
      return { deleted: true };
    });
  }

  addAttributeValue(
    definitionId: string,
    dto: AttributeValueDto,
    actor: CatalogActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.attributeValue.create({
        data: { definitionId, value: dto.value },
      });
      await this.audit(
        tx,
        actor,
        'attribute-value.created',
        'attribute-value',
        created.id,
        undefined,
        { definitionId, value: created.value },
      );
      return created;
    });
  }

  updateAttributeValue(
    id: string,
    dto: AttributeValueDto,
    actor: CatalogActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.attributeValue.findUniqueOrThrow({
        where: { id },
      });
      const updated = await tx.attributeValue.update({
        where: { id },
        data: { value: dto.value },
      });
      await this.audit(
        tx,
        actor,
        'attribute-value.updated',
        'attribute-value',
        id,
        { definitionId: before.definitionId, value: before.value },
        { definitionId: updated.definitionId, value: updated.value },
      );
      return updated;
    });
  }

  deleteAttributeValue(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.attributeValue.delete({ where: { id } });
      await this.audit(
        tx,
        actor,
        'attribute-value.deleted',
        'attribute-value',
        id,
        { definitionId: removed.definitionId, value: removed.value },
        undefined,
      );
      return { deleted: true };
    });
  }
}

@ApiTags('catalog')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CATALOG_READ)
@Controller({ path: 'catalog', version: '1' })
class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories(@Query() query: PageQuery) {
    return this.catalog.listCategories(query);
  }

  @Post('categories')
  @RequirePermissions(Permission.CATALOG_WRITE)
  createCategory(
    @Body() dto: CategoryDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.createCategory(dto, actor);
  }

  @Post('categories/reorder')
  @RequirePermissions(Permission.CATALOG_WRITE)
  reorderCategories(
    @Body() dto: ReorderCategoriesDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.reorderRootCategories(dto.orderedIds, actor);
  }

  @Patch('categories/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CategoryDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateCategory(id, dto, actor);
  }

  @Delete('categories/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  archiveCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.archiveCategory(id, actor);
  }

  @Get('brands')
  brands(@Query() query: PageQuery) {
    return this.catalog.listBrands(query);
  }

  @Post('brands')
  @RequirePermissions(Permission.CATALOG_WRITE)
  createBrand(@Body() dto: BrandDto, @CurrentStaff() actor: StaffPrincipal) {
    return this.catalog.createBrand(dto, actor);
  }

  @Patch('brands/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BrandDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateBrand(id, dto, actor);
  }

  @Delete('brands/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  archiveBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.archiveBrand(id, actor);
  }

  @Get('products')
  products(@Query() query: PageQuery) {
    return this.catalog.listProducts(query);
  }

  @Get('products/:id')
  product(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getProduct(id);
  }

  @Post('products')
  @RequirePermissions(Permission.CATALOG_WRITE)
  createProduct(
    @Body() dto: ProductDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.createProduct(dto, actor);
  }

  @Patch('products/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateProduct(id, dto, actor);
  }

  @Delete('products/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  archiveProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.archiveProduct(id, actor);
  }

  @Post('products/:id/variants')
  @RequirePermissions(Permission.CATALOG_WRITE, Permission.PRICE_CHANGE)
  createVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VariantDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.createVariant(id, dto, actor);
  }

  @Patch('variants/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VariantMetadataDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateVariant(id, dto, actor);
  }

  @Patch('variants/:id/price')
  @RequirePermissions(Permission.PRICE_CHANGE)
  updatePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PriceDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updatePrice(id, dto, actor);
  }

  @Delete('variants/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  archiveVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.archiveVariant(id, actor);
  }

  @Post('products/:id/media')
  @RequirePermissions(Permission.CATALOG_WRITE)
  addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MediaDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.addMedia(id, dto, actor);
  }

  @Delete('media/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  removeMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.removeMedia(id, actor);
  }

  @Patch('media/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MediaDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateMedia(id, dto, actor);
  }

  @Post('variants/:id/media')
  @RequirePermissions(Permission.CATALOG_WRITE)
  addVariantMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MediaDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.addVariantMedia(id, dto, actor);
  }

  @Delete('variant-media/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  removeVariantMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.removeVariantMedia(id, actor);
  }

  @Patch('variant-media/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateVariantMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MediaDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateVariantMedia(id, dto, actor);
  }

  @Get('attributes')
  attributes() {
    return this.catalog.listAttributes();
  }

  @Post('attributes')
  @RequirePermissions(Permission.CATALOG_WRITE)
  createAttribute(
    @Body() dto: AttributeDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.createAttribute(dto, actor);
  }

  @Patch('attributes/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttributeDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateAttribute(id, dto, actor);
  }

  @Delete('attributes/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  deleteAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.deleteAttribute(id, actor);
  }

  @Post('attributes/:id/values')
  @RequirePermissions(Permission.CATALOG_WRITE)
  addAttributeValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttributeValueDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.addAttributeValue(id, dto, actor);
  }

  @Patch('attribute-values/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateAttributeValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttributeValueDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateAttributeValue(id, dto, actor);
  }

  @Delete('attribute-values/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  deleteAttributeValue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.deleteAttributeValue(id, actor);
  }
}

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
