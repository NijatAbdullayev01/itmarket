import {
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
  type VariantSkuSpecEntry,
} from '@itmarket/contracts';

import type { PrismaClient } from '../generated/prisma/client';

export function allocateUniqueCatalogSku(base: string, used: Set<string>): string {
  const normalized = base.trim();
  if (normalized === '') {
    throw new Error('Cannot allocate empty SKU');
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
  throw new Error(`Cannot allocate unique SKU from ${normalized}`);
}

export function generateCatalogImportSku(input: {
  brandName: string;
  manufacturerModel: string;
  specs: readonly VariantSkuSpecEntry[];
  includePhoneTabletVariantAttributes?: boolean;
}): string {
  const generated = buildVariantSkuFromCatalogFields({
    brandName: input.brandName,
    modelName: input.manufacturerModel.trim(),
    requiredSpecEntries: [...input.specs],
    includePhoneTabletVariantAttributes:
      input.includePhoneTabletVariantAttributes,
  });
  if (generated === '') {
    throw new Error(`Empty auto SKU for model ${input.manufacturerModel}`);
  }
  return generated;
}

export function buildCatalogImportIdentity(input: {
  brandName: string;
  manufacturerModel: string;
  specs: readonly VariantSkuSpecEntry[];
  includePhoneTabletVariantAttributes?: boolean;
  usedSkus: Set<string>;
}): { productName: string; sku: string; slugBase: string } {
  const productName = input.manufacturerModel.trim();
  return {
    productName,
    sku: allocateUniqueCatalogSku(
      generateCatalogImportSku(input),
      input.usedSkus,
    ),
    slugBase: buildProductSlugFromCatalogFields({
      brandName: input.brandName,
      modelName: productName,
    }),
  };
}

export async function findExistingImportedVariant(
  prisma: PrismaClient,
  input: {
    brandId: string;
    manufacturerModel: string;
    generatedSku?: string;
  },
): Promise<{ id: string; productId: string } | null> {
  if (input.generatedSku !== undefined && input.generatedSku !== '') {
    const byGenerated = await prisma.productVariant.findUnique({
      where: { sku: input.generatedSku },
      select: {
        id: true,
        productId: true,
        product: { select: { brandId: true } },
      },
    });
    if (byGenerated !== null && byGenerated.product.brandId === input.brandId) {
      return { id: byGenerated.id, productId: byGenerated.productId };
    }
  }

  const byName = await prisma.product.findFirst({
    where: { brandId: input.brandId, name: input.manufacturerModel },
    select: {
      id: true,
      variants: { select: { id: true }, take: 1, orderBy: { createdAt: 'asc' } },
    },
  });
  if (byName?.variants[0] !== undefined) {
    const variantCount = await prisma.productVariant.count({
      where: { product: { brandId: input.brandId, name: input.manufacturerModel } },
    });
    if (variantCount === 1) {
      return { id: byName.variants[0].id, productId: byName.id };
    }
  }

  const byLegacySku = await prisma.productVariant.findUnique({
    where: { sku: input.manufacturerModel },
    select: {
      id: true,
      productId: true,
      product: { select: { brandId: true } },
    },
  });
  if (byLegacySku !== null && byLegacySku.product.brandId === input.brandId) {
    return { id: byLegacySku.id, productId: byLegacySku.productId };
  }

  return null;
}
