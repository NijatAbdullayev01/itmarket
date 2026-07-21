import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CatalogStatus,
  Prisma,
  type PrismaClient,
} from '../generated/prisma/client';
import { normalizeVariantBarcode } from '../catalog/variant.domain';
import type { StaffPrincipal } from '../auth/auth.module';
import {
  buildEan13Barcode,
  buildIntakeProductSlug,
  buildIntakeVariantSku,
  slugifyCatalogLabel,
  withIntakeSkuSuffix,
} from './inventory-intake.domain';
import { ensureIntakePendingCategory } from './inventory-intake.category';

export type IntakeVariantCreateDetails = {
  sku: string;
  name: string;
  attributes: Record<string, string>;
};

type IntakeCatalogInput = {
  brandName: string;
  modelName: string;
  barcode: string;
  categoryId?: string;
  variantDetails?: IntakeVariantCreateDetails;
};

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export async function resolveIntakeVariantId(
  tx: TransactionClient,
  input: IntakeCatalogInput,
  actor: StaffPrincipal,
): Promise<string> {
  const brandName = input.brandName.trim();
  const modelName = input.modelName.trim();
  if (brandName.length < 1 || modelName.length < 1) {
    throw new BadRequestException('Brend və model tələb olunur');
  }

  const brand = await ensureIntakeBrand(tx, brandName, actor);

  let barcode = normalizeVariantBarcode(input.barcode);
  if (barcode === null) {
    barcode = await allocateUniqueIntakeBarcode(tx);
  }

  const existingByBarcode = await tx.productVariant.findFirst({
    where: { barcode, status: { not: CatalogStatus.ARCHIVED } },
    select: { id: true },
  });
  if (existingByBarcode !== null) {
    return existingByBarcode.id;
  }

  let product =
    (await findIntakeProduct(tx, brandName, modelName)) ??
    (await createIntakeProduct(tx, input, brandName, modelName, actor));

  if (product.brandId === null) {
    product = await tx.product.update({
      where: { id: product.id },
      data: { brandId: brand.id },
      select: { id: true, brandId: true, status: true },
    });
  }

  return createIntakeVariant(
    tx,
    product.id,
    product.status,
    brandName,
    modelName,
    barcode,
    actor,
    input.variantDetails,
  );
}

async function findIntakeProduct(
  tx: TransactionClient,
  brandName: string,
  modelName: string,
) {
  const slug = buildIntakeProductSlug(brandName, modelName);
  const bySlug =
    slug === ''
      ? null
      : await tx.product.findFirst({
          where: {
            slug,
            status: { not: CatalogStatus.ARCHIVED },
          },
          select: { id: true, brandId: true, status: true },
        });
  if (bySlug !== null) {
    return bySlug;
  }

  return tx.product.findFirst({
    where: {
      name: { equals: modelName, mode: 'insensitive' },
      status: { not: CatalogStatus.ARCHIVED },
      brand: { name: { equals: brandName, mode: 'insensitive' } },
    },
    select: { id: true, brandId: true, status: true },
  });
}

async function createIntakeProduct(
  tx: TransactionClient,
  input: IntakeCatalogInput,
  brandName: string,
  modelName: string,
  actor: StaffPrincipal,
) {
  const explicitCategoryId = input.categoryId?.trim();
  let categoryId: string;
  let productStatus: CatalogStatus = CatalogStatus.DRAFT;

  if (explicitCategoryId !== undefined && explicitCategoryId !== '') {
    const category = await tx.category.findUnique({
      where: { id: explicitCategoryId },
      select: { id: true, status: true },
    });
    if (category === null || category.status === CatalogStatus.ARCHIVED) {
      throw new BadRequestException('Kateqoriya tapılmadı');
    }
    categoryId = category.id;
    productStatus = CatalogStatus.ACTIVE;
  } else {
    categoryId = (await ensureIntakePendingCategory(tx)).id;
  }

  const brand = await ensureIntakeBrand(tx, brandName, actor);
  const slug = buildIntakeProductSlug(brandName, modelName);
  if (slug === '') {
    throw new BadRequestException('Məhsul slug yaradıla bilmədi');
  }

  await prepareProductSlugForCreate(tx, slug);

  const created = await tx.product.create({
    data: {
      categoryId,
      brandId: brand.id,
      name: modelName,
      slug,
      status: productStatus,
      requiredSpecs: [],
    },
    select: { id: true, brandId: true, status: true },
  });

  await tx.auditLog.create({
    data: {
      actorType: 'staff',
      actorId: actor.id,
      action: 'product.created',
      entityType: 'product',
      entityId: created.id,
      after: {
        name: modelName,
        slug,
        status: created.status,
        intake: true,
        pendingCatalog: productStatus === CatalogStatus.DRAFT,
      },
    },
  });

  return created;
}

