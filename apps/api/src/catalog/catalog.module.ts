import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { scheduleStorefrontCatalogRevalidate } from './storefront-catalog-revalidate';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
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
import { createHash } from 'node:crypto';
import { memoryStorage } from 'multer';
import {
  CatalogSlugEntityType,
  CatalogStatus,
  Prisma,
  StorefrontBannerPlacement,
} from '../generated/prisma/client';
import {
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  type StaffPrincipal,
  StaffAuthGuard,
  AuthModule,
} from '../auth/auth.module';
import type { Environment } from '../config/environment';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { LocalFilesystemMediaStorage } from './local-filesystem-media-storage';
import { resolveProductMediaMime } from './media-content-sniff';
import {
  createProductMediaMalwareScanner,
  PRODUCT_MEDIA_MALWARE_SCANNER,
  type MediaMalwareScanner,
} from './media-malware.scanner';
import {
  withMediaReadUrlList,
} from './media-read-url';
import {
  PRODUCT_MEDIA_MAX_BYTES,
  PRODUCT_MEDIA_STORAGE,
  assertProductMediaConstraints,
  type ProductMediaStorage,
} from './media-storage.port';
import {
  buildCatalogPriceImportIndex,
  resolveCatalogPriceImportRow,
  type CatalogPriceImportCandidate,
} from './price-import.domain';
import { S3ProductMediaStorage } from './s3-media-storage';
import {
  archivedVariantSku,
  conflictMessageForVariantUniqueViolation,
  normalizeVariantBarcode,
  normalizeVariantSku,
  variantUniqueViolationMessage,
} from './variant.domain';
import { CatalogSeoCoverageService } from './catalog-seo-coverage.service';
import { upsertCatalogSlugRedirect } from './catalog-slug-redirect-write';

export function createProductMediaStorage(
  config: ConfigService<Environment, true>,
): ProductMediaStorage {
  const mode = config.get('MEDIA_STORAGE', { infer: true });
  const endpoint = config.get('S3_ENDPOINT', { infer: true }).trim();
  if (mode === 'local' || endpoint.length === 0) {
    return new LocalFilesystemMediaStorage();
  }
  return new S3ProductMediaStorage(config);
}

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

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

class ReorderSubcategoriesDto {
  @IsUUID('4')
  parentId!: string;

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

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/)
  @MaxLength(500)
  logoObjectKey?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 100)
  logoMimeType?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5_000_000)
  logoByteSize?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(200)
  logoScalePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-50)
  @Max(50)
  logoOffsetX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-50)
  @Max(50)
  logoOffsetY?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

class StorefrontBannerDto {
  @IsEnum(StorefrontBannerPlacement)
  placement!: StorefrontBannerPlacement;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  altText!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^(\/.*|https?:\/\/\S+)$/)
  href!: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/)
  @MaxLength(500)
  imageObjectKey!: string;

  @IsString()
  @Length(3, 100)
  imageMimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5_000_000)
  imageByteSize!: number;

  @IsEnum(CatalogStatus)
  status!: CatalogStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
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
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

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

  @IsOptional()
  @IsBoolean()
  availableByOrder?: boolean;
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

  @IsOptional()
  @IsBoolean()
  availableByOrder?: boolean;
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

class PriceImportItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  brand!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  model!: string;

  @IsString()
  @Matches(MONEY)
  price!: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY)
  previousPrice?: string;
}

class PriceImportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PriceImportItemDto)
  items!: PriceImportItemDto[];

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
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

  @IsOptional()
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
    seoTitle,
    seoDescription,
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
    ...(description !== undefined
      ? {
          description: description.trim() ? description.trim() : null,
        }
      : {}),
    seoTitle: seoTitle?.trim() ? seoTitle.trim() : null,
    seoDescription: seoDescription?.trim() ? seoDescription.trim() : null,
    warrantyMonths: warrantyMonths ?? null,
    requiredSpecs:
      requiredSpecs === undefined
        ? []
        : (requiredSpecs as unknown as Prisma.InputJsonValue),
  };
}

