/**
 * Restore catalog names stored as opaque SKU/PN codes for H3C, Delta, Vertiv,
 * Ruckus, and QNAP IronWolf order codes. Marketing titles come from seo_title /
 * brand name helpers; the code stays as Part number.
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client';
import { resolveH3cCatalogName } from '../src/catalog/h3c-product-name';
import {
  buildH3cProductDescription,
  resolveH3cProductSeo,
} from '../src/catalog/h3c-product-seo';
import { resolveDeltaCatalogName } from '../src/catalog/delta-product-name';
import {
  buildDeltaProductDescription,
  resolveDeltaProductSeo,
} from '../src/catalog/delta-product-seo';
import {
  normalizeVertivSku,
  resolveVertivCatalogName,
} from '../src/catalog/vertiv-product-name';
import {
  buildVertivProductDescription,
  resolveVertivProductSeo,
} from '../src/catalog/vertiv-product-seo';
import {
  normalizeRuckusSku,
  resolveRuckusCatalogName,
} from '../src/catalog/ruckus-product-name';
import {
  buildRuckusProductDescription,
  resolveRuckusProductSeo,
} from '../src/catalog/ruckus-product-seo';
import {
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

const H3C_OPAQUE_NAME = /^(0231|PSR|LSPM)/i;
const VERTIV_COMPACT_NAME = /^(LI|GXT)/i;
const RUCKUS_ORDER_CODE = /^901-/i;
const QNAP_IRONWOLF_ORDER = /^[0-9]{7}/;

const SEO_HINT_BY_SLUG: Record<string, string[]> = {
  'on-line-ups': ['On-Line UPS', 'UPS'],
  'line-interactive': ['UPS'],
  'ups-aksesuarlari': [],
  'access-point': ['Access Point'],
  hdd: ['HDD'],
  'sfp-modullar': [],
  'sebeke-aksesuarlari': [],
};

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

function marketingTitleFromSeo(
  seoTitle: string,
  subcategorySlug: string,
): string {
  let title = seoTitle.trim();
  const hints = SEO_HINT_BY_SLUG[subcategorySlug] ?? [];
  for (const hint of hints) {
    const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`\\s+${escaped}$`, 'i'), '').trim();
  }
  return title;
}

function ensurePartNumberSpec(
  specs: CatalogSpec[],
  partNumber: string,
): CatalogSpec[] {
  const index = specs.findIndex(
    (entry) => entry.label.toLocaleLowerCase('az') === 'part number',
  );
  if (index >= 0) {
    const next = [...specs];
    next[index] = { label: 'Part number', value: partNumber };
    return next;
  }
  return [{ label: 'Part number', value: partNumber }, ...specs];
}

type BrandRestore = {
  slug: string;
  matches: (name: string) => boolean;
  resolveName: (args: {
    partNumber: string;
    seoTitle: string;
    subcategorySlug: string;
    specs: CatalogSpec[];
  }) => string;
  resolveSeo: (args: {
    partNumber: string;
    productName: string;
    subcategorySlug: string;
    specs: CatalogSpec[];
  }) => { seoTitle: string; seoDescription: string; pageIntro: string };
  buildDescription: (pageIntro: string, specs: CatalogSpec[]) => string;
  normalizePart: (name: string) => string;
  altPrefixes: string[];
};

const BRAND_RESTORES: BrandRestore[] = [
  {
    slug: 'h3c',
    matches: (name) => H3C_OPAQUE_NAME.test(name),
    normalizePart: (name) => name.trim().toUpperCase(),
    altPrefixes: ['H3C '],
    resolveName: ({ partNumber, seoTitle, subcategorySlug, specs }) => {
      const fromSeo = marketingTitleFromSeo(seoTitle, subcategorySlug);
      return resolveH3cCatalogName(partNumber, fromSeo || seoTitle, {
        subcategorySlug,
        specs,
      });
    },
    resolveSeo: ({ partNumber, productName, subcategorySlug, specs }) =>
      resolveH3cProductSeo({
        sku: partNumber,
        title: productName,
        specs,
        subcategorySlug,
      }),
    buildDescription: buildH3cProductDescription,
  },
  {
    slug: 'delta',
    matches: () => true,
    normalizePart: (name) => name.trim().toUpperCase(),
    altPrefixes: ['Delta '],
    resolveName: ({ partNumber, seoTitle, subcategorySlug }) => {
      const fromSeo = marketingTitleFromSeo(seoTitle, subcategorySlug);
      return resolveDeltaCatalogName(partNumber, fromSeo || seoTitle);
    },
    resolveSeo: ({ partNumber, productName, subcategorySlug, specs }) =>
      resolveDeltaProductSeo({
        sku: partNumber,
        title: productName,
        specs,
        subcategorySlug,
      }),
    buildDescription: buildDeltaProductDescription,
  },
  {
    slug: 'vertiv',
    matches: (name) => VERTIV_COMPACT_NAME.test(name),
    normalizePart: (name) => normalizeVertivSku(name),
    altPrefixes: ['Vertiv ', 'Vertiv Liebert '],
    resolveName: ({ partNumber, seoTitle, subcategorySlug }) => {
      const fromSeo = marketingTitleFromSeo(seoTitle, subcategorySlug);
      return resolveVertivCatalogName(partNumber, fromSeo || seoTitle);
    },
    resolveSeo: ({ partNumber, productName, subcategorySlug, specs }) =>
      resolveVertivProductSeo({
        sku: partNumber,
        title: productName,
        specs,
        subcategorySlug,
      }),
    buildDescription: buildVertivProductDescription,
  },
  {
    slug: 'ruckus',
    matches: (name) => RUCKUS_ORDER_CODE.test(name),
    normalizePart: (name) => normalizeRuckusSku(name),
    altPrefixes: ['Ruckus '],
    resolveName: ({ partNumber, seoTitle, subcategorySlug, specs }) => {
      const fromSeo = marketingTitleFromSeo(seoTitle, subcategorySlug);
      return resolveRuckusCatalogName(partNumber, fromSeo || seoTitle, {
        subcategorySlug,
        specs,
      });
    },
    resolveSeo: ({ partNumber, productName, subcategorySlug, specs }) =>
      resolveRuckusProductSeo({
        sku: partNumber,
        title: productName,
        specs,
        subcategorySlug,
      }),
    buildDescription: buildRuckusProductDescription,
  },
  {
    slug: 'qnap',
    matches: (name) => QNAP_IRONWOLF_ORDER.test(name),
    normalizePart: (name) => normalizeQnapSku(name),
    altPrefixes: ['QNAP '],
    resolveName: ({ partNumber, seoTitle, subcategorySlug }) => {
      const fromSeo = marketingTitleFromSeo(seoTitle, subcategorySlug);
      return resolveQnapCatalogName(partNumber, fromSeo || seoTitle);
    },
    resolveSeo: ({ partNumber, productName, subcategorySlug, specs }) =>
      resolveQnapProductSeo({
        sku: partNumber,
        title: productName,
        specs,
        subcategorySlug,
      }),
    buildDescription: buildQnapProductDescription,
  },
];

async function restoreOpaquePartNumberTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const counts: Record<string, number> = {};

  try {
    for (const brand of BRAND_RESTORES) {
      counts[brand.slug] = 0;
      const products = await prisma.product.findMany({
        where: { brand: { slug: brand.slug } },
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

      for (const product of products) {
        if (!brand.matches(product.name)) {
          continue;
        }
        const seoTitle = product.seoTitle?.trim() ?? '';
        if (seoTitle === '') {
          process.stderr.write(
            `Skip ${brand.slug} ${product.name}: missing seo_title\n`,
          );
          continue;
        }

        const partNumber = brand.normalizePart(product.name);
        const parsedSpecs = asSpecs(product.requiredSpecs);
        const productName = brand.resolveName({
          partNumber,
          seoTitle,
          subcategorySlug: product.category.slug,
          specs: parsedSpecs,
        });
        if (product.name === productName) {
          continue;
        }

        const storedSpecs = ensurePartNumberSpec(parsedSpecs, partNumber);
        const seo = brand.resolveSeo({
          partNumber,
          productName,
          subcategorySlug: product.category.slug,
          specs: storedSpecs,
        });

        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: product.id },
            data: {
              name: productName,
              requiredSpecs: storedSpecs,
              seoTitle: seo.seoTitle,
              seoDescription: seo.seoDescription,
              description: brand.buildDescription(seo.pageIntro, storedSpecs),
            },
          });
          for (const media of product.media) {
            const alt = media.altText?.trim() ?? '';
            const matchesOld =
              alt === '' ||
              alt === product.name ||
              brand.altPrefixes.some(
                (prefix) => alt === `${prefix}${product.name}`.trim(),
              );
            if (matchesOld || alt === seoTitle) {
              await tx.productMedia.update({
                where: { id: media.id },
                data: { altText: productName },
              });
            }
          }
        });

        counts[brand.slug] = (counts[brand.slug] ?? 0) + 1;
        process.stdout.write(`${brand.slug}: ${partNumber} → ${productName}\n`);
      }
    }

    process.stdout.write(
      `Done. ${Object.entries(counts)
        .map(([slug, count]) => `${slug}=${String(count)}`)
        .join(' ')}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void restoreOpaquePartNumberTitles();