async function ensureIntakeBrand(
  tx: TransactionClient,
  brandName: string,
  actor: StaffPrincipal,
) {
  const existing = await tx.brand.findFirst({
    where: {
      status: { not: CatalogStatus.ARCHIVED },
      name: { equals: brandName, mode: 'insensitive' },
    },
  });
  if (existing !== null) {
    return existing;
  }

  const baseSlug = slugifyCatalogLabel(brandName);
  if (baseSlug === '') {
    throw new BadRequestException('Brend slug yaradıla bilmədi');
  }

  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const conflict = await tx.brand.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (conflict === null) {
      break;
    }
    if (conflict.status === CatalogStatus.ARCHIVED) {
      await tx.brand.update({
        where: { id: conflict.id },
        data: { slug: `archived-${conflict.id}` },
      });
      break;
    }
    slug = `${baseSlug}-${attempt + 2}`;
  }

  const created = await tx.brand.create({
    data: {
      name: brandName,
      slug,
      status: CatalogStatus.ACTIVE,
    },
  });

  await tx.auditLog.create({
    data: {
      actorType: 'staff',
      actorId: actor.id,
      action: 'brand.created',
      entityType: 'brand',
      entityId: created.id,
      after: { name: created.name, slug: created.slug, intake: true },
    },
  });

  return created;
}

async function prepareProductSlugForCreate(tx: TransactionClient, slug: string) {
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
      data: { slug: `archived-${existing.id}` },
    });
    return;
  }
  throw new ConflictException(
    `Slug "${slug}" artıq istifadə olunur. Eyni modeldirsə, mövcud məhsula yeni SKU əlavə edin.`,
  );
}

async function createIntakeVariant(
  tx: TransactionClient,
  productId: string,
  productStatus: CatalogStatus,
  brandName: string,
  modelName: string,
  barcode: string,
  actor: StaffPrincipal,
  variantDetails?: IntakeVariantCreateDetails,
) {
  const variantStatus =
    productStatus === CatalogStatus.ACTIVE
      ? CatalogStatus.ACTIVE
      : CatalogStatus.DRAFT;
  const variantName = variantDetails?.name.trim() || modelName;
  const variantAttributes = variantDetails?.attributes ?? {};
  const preferredSku = variantDetails?.sku.trim() ?? '';
  const baseSku =
    preferredSku !== ''
      ? preferredSku
      : buildIntakeVariantSku(brandName, modelName);
  if (baseSku === '') {
    throw new BadRequestException('SKU yaradıla bilmədi');
  }

  let sku = baseSku;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    sku = withIntakeSkuSuffix(baseSku, attempt);
    const existing = await tx.productVariant.findUnique({
      where: { sku },
      select: { id: true, productId: true, status: true },
    });
    if (existing === null) {
      break;
    }
    if (
      existing.status === CatalogStatus.ARCHIVED &&
      existing.productId === productId
    ) {
      const reactivated = await tx.productVariant.update({
        where: { id: existing.id },
        data: {
          barcode,
          name: variantName,
          attributes: variantAttributes,
          price: new Prisma.Decimal('0.00'),
          currency: 'AZN',
          status: variantStatus,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'staff',
          actorId: actor.id,
          action: 'variant.updated',
          entityType: 'product-variant',
          entityId: reactivated.id,
          after: { sku, barcode, status: variantStatus, intake: true },
        },
      });
      return reactivated.id;
    }
    if (attempt === 20) {
      throw new ConflictException('SKU already exists');
    }
  }

  const duplicateBarcode = await tx.productVariant.findFirst({
    where: { status: { not: CatalogStatus.ARCHIVED }, barcode },
    select: { id: true },
  });
  if (duplicateBarcode !== null) {
    throw new ConflictException('Active barcode already exists');
  }

  const created = await tx.productVariant.create({
    data: {
      productId,
      sku,
      barcode,
      name: variantName,
      attributes: variantAttributes,
      price: new Prisma.Decimal('0.00'),
      currency: 'AZN',
      status: variantStatus,
    },
    select: { id: true },
  });

  await tx.auditLog.create({
    data: {
      actorType: 'staff',
      actorId: actor.id,
      action: 'variant.created',
      entityType: 'product-variant',
      entityId: created.id,
      after: { sku, barcode, status: variantStatus, intake: true },
    },
  });

  return created.id;
}

/** Internal GS1 prefix (290) + random body; valid 13-digit EAN-13. */
export function generateIntakeEan13Candidate(): string {
  let first12 = '290';
  while (first12.length < 12) {
    first12 += randomInt(0, 10).toString();
  }
  return buildEan13Barcode(first12);
}

async function allocateUniqueIntakeBarcode(
  tx: TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateIntakeEan13Candidate();
    const existing = await tx.productVariant.findFirst({
      where: {
        barcode: candidate,
        status: { not: CatalogStatus.ARCHIVED },
      },
      select: { id: true },
    });
    if (existing === null) {
      return candidate;
    }
  }
  throw new ConflictException('Active barcode already exists');
}

export function intakeFieldsProvided(input: {
  intakeBrandName?: string;
  intakeModelName?: string;
  intakeBarcode?: string;
}) {
  return (
    (input.intakeBrandName?.trim().length ?? 0) > 0 ||
    (input.intakeModelName?.trim().length ?? 0) > 0 ||
    (input.intakeBarcode?.trim().length ?? 0) > 0
  );
}

/** Boş barkod avtomatik generasiya üçündür — DTO-da undefined sayılır. */
export function normalizeOptionalIntakeBarcode(
  value: unknown,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
