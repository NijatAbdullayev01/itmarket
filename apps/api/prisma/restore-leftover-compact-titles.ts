/**
 * Restore leftover compact catalog titles for H3C, Bluetti, ENOT, EnGenius, QNAP.
 * Marketing titles come from catalog maps / seo_title; codes stay as Model or
 * Part number so storefront display becomes "Marketing Name (CODE)".
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  ensureBluettiModelSpec,
  isBluettiCompactCodeName,
  normalizeBluettiSku,
  resolveBluettiCatalogName,
} from '../src/catalog/bluetti-product-name';
import {
  buildBluettiProductDescription,
  resolveBluettiProductSeo,
} from '../src/catalog/bluetti-product-seo';
import {
  ensureEnGeniusPartNumberSpec,
  isEnGeniusCompactCodeName,
  normalizeEnGeniusSku,
  resolveEnGeniusCatalogName,
} from '../src/catalog/engenius-product-name';
import {
  buildEnGeniusProductDescription,
  resolveEnGeniusProductSeo,
} from '../src/catalog/engenius-product-seo';
import {
  ensureEnotModelSpec,
  isEnotCompactCodeName,
  normalizeEnotSku,
  resolveEnotCatalogName,
} from '../src/catalog/enot-product-name';
import {
  buildEnotProductDescription,
  resolveEnotProductSeo,
} from '../src/catalog/enot-product-seo';
import {
  ensureH3cModelSpec,
  isH3cCompactCodeName,
  resolveH3cCatalogName,
} from '../src/catalog/h3c-product-name';
import {
  buildH3cProductDescription,
  resolveH3cProductSeo,
} from '../src/catalog/h3c-product-seo';
import {
  ensureQnapPartNumberSpec,
  isQnapCompactCodeName,
  normalizeQnapSku,
  resolveQnapCatalogName,
} from '../src/catalog/qnap-product-name';
import {
  buildQnapProductDescription,
  resolveQnapProductSeo,
} from '../src/catalog/qnap-product-seo';

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

function marketingTitleFromSeo(seoTitle: string): string {
  return seoTitle.trim().replace(/\s+/g, ' ');
}

function modelCodeFromProduct(
  name: string,
  specs: readonly CatalogSpec[],
): string {
  const fromSpec = specs.find(
    (entry) => entry.label.toLocaleLowerCase('az') === 'model',
  );
  if (fromSpec !== undefined && fromSpec.value.trim() !== '') {
    return fromSpec.value.trim();
  }
  return name.trim();
}

async function restoreH3c(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'h3c' } },
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
    if (!isH3cCompactCodeName(product.name)) {
      continue;
    }
    const seoTitle = product.seoTitle?.trim() ?? '';
    if (seoTitle === '' || isH3cCompactCodeName(seoTitle)) {
      process.stderr.write(
        `Skip h3c ${product.name}: missing usable seo_title\n`,
      );
      continue;
    }

    const parsedSpecs = asSpecs(product.requiredSpecs);
    const modelCode = modelCodeFromProduct(product.name, parsedSpecs);
    const productName = resolveH3cCatalogName(
      modelCode,
      marketingTitleFromSeo(seoTitle),
      {
        subcategorySlug: product.category.slug,
        specs: parsedSpecs,
      },
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureH3cModelSpec(parsedSpecs, modelCode);
    const seo = resolveH3cProductSeo({
      sku: modelCode,
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
          description: buildH3cProductDescription(seo.pageIntro, storedSpecs),
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === product.name ||
          alt === `H3C ${product.name}` ||
          isH3cCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`h3c: ${modelCode} → ${productName}\n`);
  }
  return updated;
}

async function restoreBluetti(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'bluetti' } },
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
    if (!isBluettiCompactCodeName(product.name)) {
      continue;
    }
    const modelCode = normalizeBluettiSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveBluettiCatalogName(
      modelCode,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureBluettiModelSpec(
      asSpecs(product.requiredSpecs),
      modelCode,
    );
    const seo = resolveBluettiProductSeo({
      sku: modelCode,
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
          description: buildBluettiProductDescription(
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
          alt === `Bluetti ${product.name}` ||
          isBluettiCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`bluetti: ${modelCode} → ${productName}\n`);
  }
  return updated;
}

async function restoreEnot(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'enot' } },
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
    if (!isEnotCompactCodeName(product.name)) {
      continue;
    }
    const modelCode = normalizeEnotSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveEnotCatalogName(
      modelCode,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureEnotModelSpec(
      asSpecs(product.requiredSpecs),
      modelCode,
    );
    const seo = resolveEnotProductSeo({
      sku: modelCode,
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
          description: buildEnotProductDescription(seo.pageIntro, storedSpecs),
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === product.name ||
          alt === `ENOT ${product.name}` ||
          isEnotCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`enot: ${modelCode} → ${productName}\n`);
  }
  return updated;
}

async function restoreEnGenius(prisma: PrismaClient): Promise<number> {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'engenius' } },
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
    if (!isEnGeniusCompactCodeName(product.name)) {
      continue;
    }
    const partNumber = normalizeEnGeniusSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveEnGeniusCatalogName(
      partNumber,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureEnGeniusPartNumberSpec(
      asSpecs(product.requiredSpecs),
      partNumber,
    );
    const seo = resolveEnGeniusProductSeo({
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
          description: buildEnGeniusProductDescription(
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
          alt === `EnGenius ${product.name}` ||
          isEnGeniusCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`engenius: ${partNumber} → ${productName}\n`);
  }
  return updated;
}

async function restoreQnap(prisma: PrismaClient): Promise<number> {
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
    if (!isQnapCompactCodeName(product.name)) {
      continue;
    }
    const partNumber = normalizeQnapSku(product.name);
    const seoTitle = product.seoTitle?.trim() ?? '';
    const productName = resolveQnapCatalogName(
      product.name,
      seoTitle || product.name,
    );
    if (product.name === productName) {
      continue;
    }

    const storedSpecs = ensureQnapPartNumberSpec(
      asSpecs(product.requiredSpecs),
      // Keep the original code (e.g. TS-832PXU-4G-EU) visible as Part number.
      product.name.trim().toUpperCase(),
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
          isQnapCompactCodeName(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`qnap: ${product.name} → ${productName}\n`);
  }
  return updated;
}

async function restoreLeftoverCompactTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const h3c = await restoreH3c(prisma);
    const bluetti = await restoreBluetti(prisma);
    const enot = await restoreEnot(prisma);
    const engenius = await restoreEnGenius(prisma);
    const qnap = await restoreQnap(prisma);
    process.stdout.write(
      `Done. h3c=${String(h3c)} bluetti=${String(bluetti)} enot=${String(enot)} engenius=${String(engenius)} qnap=${String(qnap)}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void restoreLeftoverCompactTitles();
