/**
 * Remap catalog identity: manufacturer model → product.name (storefront Model),
 * site auto-SKU → variant.sku. Run per brand: BRAND=apc pnpm tsx prisma/remap-catalog-model-sku.ts
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
  supportsPhoneTabletVariantAttributes,
} from '@itmarket/contracts';

import {
  CatalogSlugEntityType,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client';
import {
  manufacturerModelFromCatalogSlug,
  replaceSpecModel,
  resolveManufacturerModel,
  type CatalogSpecEntry,
} from '../src/catalog/catalog-manufacturer-model';
import { upsertCatalogSlugRedirect } from '../src/catalog/catalog-slug-redirect-write';

loadEnvironment({ path: '../../.env', quiet: true });

function asSpecs(value: unknown): CatalogSpecEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: CatalogSpecEntry[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const label = 'label' in entry ? String(entry.label ?? '').trim() : '';
    const specValue = 'value' in entry ? String(entry.value ?? '').trim() : '';
    if (label === '' || specValue === '') {
      continue;
    }
    specs.push({ label, value: specValue });
  }
  return specs;
}

function asAttributeRecord(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const attributes: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry.trim() !== '') {
      attributes[key] = entry.trim();
    }
  }
  return attributes;
}

function allocateUnique(base: string, used: Set<string>): string {
  const normalized = base.trim();
  if (normalized === '') {
    throw new Error('Cannot allocate empty token');
  }
  if (!used.has(normalized)) {
    used.add(normalized);
    return normalized;
  }
  for (let index = 2; index < 200; index += 1) {
    const suffix = `-${index}`;
    const candidate = `${normalized.slice(0, 64 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Cannot allocate unique token from ${normalized}`);
}

function tempSku(variantId: string): string {
  return `Z${variantId.replace(/-/g, '').slice(0, 20)}`.toUpperCase();
}

function tempSlug(productId: string): string {
  return `z-${productId}`;
}

type PlannedChange = {
  productId: string;
  variantId: string;
  brandName: string;
  oldName: string;
  newName: string;
  oldSku: string;
  newSku: string;
  oldSlug: string;
  newSlug: string;
  oldVariantName: string;
  newVariantName: string;
  specs: CatalogSpecEntry[];
  attributes: Record<string, string>;
};

async function remapBrand(
  prisma: PrismaClient,
  brandSlug: string,
): Promise<{ updated: number; skipped: number }> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: brandSlug } },
    select: {
      id: true,
      name: true,
      slug: true,
      seoTitle: true,
      requiredSpecs: true,
      brand: { select: { name: true } },
      category: {
        select: {
          slug: true,
          name: true,
          parent: { select: { slug: true, parent: { select: { slug: true } } } },
        },
      },
      variants: {
        select: { id: true, sku: true, name: true, attributes: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (products.length === 0) {
    process.stdout.write(`No products for brand ${brandSlug}\n`);
    return { updated: 0, skipped: 0 };
  }

  const allVariants = await prisma.productVariant.findMany({
    select: { id: true, sku: true },
  });
  const allProducts = await prisma.product.findMany({
    select: { id: true, slug: true },
  });
  const usedSkus = new Set(allVariants.map((variant) => variant.sku));
  const usedSlugs = new Set(allProducts.map((product) => product.slug));

  const redirects = await prisma.catalogSlugRedirect.findMany({
    where: {
      entityType: CatalogSlugEntityType.PRODUCT,
      entityId: { in: products.map((product) => product.id) },
    },
    select: { entityId: true, oldSlug: true },
  });
  const oldSlugsByProduct = new Map<string, string[]>();
  for (const redirect of redirects) {
    const current = oldSlugsByProduct.get(redirect.entityId) ?? [];
    current.push(redirect.oldSlug);
    oldSlugsByProduct.set(redirect.entityId, current);
  }

  const planned: PlannedChange[] = [];
  let skipped = 0;

  for (const product of products) {
    const variant = product.variants[0];
    if (variant === undefined || product.brand === null) {
      process.stderr.write(`Skip ${product.id}: missing variant or brand\n`);
      skipped += 1;
      continue;
    }
    if (product.variants.length > 1) {
      process.stderr.write(
        `Skip ${product.id}: ${product.variants.length} variants (remap is 1:1)\n`,
      );
      skipped += 1;
      continue;
    }

    const specs = asSpecs(product.requiredSpecs);
    const fallbackModel =
      (oldSlugsByProduct.get(product.id) ?? [])
        .map((oldSlug) => manufacturerModelFromCatalogSlug(brandSlug, oldSlug))
        .find((value) => value !== null) ??
      manufacturerModelFromCatalogSlug(brandSlug, product.slug);
    const sampleSku = buildVariantSkuFromCatalogFields({
      brandName: product.brand.name,
      modelName: 'X0',
      requiredSpecEntries: [],
    });
    const brandSkuPrefix = sampleSku.split('-')[0] ?? '';
    const model = resolveManufacturerModel({
      productName: product.name,
      sku: variant.sku,
      specs,
      fallbackModel,
      seoTitle: product.seoTitle,
      brandName: product.brand.name,
      skuLooksSiteGenerated:
        brandSkuPrefix !== '' &&
        variant.sku.toUpperCase().startsWith(`${brandSkuPrefix}-`),
    });
    if (model === '') {
      process.stderr.write(`Skip ${product.id}: empty model\n`);
      skipped += 1;
      continue;
    }

    const phoneTablet = supportsPhoneTabletVariantAttributes({
      slug: product.category.slug,
      name: product.category.name,
      parentSlug: product.category.parent?.slug,
      rootSlug: product.category.parent?.parent?.slug,
    });
    const generatedSku = buildVariantSkuFromCatalogFields({
      brandName: product.brand.name,
      modelName: model,
      requiredSpecEntries: specs,
      includePhoneTabletVariantAttributes: phoneTablet,
    });
    if (generatedSku === '') {
      process.stderr.write(`Skip ${product.id}: empty generated SKU\n`);
      skipped += 1;
      continue;
    }

    usedSkus.delete(variant.sku);
    const newSku = allocateUnique(generatedSku, usedSkus);

    usedSlugs.delete(product.slug);
    const slugBase = buildProductSlugFromCatalogFields({
      brandName: product.brand.name,
      modelName: model,
    });
    const newSlug = allocateUnique(slugBase === '' ? product.slug : slugBase, usedSlugs);

    const nextSpecs = replaceSpecModel(specs, model);
    const attributes = asAttributeRecord(variant.attributes);
    if (attributes.Model !== undefined || attributes.model !== undefined) {
      attributes.Model = model;
      delete attributes.model;
    }

    const newVariantName =
      variant.name.trim() === variant.sku.trim() ? 'Standart' : variant.name;

    if (
      product.name === model &&
      variant.sku === newSku &&
      product.slug === newSlug &&
      variant.name === newVariantName &&
      JSON.stringify(specs) === JSON.stringify(nextSpecs)
    ) {
      skipped += 1;
      continue;
    }

    planned.push({
      productId: product.id,
      variantId: variant.id,
      brandName: product.brand.name,
      oldName: product.name,
      newName: model,
      oldSku: variant.sku,
      newSku,
      oldSlug: product.slug,
      newSlug,
      oldVariantName: variant.name,
      newVariantName,
      specs: nextSpecs,
      attributes,
    });
  }

  for (const change of planned) {
    await prisma.$transaction(async (tx) => {
      if (change.oldSku !== change.newSku) {
        await tx.productVariant.update({
          where: { id: change.variantId },
          data: { sku: tempSku(change.variantId) },
        });
      }
      if (change.oldSlug !== change.newSlug) {
        await tx.product.update({
          where: { id: change.productId },
          data: { slug: tempSlug(change.productId) },
        });
      }

      await tx.product.update({
        where: { id: change.productId },
        data: {
          name: change.newName,
          slug: change.newSlug,
          requiredSpecs: change.specs as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.productVariant.update({
        where: { id: change.variantId },
        data: {
          sku: change.newSku,
          name: change.newVariantName,
          attributes: change.attributes as unknown as Prisma.InputJsonValue,
        },
      });
      await upsertCatalogSlugRedirect(tx, {
        entityType: CatalogSlugEntityType.PRODUCT,
        entityId: change.productId,
        oldSlug: change.oldSlug,
        newSlug: change.newSlug,
      });
    });
    process.stdout.write(
      `${brandSlug}: ${change.oldSku} → model=${change.newName} sku=${change.newSku}\n`,
    );
  }

  return { updated: planned.length, skipped };
}

async function remapCatalogModelSku(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const requestedBrand = process.env.BRAND?.trim().toLowerCase();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const brands = await prisma.brand.findMany({
      where: { products: { some: {} } },
      select: { slug: true },
      orderBy: { slug: 'asc' },
    });
    const slugs = brands
      .map((brand) => brand.slug)
      .filter((slug) => requestedBrand === undefined || requestedBrand === '' || slug === requestedBrand);

    if (slugs.length === 0) {
      throw new Error(
        requestedBrand === undefined
          ? 'No brands found'
          : `Brand not found: ${requestedBrand}`,
      );
    }

    let updated = 0;
    let skipped = 0;
    for (const slug of slugs) {
      const result = await remapBrand(prisma, slug);
      updated += result.updated;
      skipped += result.skipped;
    }
    process.stdout.write(`Done. updated=${updated} skipped=${skipped}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void remapCatalogModelSku();