/** Partial-safe product PATCH — never wipe fields the client omitted. */
function productUpdateData(
  dto: ProductDto,
): Prisma.ProductUncheckedUpdateInput {
  return {
    categoryId: dto.categoryId,
    name: dto.name,
    slug: dto.slug,
    status: dto.status,
    brandId: dto.brandId ?? null,
    ...(dto.description !== undefined
      ? {
          description: dto.description.trim() ? dto.description.trim() : null,
        }
      : {}),
    ...(dto.seoTitle !== undefined
      ? { seoTitle: dto.seoTitle.trim() ? dto.seoTitle.trim() : null }
      : {}),
    ...(dto.seoDescription !== undefined
      ? {
          seoDescription: dto.seoDescription.trim()
            ? dto.seoDescription.trim()
            : null,
        }
      : {}),
    ...(dto.warrantyMonths !== undefined
      ? { warrantyMonths: dto.warrantyMonths }
      : {}),
    ...(dto.requiredSpecs !== undefined
      ? {
          requiredSpecs: dto.requiredSpecs as unknown as Prisma.InputJsonValue,
        }
      : {}),
  };
}

@Injectable()
class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_MEDIA_STORAGE)
    private readonly mediaStorage: ProductMediaStorage,
    @Inject(PRODUCT_MEDIA_MALWARE_SCANNER)
    private readonly mediaMalwareScanner: MediaMalwareScanner,
  ) {}

  private bumpStorefrontCatalogCache(input: {
    productSlug?: string | null | undefined;
    previousProductSlug?: string | null | undefined;
    categorySlug?: string | null | undefined;
    brandSlug?: string | null | undefined;
  }) {
    const paths: string[] = [];
    const tags = new Set<string>(['catalog']);
    if (input.productSlug) {
      paths.push(`/products/${input.productSlug}`);
      tags.add(`product:${input.productSlug}`);
    }
    if (input.previousProductSlug) {
      paths.push(`/products/${input.previousProductSlug}`);
      tags.add(`product:${input.previousProductSlug}`);
    }
    if (input.categorySlug) {
      paths.push(`/categories/${input.categorySlug}`);
      tags.add(`category:${input.categorySlug}`);
    }
    if (input.brandSlug) {
      paths.push(`/brands/${input.brandSlug}`);
      tags.add(`brand:${input.brandSlug}`);
    }
    scheduleStorefrontCatalogRevalidate({
      paths,
      tags: [...tags],
    });
  }

  private async bumpStorefrontCacheForVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { product: { select: { slug: true } } },
    });
    if (variant === null) {
      scheduleStorefrontCatalogRevalidate({ tags: ['catalog'] });
      return;
    }
    this.bumpStorefrontCatalogCache({ productSlug: variant.product.slug });
  }

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

  /**
   * Persist old→new slug for storefront 308s and collapse redirect chains
   * (A→B then B→C becomes A→C, B→C). Archive targetPath is inherited by
   * prior chain rows so rename→archive does not soft-404 older slugs.
   */
  private async recordCatalogSlugRedirect(
    tx: Prisma.TransactionClient,
    entityType: CatalogSlugEntityType,
    entityId: string,
    oldSlug: string,
    newSlug: string,
    targetPath?: string,
  ) {
    await upsertCatalogSlugRedirect(tx, {
      entityType,
      entityId,
      oldSlug,
      newSlug,
      ...(targetPath !== undefined ? { targetPath } : {}),
    });
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

  reorderSubcategories(
    parentId: string,
    orderedIds: string[],
    actor: CatalogActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.category.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true, status: true },
      });

      if (!parent || parent.parentId !== null) {
        throw new BadRequestException('Invalid parent category id');
      }

      if (parent.status === CatalogStatus.ARCHIVED) {
        throw new BadRequestException('Parent category is archived');
      }

      const subcategories = await tx.category.findMany({
        where: {
          parentId,
          status: { not: CatalogStatus.ARCHIVED },
        },
        select: { id: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      if (orderedIds.length !== subcategories.length) {
        throw new BadRequestException(
          'Subcategory order must include every active subcategory',
        );
      }

      const subcategoryIds = new Set(subcategories.map((category) => category.id));
      if (orderedIds.some((id) => !subcategoryIds.has(id))) {
        throw new BadRequestException('Invalid subcategory id in order');
      }

      if (new Set(orderedIds).size !== orderedIds.length) {
        throw new BadRequestException('Duplicate subcategory id in order');
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
        parentId,
        { orderedIds: subcategories.map((category) => category.id) },
        { parentId, orderedIds },
      );

      return { parentId, orderedIds };
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
      if (before.slug !== dto.slug) {
        await this.recordCatalogSlugRedirect(
          tx,
          CatalogSlugEntityType.CATEGORY,
          id,
          before.slug,
          dto.slug,
        );
      }
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
      const before = await tx.category.findUniqueOrThrow({
        where: { id },
        include: {
          parent: { select: { slug: true } },
        },
      });

      const targetPath =
        before.parent !== null
          ? `/categories/${before.parent.slug}`
          : '/';
      await this.recordCatalogSlugRedirect(
        tx,
        CatalogSlugEntityType.CATEGORY,
        id,
        before.slug,
        this.archivedCategorySlug(id),
        targetPath,
      );

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

  private brandWriteData(dto: BrandDto) {
    const seoFields = {
      ...(dto.seoTitle !== undefined
        ? { seoTitle: dto.seoTitle.trim() ? dto.seoTitle.trim() : null }
        : {}),
      ...(dto.seoDescription !== undefined
        ? {
            seoDescription: dto.seoDescription.trim()
              ? dto.seoDescription.trim()
              : null,
          }
        : {}),
      ...(dto.description !== undefined
        ? {
            description: dto.description.trim()
              ? dto.description.trim()
              : null,
          }
        : {}),
    };

    if (dto.logoObjectKey === null) {
      return {
        name: dto.name,
        slug: dto.slug,
        status: dto.status,
        ...seoFields,
        logoObjectKey: null,
        logoMimeType: null,
        logoByteSize: null,
        logoScalePercent: 100,
        logoOffsetX: 0,
        logoOffsetY: 0,
      };
    }

    return {
      name: dto.name,
      slug: dto.slug,
      status: dto.status,
      ...seoFields,
      ...(dto.logoObjectKey !== undefined
        ? {
            logoObjectKey: dto.logoObjectKey,
            ...(dto.logoMimeType !== undefined
              ? { logoMimeType: dto.logoMimeType }
              : {}),
            ...(dto.logoByteSize !== undefined
              ? { logoByteSize: dto.logoByteSize }
              : {}),
          }
        : {}),
      ...(dto.logoScalePercent !== undefined
        ? { logoScalePercent: dto.logoScalePercent }
        : {}),
      ...(dto.logoOffsetX !== undefined ? { logoOffsetX: dto.logoOffsetX } : {}),
      ...(dto.logoOffsetY !== undefined ? { logoOffsetY: dto.logoOffsetY } : {}),
    };
  }

  createBrand(dto: BrandDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({ data: this.brandWriteData(dto) });
      await this.audit(
        tx,
        actor,
        'brand.created',
        'brand',
        created.id,
        undefined,
        {
          name: created.name,
          slug: created.slug,
          status: created.status,
          logoObjectKey: created.logoObjectKey,
        },
      );
      return created;
    }).catch((error: unknown) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Slug artıq istifadə olunur');
      }
      throw error;
    });
  }

  updateBrand(id: string, dto: BrandDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUniqueOrThrow({ where: { id } });
      const nextSlug = dto.slug;
      if (before.slug !== nextSlug) {
        await this.recordCatalogSlugRedirect(
          tx,
          CatalogSlugEntityType.BRAND,
          id,
          before.slug,
          nextSlug,
        );
      }
      const updated = await tx.brand.update({
        where: { id },
        data: this.brandWriteData(dto),
      });
      await this.audit(
        tx,
        actor,
        'brand.updated',
        'brand',
        id,
        {
          name: before.name,
          slug: before.slug,
          status: before.status,
          logoObjectKey: before.logoObjectKey,
        },
        {
          name: updated.name,
          slug: updated.slug,
          status: updated.status,
          logoObjectKey: updated.logoObjectKey,
        },
      );
      return updated;
    });
  }

  private archivedBrandSlug(id: string) {
    return `archived-${id}`;
  }

  archiveBrand(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.brand.findUniqueOrThrow({ where: { id } });

      await this.recordCatalogSlugRedirect(
        tx,
        CatalogSlugEntityType.BRAND,
        id,
        before.slug,
        this.archivedBrandSlug(id),
        '/',
      );

      const updated = await tx.brand.update({
        where: { id },
        data: {
          status: CatalogStatus.ARCHIVED,
          slug: this.archivedBrandSlug(id),
        },
      });
      await this.audit(
        tx,
        actor,
        'brand.archived',
        'brand',
        id,
        { name: before.name, slug: before.slug, status: before.status },
        { name: updated.name, slug: updated.slug, status: updated.status },
      );
      return updated;
    });
  }

  private async nextBannerSortOrder(
    tx: Prisma.TransactionClient,
    placement: StorefrontBannerPlacement,
  ): Promise<number> {
    const aggregate = await tx.storefrontBanner.aggregate({
      where: { placement },
      _max: { sortOrder: true },
    });
    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  listBanners(query: PageQuery) {
    const sort =
      query.sort === 'sortOrder' || query.sort === 'createdAt'
        ? query.sort
        : 'sortOrder';
    return this.prisma.storefrontBanner
      .findMany({
        ...this.pagination(query),
        where: {
          ...(query.status === undefined ? {} : { status: query.status }),
          ...(query.search
            ? {
                OR: [
                  {
                    altText: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    href: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ [sort]: query.direction }, { createdAt: 'asc' }],
      })
      .then((rows) => this.page(rows, query.limit));
  }

  private bannerWriteData(
    dto: StorefrontBannerDto,
    sortOrder: number,
  ): Prisma.StorefrontBannerCreateInput {
    return {
      placement: dto.placement,
      altText: dto.altText,
      href: dto.href,
      imageObjectKey: dto.imageObjectKey,
      imageMimeType: dto.imageMimeType,
      imageByteSize: dto.imageByteSize,
      status: dto.status,
      sortOrder,
    };
  }

  createBanner(dto: StorefrontBannerDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const sortOrder =
        dto.sortOrder !== undefined
          ? dto.sortOrder
          : await this.nextBannerSortOrder(tx, dto.placement);
      const created = await tx.storefrontBanner.create({
        data: this.bannerWriteData(dto, sortOrder),
      });
      await this.audit(
        tx,
        actor,
        'storefront-banner.created',
        'storefront-banner',
        created.id,
        undefined,
        {
          altText: created.altText,
          href: created.href,
          imageObjectKey: created.imageObjectKey,
          placement: created.placement,
          status: created.status,
          sortOrder: created.sortOrder,
        },
      );
      return created;
    });
  }

  updateBanner(id: string, dto: StorefrontBannerDto, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.storefrontBanner.findUniqueOrThrow({
        where: { id },
      });
      const sortOrder =
        dto.sortOrder !== undefined ? dto.sortOrder : before.sortOrder;
      const updated = await tx.storefrontBanner.update({
        where: { id },
        data: this.bannerWriteData(dto, sortOrder),
      });
      await this.audit(
        tx,
        actor,
        'storefront-banner.updated',
        'storefront-banner',
        id,
        {
          altText: before.altText,
          href: before.href,
          imageObjectKey: before.imageObjectKey,
          placement: before.placement,
          status: before.status,
          sortOrder: before.sortOrder,
        },
        {
          altText: updated.altText,
          href: updated.href,
          imageObjectKey: updated.imageObjectKey,
          placement: updated.placement,
          status: updated.status,
          sortOrder: updated.sortOrder,
        },
      );
      return updated;
    });
  }

  archiveBanner(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.storefrontBanner.update({
        where: { id },
        data: { status: CatalogStatus.ARCHIVED },
      });
      await this.audit(
        tx,
        actor,
        'storefront-banner.archived',
        'storefront-banner',
        id,
        undefined,
        { status: updated.status },
      );
      return updated;
    });
  }

  reorderBanners(orderedIds: string[], actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const firstId = orderedIds[0];
      if (firstId === undefined) {
        throw new BadRequestException('Banner sırası boş ola bilməz');
      }

      const first = await tx.storefrontBanner.findUnique({
        where: { id: firstId },
        select: { placement: true },
      });
      if (first === null) {
        throw new BadRequestException('Banner tapılmadı');
      }

      const existing = await tx.storefrontBanner.findMany({
        where: {
          placement: first.placement,
          status: { not: CatalogStatus.ARCHIVED },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      const existingIds = new Set(existing.map((row) => row.id));
      if (
        orderedIds.length !== existingIds.size ||
        orderedIds.some((id) => !existingIds.has(id))
      ) {
        throw new BadRequestException(
          'Banner sırası eyni yerləşmədəki mövcud bannerlərlə uyğun gəlmir',
        );
      }
      for (const [index, id] of orderedIds.entries()) {
        await tx.storefrontBanner.update({
          where: { id },
          data: { sortOrder: index },
        });
      }
      await this.audit(
        tx,
        actor,
        'storefront-banner.reordered',
        'storefront-banner',
        firstId,
        undefined,
        { placement: first.placement, orderedIds },
      );
      return { orderedIds };
    });
  }

  async listProducts(query: PageQuery) {
    const rows = await this.prisma.product.findMany({
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            parentId: true,
            parent: { select: { slug: true, name: true } },
          },
        },
        brand: { select: { id: true, name: true } },
        variants: {
          include: {
            media: { orderBy: { sortOrder: 'asc' as const } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { [query.sort]: query.direction },
    });
    const withUrls = await Promise.all(
      rows.map((row) => this.attachProductMediaReadUrls(row)),
    );
    return this.page(withUrls, query.limit);
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            media: { orderBy: { sortOrder: 'asc' as const } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' as const } },
      },
    });
    return this.attachProductMediaReadUrls(product);
  }

  private async attachProductMediaReadUrls<
    T extends {
      media: Array<{
        id: string;
        objectKey: string;
        altText: string;
        mimeType: string;
        byteSize: number;
        sortOrder: number;
      }>;
      variants: Array<{
        media: Array<{
          id: string;
          objectKey: string;
          altText: string;
          mimeType: string;
          byteSize: number;
          sortOrder: number;
        }>;
      }>;
    },
  >(product: T) {
    const media = await withMediaReadUrlList(this.mediaStorage, product.media);
    const variants = await Promise.all(
      product.variants.map(async (variant) => ({
        ...variant,
        media: await withMediaReadUrlList(this.mediaStorage, variant.media),
      })),
    );
    return { ...product, media, variants };
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
    }).then((created) => {
      this.bumpStorefrontCatalogCache({ productSlug: created.slug });
      return created;
    });
  }

  updateProduct(id: string, dto: ProductDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.product.findUniqueOrThrow({ where: { id } });
        if (before.slug !== dto.slug) {
          await this.prepareProductSlugForUpdate(tx, dto.slug, id);
          await this.recordCatalogSlugRedirect(
            tx,
            CatalogSlugEntityType.PRODUCT,
            id,
            before.slug,
            dto.slug,
          );
        }
        const updated = await tx.product.update({
          where: { id },
          data: productUpdateData(dto),
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
        return { updated, previousSlug: before.slug };
      })
      .then(({ updated, previousSlug }) => {
        this.bumpStorefrontCatalogCache({
          productSlug: updated.slug,
          previousProductSlug:
            previousSlug === updated.slug ? undefined : previousSlug,
        });
        return updated;
      });
  }

  archiveProduct(id: string, actor: CatalogActor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          variants: { select: { id: true, sku: true, barcode: true } },
          category: { select: { slug: true } },
        },
      });

      const targetPath = `/categories/${before.category.slug}`;
      await this.recordCatalogSlugRedirect(
        tx,
        CatalogSlugEntityType.PRODUCT,
        id,
        before.slug,
        this.archivedProductSlug(id),
        targetPath,
      );

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
      return { product, previousSlug: before.slug, categorySlug: before.category.slug };
    }).then(({ product, previousSlug, categorySlug }) => {
      this.bumpStorefrontCatalogCache({
        productSlug: previousSlug,
        categorySlug,
      });
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
              availableByOrder: dto.availableByOrder ?? false,
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
            availableByOrder: dto.availableByOrder ?? false,
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
    }).then(async (created) => {
      await this.bumpStorefrontCacheForVariant(created.id);
      return created;
    });
  }

  updateVariant(id: string, dto: VariantMetadataDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
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
              ...(dto.availableByOrder !== undefined
                ? { availableByOrder: dto.availableByOrder }
                : {}),
            },
          });
          await this.audit(
            tx,
            actor,
            'variant.updated',
            'product-variant',
            id,
            {
              sku: before.sku,
              barcode: before.barcode,
              status: before.status,
              availableByOrder: before.availableByOrder,
            },
            {
              sku: updated.sku,
              barcode: updated.barcode,
              status: updated.status,
              availableByOrder: updated.availableByOrder,
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
      })
      .then(async (updated) => {
        await this.bumpStorefrontCacheForVariant(updated.id);
        return updated;
      });
  }

  updatePrice(id: string, dto: PriceDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
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
      })
      .then(async (updated) => {
        await this.bumpStorefrontCacheForVariant(updated.id);
        return updated;
      });
  }

  async importPrices(dto: PriceImportDto, actor: CatalogActor) {
    const dryRun = dto.dryRun === true;
    const products = await this.prisma.product.findMany({
      where: {
        status: { not: CatalogStatus.ARCHIVED },
        brandId: { not: null },
      },
      select: {
        id: true,
        name: true,
        brand: { select: { name: true } },
        variants: {
          where: { status: { not: CatalogStatus.ARCHIVED } },
          select: {
            id: true,
            price: true,
            previousPrice: true,
          },
        },
      },
    });

    const candidates: CatalogPriceImportCandidate[] = products.flatMap(
      (product) => {
        if (product.brand === null) {
          return [];
        }
        return [
          {
            productId: product.id,
            brandName: product.brand.name,
            modelName: product.name,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              price: variant.price.toFixed(2),
              previousPrice: variant.previousPrice?.toFixed(2) ?? null,
            })),
          },
        ];
      },
    );
    const index = buildCatalogPriceImportIndex(candidates);

    const resolvedRows = dto.items.map((item, offset) =>
      resolveCatalogPriceImportRow(
        {
          rowNumber: offset + 2,
          brand: item.brand,
          model: item.model,
          price: item.price,
          ...(item.previousPrice !== undefined
            ? { previousPrice: item.previousPrice }
            : {}),
        },
        index,
      ),
    );

    const toUpdate = resolvedRows.filter((row) => row.status === 'matched');

    if (!dryRun && toUpdate.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const row of toUpdate) {
          for (const variantId of row.variantIds) {
            const before = await tx.productVariant.findUniqueOrThrow({
              where: { id: variantId },
            });
            const nextPreviousPrice =
              row.previousPrice === null
                ? before.previousPrice
                : new Prisma.Decimal(row.previousPrice);
            const updated = await tx.productVariant.update({
              where: { id: variantId },
              data: {
                price: new Prisma.Decimal(row.price),
                previousPrice: nextPreviousPrice,
              },
            });
            await this.audit(
              tx,
              actor,
              'variant.price-changed',
              'product-variant',
              variantId,
              {
                price: before.price.toFixed(2),
                previousPrice: before.previousPrice?.toFixed(2) ?? null,
                cost: before.cost?.toFixed(2) ?? null,
                source: 'excel-import',
                brand: row.brand,
                model: row.model,
              },
              {
                price: updated.price.toFixed(2),
                previousPrice: updated.previousPrice?.toFixed(2) ?? null,
                cost: updated.cost?.toFixed(2) ?? null,
                currency: 'AZN',
                source: 'excel-import',
              },
            );
          }
        }
      });
    }

    const rows = resolvedRows.map((row) => {
      const status = row.status === 'matched' ? ('updated' as const) : row.status;
      return {
        rowNumber: row.rowNumber,
        brand: row.brand,
        model: row.model,
        price: row.price,
        previousPrice: row.previousPrice,
        status,
        message: row.message,
        productId: row.productId,
        variantIds: row.variantIds,
        updatedCount:
          row.status === 'matched' ? row.variantIds.length : 0,
      };
    });

    const summary = {
      total: rows.length,
      updated: rows.filter((row) => row.status === 'updated').length,
      unchanged: rows.filter((row) => row.status === 'unchanged').length,
      notFound: rows.filter((row) => row.status === 'not_found').length,
      ambiguous: rows.filter((row) => row.status === 'ambiguous').length,
      invalid: rows.filter((row) => row.status === 'invalid').length,
      noVariants: rows.filter((row) => row.status === 'no_variants').length,
    };

    return { dryRun, summary, rows };
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

  async uploadMediaFile(
    file: Express.Multer.File | undefined,
    productId = 'shared',
  ): Promise<{ objectKey: string; mimeType: string; byteSize: number }> {
    if (file === undefined) {
      throw new BadRequestException('Şəkil faylı tələb olunur');
    }

    const byteSize = file.size;
    let mimeType;
    try {
      mimeType = resolveProductMediaMime({
        body: file.buffer,
        declaredMimeType: file.mimetype,
      });
      assertProductMediaConstraints({ mimeType, byteSize });
    } catch {
      throw new BadRequestException(
        'Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur; fayl məzmunu uyğun olmalıdır',
      );
    }

    let scan;
    try {
      scan = await this.mediaMalwareScanner.scan({
        body: file.buffer,
        mimeType,
        fileName: file.originalname,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Media təhlükəsizlik yoxlaması hazır deyil; sonra yenidən cəhd edin',
      );
    }
    if (!scan.clean) {
      throw new BadRequestException(
        'Fayl təhlükəsizlik yoxlamasından keçmədi',
      );
    }

    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const intent = await this.mediaStorage.createUploadIntent({
      productId,
      fileName: file.originalname || `upload.${mimeType.split('/')[1] ?? 'bin'}`,
      mimeType,
      byteSize,
      checksumSha256,
    });

    try {
      await this.mediaStorage.putObject({
        objectKey: intent.objectKey,
        mimeType,
        body: file.buffer,
        byteSize,
        checksumSha256,
      });
    } catch {
      throw new BadRequestException('Şəkil yüklənmədi');
    }

    return {
      objectKey: intent.objectKey,
      mimeType,
      byteSize,
    };
  }

  /**
   * Scan-only path for catalog surfaces that still write to app-local
   * public dirs (banners/brands). Same sniff + malware gate as uploadMediaFile.
   */
  async scanMediaFile(
    file: Express.Multer.File | undefined,
  ): Promise<{ mimeType: string; byteSize: number }> {
    if (file === undefined) {
      throw new BadRequestException('Şəkil faylı tələb olunur');
    }

    const byteSize = file.size;
    let mimeType;
    try {
      mimeType = resolveProductMediaMime({
        body: file.buffer,
        declaredMimeType: file.mimetype,
      });
      assertProductMediaConstraints({ mimeType, byteSize });
    } catch {
      throw new BadRequestException(
        'Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur; fayl məzmunu uyğun olmalıdır',
      );
    }

    let scan;
    try {
      scan = await this.mediaMalwareScanner.scan({
        body: file.buffer,
        mimeType,
        fileName: file.originalname,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Media təhlükəsizlik yoxlaması hazır deyil; sonra yenidən cəhd edin',
      );
    }
    if (!scan.clean) {
      throw new BadRequestException(
        'Fayl təhlükəsizlik yoxlamasından keçmədi',
      );
    }

    return { mimeType, byteSize };
  }

  addMedia(productId: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
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
      })
      .then(async (created) => {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: { slug: true },
        });
        this.bumpStorefrontCatalogCache({ productSlug: product?.slug });
        return created;
      });
  }

  removeMedia(id: string, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
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
        return removed;
      })
      .then(async (removed) => {
        const product = await this.prisma.product.findUnique({
          where: { id: removed.productId },
          select: { slug: true },
        });
        this.bumpStorefrontCatalogCache({ productSlug: product?.slug });
        return { deleted: true as const };
      });
  }

  updateMedia(id: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.productMedia.findUniqueOrThrow({
          where: { id },
        });
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
      })
      .then(async (updated) => {
        const product = await this.prisma.product.findUnique({
          where: { id: updated.productId },
          select: { slug: true },
        });
        this.bumpStorefrontCatalogCache({ productSlug: product?.slug });
        return updated;
      });
  }

  addVariantMedia(variantId: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
        await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
        const sortOrder =
          dto.sortOrder !== undefined
            ? dto.sortOrder
            : ((
                await tx.productVariantMedia.aggregate({
                  where: { variantId },
                  _max: { sortOrder: true },
                })
              )._max.sortOrder ?? -1) + 1;
        const created = await tx.productVariantMedia.create({
          data: {
            variantId,
            objectKey: dto.objectKey,
            mimeType: dto.mimeType,
            byteSize: dto.byteSize,
            altText: dto.altText,
            sortOrder,
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
            sortOrder: created.sortOrder,
          },
        );
        return created;
      })
      .then(async (created) => {
        await this.bumpStorefrontCacheForVariant(variantId);
        return created;
      });
  }

  removeVariantMedia(id: string, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
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
            sortOrder: removed.sortOrder,
          },
          undefined,
        );
        return removed;
      })
      .then(async (removed) => {
        await this.bumpStorefrontCacheForVariant(removed.variantId);
        return { deleted: true as const };
      });
  }

  updateVariantMedia(id: string, dto: MediaDto, actor: CatalogActor) {
    return this.prisma
      .$transaction(async (tx) => {
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
            sortOrder: dto.sortOrder,
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
      })
      .then(async (updated) => {
        await this.bumpStorefrontCacheForVariant(updated.variantId);
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

class CatalogSeoFillMissingDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['product', 'brand', 'category'], { each: true })
  entityTypes?: Array<'product' | 'brand' | 'category'>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  enableAvailableByOrderForOos?: boolean;
}

@ApiTags('catalog')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CATALOG_READ)
@Controller({ path: 'catalog', version: '1' })
class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly seoCoverage: CatalogSeoCoverageService,
  ) {}

  @Get('seo/coverage')
  @ApiOperation({
    summary:
      'SEO coverage report: empty CMS fields + OOS variants without availableByOrder',
  })
  seoCoverageReport() {
    return this.seoCoverage.getCoverage();
  }

  @Post('seo/fill-missing')
  @RequirePermissions(Permission.CATALOG_WRITE)
  @ApiOperation({
    summary:
      'Fill empty seoTitle/seoDescription/description with heuristic AZ copy (batch)',
  })
  fillMissingSeo(
    @Body() dto: CatalogSeoFillMissingDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.seoCoverage.fillMissing(dto, actor);
  }

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

  @Post('categories/subcategories/reorder')
  @RequirePermissions(Permission.CATALOG_WRITE)
  reorderSubcategories(
    @Body() dto: ReorderSubcategoriesDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.reorderSubcategories(
      dto.parentId,
      dto.orderedIds,
      actor,
    );
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

  @Get('banners')
  banners(@Query() query: PageQuery) {
    return this.catalog.listBanners(query);
  }

  @Post('banners')
  @RequirePermissions(Permission.CATALOG_WRITE)
  createBanner(
    @Body() dto: StorefrontBannerDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.createBanner(dto, actor);
  }

  @Patch('banners/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  updateBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StorefrontBannerDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.updateBanner(id, dto, actor);
  }

  @Delete('banners/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  archiveBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.archiveBanner(id, actor);
  }

  @Post('banners/reorder')
  @RequirePermissions(Permission.CATALOG_WRITE)
  reorderBanners(
    @Body() dto: ReorderCategoriesDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.reorderBanners(dto.orderedIds, actor);
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

  @Post('prices/import')
  @RequirePermissions(Permission.PRICE_CHANGE)
  importPrices(
    @Body() dto: PriceImportDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.importPrices(dto, actor);
  }

  @Delete('variants/:id')
  @RequirePermissions(Permission.CATALOG_WRITE)
  archiveVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.catalog.archiveVariant(id, actor);
  }

  @Post('media/upload')
  @RequirePermissions(Permission.CATALOG_WRITE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PRODUCT_MEDIA_MAX_BYTES },
    }),
  )
  uploadMedia(@UploadedFile() file: Express.Multer.File) {
    return this.catalog.uploadMediaFile(file);
  }

  @Post('media/scan')
  @RequirePermissions(Permission.CATALOG_WRITE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PRODUCT_MEDIA_MAX_BYTES },
    }),
  )
  scanMedia(@UploadedFile() file: Express.Multer.File) {
    return this.catalog.scanMediaFile(file);
  }

  @Post('products/:id/media/upload')
  @RequirePermissions(Permission.CATALOG_WRITE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PRODUCT_MEDIA_MAX_BYTES },
    }),
  )
  uploadProductMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalog.uploadMediaFile(file, id);
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
  providers: [
    CatalogService,
    CatalogSeoCoverageService,
    {
      provide: PRODUCT_MEDIA_STORAGE,
      inject: [ConfigService],
      useFactory: createProductMediaStorage,
    },
    {
      provide: PRODUCT_MEDIA_MALWARE_SCANNER,
      inject: [ConfigService],
      useFactory: createProductMediaMalwareScanner,
    },
  ],
  exports: [PRODUCT_MEDIA_STORAGE, PRODUCT_MEDIA_MALWARE_SCANNER],
})
export class CatalogModule {}
