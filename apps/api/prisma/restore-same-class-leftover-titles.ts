/**
 * Restore same-class leftover opaque catalog titles:
 * - Transcend compact TS* SKUs
 * - APC accessory PNs AP9544 / AP9641 only
 * - QNAP IronWolf ST8000VN004 only (not TS-* / QSW-*)
 * - Grandstream opaque PSU/adapter accessories only
 *
 * Marketing titles come from catalog name maps / seo_title; codes stay as
 * Part number or Model.
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  ensureApcPartNumberSpec,
  isApcAccessoryOpaqueName,
  normalizeApcSku,
  resolveApcCatalogName,
} from '../src/catalog/apc-product-name';
import {
  buildApcProductDescription,
  resolveApcProductSeo,
} from '../src/catalog/apc-product-seo';
import {
  ensureGrandstreamModelSpec,
  isGrandstreamOpaqueAccessoryName,
  normalizeGrandstreamSku,
  resolveGrandstreamCatalogName,
} from '../src/catalog/grandstream-product-name';
import {
  buildGrandstreamProductDescription,
  resolveGrandstreamProductSeo,
} from '../src/catalog/grandstream-product-seo';
import {
  normalizeQnapSku,
  resolveQnapCatalogName,
} from '../src/catalog/qnap-product-name';
import {
  buildQnapProductDescription,
  resolveQnapProductSeo,
} from '../src/catalog/qnap-product-seo';
import {
  ensureTranscendPartNumberSpec,
  isTranscendCompactCodeName,
  normalizeTranscendSku,
  resolveTranscendCatalogName,
} from '../src/catalog/transcend-product-name';
import {
  buildTranscendProductDescription,
  resolveTranscendProductSeo,
} from '../src/catalog/transcend-product-seo';

loadEnvironment({
  path: path.resolve(__dirname, '../../../.env'),
  quiet: true,
});

type CatalogSpec = { label: string; value: string };

const QNAP_ST8000_CODES = new Set(['ST8000VN004', '72123800-6051100-000-RS']);

function asSpecs(value: unknown): CatalogSpec[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: CatalogSpec[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const specValue =
      typeof record.value === 'string' ? record.value.trim() : '';
    if (label === '' || specValue === '') {
      continue;
    }
    specs.push({ label, value: specValue });
  }
  return specs;
}

function ensurePartNumberSpec(
  specs: CatalogSpec[],
  partNumber: string,
): CatalogSpec[] {
  const index = specs.findIndex((entry) => {
    const label = entry.label.toLocaleLowerCase('az');
    return label === 'part number' || label === 'part nömrəsi';
  });
  if (index >= 0) {
    const next = [...specs];
    next[index] = { label: 'Part number', value: partNumber };
    return next;
  }
  return [{ label: 'Part number', value: partNumber }, ...specs];
}

async function restoreTranscend(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'transcend' } },
    select: {
      id: true,
      name: true,
      seoTitle: true,
      requiredSpecs: true,
      category: { select: { slug: true } },
      media: { select: { id: true, altText: true } },
    },
    orderBy: { name: 'asc' },
  });

  let updated = 0;
  for (const product of products) {
    if (!isTranscendCompactCodeName(product.name)) {
      continue;
    }
    const partNumber = normalizeTranscendSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveTranscendCatalogName(
      partNumber,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureTranscendPartNumberSpec(
      asSpecs(product.requiredSpecs),
      partNumber,
    );
    const seo = resolveTranscendProductSeo({
      sku: partNumber,
      title: productName,
      specs: storedSpecs,
      subcategorySlug: product.category.slug,
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          name: productName,
          requiredSpecs: storedSpecs,
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          description: buildTranscendProductDescription(
            seo.pageIntro,
            storedSpecs,
          ),
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === product.name ||
          alt === `Transcend ${product.name}` ||
          isTranscendCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`transcend: ${partNumber} → ${productName}\n`);
  }
  return updated;
}

async function restoreApcAccessories(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'apc' } },
    select: {
      id: true,
      name: true,
      seoTitle: true,
      requiredSpecs: true,
      category: { select: { slug: true } },
      media: { select: { id: true, altText: true } },
    },
    orderBy: { name: 'asc' },
  });

  let updated = 0;
  for (const product of products) {
    if (!isApcAccessoryOpaqueName(product.name)) {
      continue;
    }
    const partNumber = normalizeApcSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveApcCatalogName(
      partNumber,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureApcPartNumberSpec(
      asSpecs(product.requiredSpecs),
      partNumber,
    );
    const seo = resolveApcProductSeo({
      sku: partNumber,
      title: productName,
      specs: storedSpecs,
      subcategorySlug: product.category.slug,
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          name: productName,
          requiredSpecs: storedSpecs,
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          description: buildApcProductDescription(seo.pageIntro, storedSpecs),
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === product.name ||
          alt === `APC ${product.name}` ||
          isApcAccessoryOpaqueName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`apc: ${partNumber} → ${productName}\n`);
  }
  return updated;
}

async function restoreQnapIronWolf(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'qnap' } },
    select: {
      id: true,
      name: true,
      seoTitle: true,
      requiredSpecs: true,
      category: { select: { slug: true } },
      media: { select: { id: true, altText: true } },
    },
    orderBy: { name: 'asc' },
  });

  let updated = 0;
  for (const product of products) {
    const partNumber = normalizeQnapSku(product.name);
    if (!QNAP_ST8000_CODES.has(partNumber)) {
      continue;
    }
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveQnapCatalogName(
      partNumber,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensurePartNumberSpec(
      asSpecs(product.requiredSpecs),
      partNumber,
    );
    const seo = resolveQnapProductSeo({
      sku: partNumber,
      title: productName,
      specs: storedSpecs,
      subcategorySlug: product.category.slug,
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          name: productName,
          requiredSpecs: storedSpecs,
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          description: buildQnapProductDescription(seo.pageIntro, storedSpecs),
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === product.name ||
          alt === `QNAP ${product.name}` ||
          QNAP_ST8000_CODES.has(normalizeQnapSku(alt))
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`qnap: ${partNumber} → ${productName}\n`);
  }
  return updated;
}

async function restoreGrandstreamAccessories(
  prisma: PrismaClient,
): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'grandstream' } },
    select: {
      id: true,
      name: true,
      seoTitle: true,
      requiredSpecs: true,
      category: { select: { slug: true } },
      media: { select: { id: true, altText: true } },
    },
    orderBy: { name: 'asc' },
  });

  let updated = 0;
  for (const product of products) {
    if (!isGrandstreamOpaqueAccessoryName(product.name)) {
      continue;
    }
    // Keep phone/AP/switch model codes untouched (defensive).
    if (/^(GWN|GRP|GXP|UCM|GAC|GDS|GXV|DP|HT|WP|GCC|GHP)/i.test(product.name)) {
      continue;
    }
    const modelCode = product.name.trim();
    const canonicalSku = normalizeGrandstreamSku(modelCode);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const parsedSpecs = ensureGrandstreamModelSpec(
      asSpecs(product.requiredSpecs),
      modelCode,
    );
    const productName = resolveGrandstreamCatalogName(
      modelCode,
      seoTitle || modelCode,
      {
        subcategorySlug: product.category.slug,
        specs: parsedSpecs,
      },
    );
    if (product.name === productName) {
      continue;
    }

    const seo = resolveGrandstreamProductSeo({
      sku: canonicalSku,
      title: productName,
      specs: parsedSpecs,
      subcategorySlug: product.category.slug,
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          name: productName,
          requiredSpecs: parsedSpecs,
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          description: buildGrandstreamProductDescription(
            seo.pageIntro,
            parsedSpecs,
          ),
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === product.name ||
          alt === `Grandstream ${product.name}` ||
          isGrandstreamOpaqueAccessoryName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`grandstream: ${modelCode} → ${productName}\n`);
  }
  return updated;
}

async function restoreSameClassLeftoverTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const transcend = await restoreTranscend(prisma);
    const apc = await restoreApcAccessories(prisma);
    const qnap = await restoreQnapIronWolf(prisma);
    const grandstream = await restoreGrandstreamAccessories(prisma);
    process.stdout.write(
      `Done. transcend=${String(transcend)} apc=${String(apc)} qnap=${String(qnap)} grandstream=${String(grandstream)}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void restoreSameClassLeftoverTitles();
