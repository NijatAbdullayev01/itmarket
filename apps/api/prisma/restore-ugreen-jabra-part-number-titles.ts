/**
 * Restore UGREEN / Jabra catalog names that were stored as compact manufacturer
 * codes (HD104, 26599-999-899). Marketing titles come from seo_title; the code
 * stays as Model so storefront display becomes "Marketing Name (CODE)".
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  ensureJabraModelSpec,
  isJabraCompactCodeName,
} from '../src/catalog/jabra-product-name';
import {
  buildJabraProductDescription,
  resolveJabraProductSeo,
} from '../src/catalog/jabra-product-seo';
import {
  ensureUgreenModelSpec,
  isUgreenCompactCodeName,
} from '../src/catalog/ugreen-product-name';
import {
  buildUgreenProductDescription,
  resolveUgreenProductSeo,
} from '../src/catalog/ugreen-product-seo';

loadEnvironment({ path: '../../.env', quiet: true });

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

function ensureBrandPrefix(brand: 'UGREEN' | 'Jabra', title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (brand === 'UGREEN') {
    if (/^ugreen\b/i.test(trimmed)) {
      return trimmed.replace(/^ugreen\b/i, 'UGREEN');
    }
    return `UGREEN ${trimmed}`;
  }
  if (/^jabra\b/i.test(trimmed)) {
    return trimmed.replace(/^jabra\b/i, 'Jabra');
  }
  return `Jabra ${trimmed}`;
}

/**
 * seo_title for these brands is already the catalog marketing name (not a
 * SERP "Name | type" string). Keep product descriptors such as
 * "4K kabel 2 m qara" intact — do not strip trailing type words.
 */
function marketingTitleFromSeo(
  brand: 'UGREEN' | 'Jabra',
  seoTitle: string,
): string {
  return ensureBrandPrefix(brand, seoTitle);
}

async function restoreBrand(
  prisma: PrismaClient,
  brandSlug: 'ugreen' | 'jabra',
): Promise<number> {
  const brandLabel = brandSlug === 'ugreen' ? 'UGREEN' : 'Jabra';
  const isCompact =
    brandSlug === 'ugreen' ? isUgreenCompactCodeName : isJabraCompactCodeName;

  const products = await prisma.product.findMany({
    where: { brand: { slug: brandSlug } },
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
    if (!isCompact(product.name)) {
      continue;
    }
    const code = product.name.trim();
    const seoTitle = product.seoTitle?.trim() ?? '';
    if (seoTitle === '' || isCompact(seoTitle)) {
      process.stderr.write(
        `Skip ${brandSlug} ${code}: missing usable seo_title\n`,
      );
      continue;
    }

    const productName = marketingTitleFromSeo(brandLabel, seoTitle);
    if (product.name === productName) {
      continue;
    }

    const parsedSpecs = asSpecs(product.requiredSpecs);
    const storedSpecs =
      brandSlug === 'ugreen'
        ? ensureUgreenModelSpec(parsedSpecs, code)
        : ensureJabraModelSpec(parsedSpecs, code);

    const seo =
      brandSlug === 'ugreen'
        ? resolveUgreenProductSeo({
            sku: code,
            title: productName,
            specs: storedSpecs,
            subcategorySlug: product.category.slug,
          })
        : resolveJabraProductSeo({
            sku: code,
            title: productName,
            specs: storedSpecs,
            subcategorySlug: product.category.slug,
          });

    const description =
      brandSlug === 'ugreen'
        ? buildUgreenProductDescription(seo.pageIntro, storedSpecs)
        : buildJabraProductDescription(seo.pageIntro, storedSpecs);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          name: productName,
          requiredSpecs: storedSpecs,
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          description,
        },
      });
      for (const media of product.media) {
        const alt = media.altText?.trim() ?? '';
        if (
          alt === '' ||
          alt === code ||
          alt === `${brandLabel} ${code}` ||
          isCompact(alt)
        ) {
          await tx.productMedia.update({
            where: { id: media.id },
            data: { altText: productName },
          });
        }
      }
    });

    updated += 1;
    process.stdout.write(`${brandSlug} ${code} → ${productName}\n`);
  }

  return updated;
}

async function restoreUgreenJabraPartNumberTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const ugreenUpdated = await restoreBrand(prisma, 'ugreen');
    const jabraUpdated = await restoreBrand(prisma, 'jabra');
    process.stdout.write(
      `Done. ugreen=${String(ugreenUpdated)} jabra=${String(jabraUpdated)}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void restoreUgreenJabraPartNumberTitles();
