/**
 * Restore Grandstream + APC catalog names stored as compact manufacturer codes
 * (GWN7660, BV1000I-GR). Marketing titles come from seo_title; the code stays as
 * Model / Part number so storefront display becomes "Marketing Name (CODE)".
 *
 * Does not touch H3C, ENOT, Bluetti, EnGenius, or QNAP.
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  cleanApcMarketingTitle,
  ensureApcModelSpec,
  ensureApcPartNumberSpec,
  isApcCompactCodeName,
  normalizeApcSku,
  resolveApcCatalogName,
} from '../src/catalog/apc-product-name';
import {
  buildApcProductDescription,
  resolveApcProductSeo,
} from '../src/catalog/apc-product-seo';
import {
  ensureGrandstreamModelSpec,
  isGrandstreamCompactCodeName,
  normalizeGrandstreamSku,
  resolveGrandstreamCatalogName,
} from '../src/catalog/grandstream-product-name';
import {
  buildGrandstreamProductDescription,
  resolveGrandstreamProductSeo,
} from '../src/catalog/grandstream-product-seo';

loadEnvironment({
  path: path.resolve(__dirname, '../../../.env'),
  quiet: true,
});

type CatalogSpec = { label: string; value: string };

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

async function restoreGrandstream(prisma: PrismaClient): Promise<{
  updated: number;
  samples: Array<{ before: string; after: string }>;
}> {
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
  const samples: Array<{ before: string; after: string }> = [];

  for (const product of products) {
    if (!isGrandstreamCompactCodeName(product.name)) {
      continue;
    }
    const modelCode = product.name.trim();
    const canonicalSku = normalizeGrandstreamSku(modelCode);
    const seoTitle = product.seoTitle?.trim() ?? '';
    if (seoTitle === '' || isGrandstreamCompactCodeName(seoTitle)) {
      process.stderr.write(
        `Skip grandstream ${modelCode}: missing usable seo_title\n`,
      );
      continue;
    }

    const parsedSpecs = ensureGrandstreamModelSpec(
      asSpecs(product.requiredSpecs),
      modelCode,
    );
    const productName = resolveGrandstreamCatalogName(modelCode, seoTitle, {
      subcategorySlug: product.category.slug,
      specs: parsedSpecs,
    });
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
          alt === modelCode ||
          alt === `Grandstream ${modelCode}` ||
          isGrandstreamCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    if (samples.length < 5) {
      samples.push({ before: modelCode, after: productName });
    }
    process.stdout.write(`grandstream ${modelCode} → ${productName}\n`);
  }

  return { updated, samples };
}

async function restoreApc(prisma: PrismaClient): Promise<{
  updated: number;
  samples: Array<{ before: string; after: string }>;
}> {
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
  const samples: Array<{ before: string; after: string }> = [];

  for (const product of products) {
    if (!isApcCompactCodeName(product.name)) {
      continue;
    }
    const partNumber = normalizeApcSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    if (seoTitle === '' || isApcCompactCodeName(seoTitle)) {
      process.stderr.write(
        `Skip apc ${partNumber}: missing usable seo_title\n`,
      );
      continue;
    }

    const cleanedSeo = cleanApcMarketingTitle(seoTitle);
    const productName = resolveApcCatalogName(partNumber, cleanedSeo);
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureApcModelSpec(
      ensureApcPartNumberSpec(asSpecs(product.requiredSpecs), partNumber),
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
          isApcCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    if (samples.length < 5) {
      samples.push({ before: partNumber, after: productName });
    }
    process.stdout.write(`apc ${partNumber} → ${productName}\n`);
  }

  return { updated, samples };
}

async function restoreGrandstreamApcPartNumberTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const grandstream = await restoreGrandstream(prisma);
    const apc = await restoreApc(prisma);
    process.stdout.write(
      `Done. grandstream=${String(grandstream.updated)} apc=${String(apc.updated)}\n`,
    );
    for (const sample of grandstream.samples) {
      process.stdout.write(
        `sample grandstream: ${sample.before} → ${sample.after}\n`,
      );
    }
    for (const sample of apc.samples) {
      process.stdout.write(`sample apc: ${sample.before} → ${sample.after}\n`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void restoreGrandstreamApcPartNumberTitles();
