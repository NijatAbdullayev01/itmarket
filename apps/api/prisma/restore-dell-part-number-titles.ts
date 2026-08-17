/**
 * Restore Dell catalog names that were stored as order codes (460-BDQP).
 * Marketing titles come from seo_title; the order code stays as Part number.
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  cleanDellModelName,
  sanitizeDellRequiredSpecs,
  type DellCatalogSpec,
} from '../src/catalog/dell-product-name';
import {
  buildDellProductDescription,
  resolveDellProductSeo,
} from '../src/catalog/dell-product-seo';

loadEnvironment({ path: '../../.env', quiet: true });

const DELL_PART_NUMBER_NAME = /^\d{3}-[A-Z0-9]+(?:-[A-Z0-9]+)*$/i;

const TITLE_OVERRIDE_BY_PN: Record<string, string> = {
  '210-BPNV': 'Dell Pro 24 All-in-One QC24250 (65W)',
  '210-BPPK': 'Dell Pro 24 All-in-One QC24251 (35W)',
  '470-AEUP': 'Dell USB-C Mobile Adapter DA310 (7-in-1)',
};

const SEO_HINT_BY_SLUG: Record<string, string> = {
  'mobil-workstation': 'workstation',
  monoblok: 'monoblok',
  'noutbuk-aksesuarlari': 'aksesuar',
  'noutbuk-cantasi': 'çanta',
  'sebeke-adapteri': 'şəbəkə adapteri',
};

function asSpecs(value: unknown): DellCatalogSpec[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: DellCatalogSpec[] = [];
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
  const title = seoTitle.trim();
  const hint = SEO_HINT_BY_SLUG[subcategorySlug];
  if (hint === undefined) {
    return title;
  }
  const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return title.replace(new RegExp(`\\s+${escaped}$`, 'i'), '').trim();
}

function ensurePartNumberSpec(
  specs: DellCatalogSpec[],
  sku: string,
): DellCatalogSpec[] {
  const hasPart = specs.some(
    (entry) => entry.label.toLocaleLowerCase('az') === 'part number',
  );
  if (hasPart) {
    return specs;
  }
  return [...specs, { label: 'Part number', value: sku }];
}

function partNumberFromProduct(
  name: string,
  specs: readonly DellCatalogSpec[],
): string | null {
  if (DELL_PART_NUMBER_NAME.test(name)) {
    return name.trim().toUpperCase();
  }
  const fromSpec = specs.find(
    (entry) => entry.label.toLocaleLowerCase('az') === 'part number',
  );
  if (fromSpec !== undefined && DELL_PART_NUMBER_NAME.test(fromSpec.value)) {
    return fromSpec.value.trim().toUpperCase();
  }
  return null;
}

function ensureModelSpec(
  specs: DellCatalogSpec[],
  productName: string,
): DellCatalogSpec[] {
  const hasModel = specs.some(
    (entry) => entry.label.toLocaleLowerCase('az') === 'model',
  );
  if (hasModel) {
    return specs;
  }
  return [{ label: 'Model', value: productName }, ...specs];
}

async function restoreDellPartNumberTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const products = await prisma.product.findMany({
      where: { brand: { slug: 'dell' } },
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
      const parsedSpecs = asSpecs(product.requiredSpecs);
      const partNumber = partNumberFromProduct(product.name, parsedSpecs);
      const overrideTitle =
        partNumber === null ? undefined : TITLE_OVERRIDE_BY_PN[partNumber];
      if (
        partNumber === null ||
        (!DELL_PART_NUMBER_NAME.test(product.name) &&
          overrideTitle === undefined)
      ) {
        continue;
      }
      const seoTitle = product.seoTitle?.trim() ?? '';
      if (seoTitle === '' && overrideTitle === undefined) {
        process.stderr.write(`Skip ${product.name}: missing seo_title\n`);
        continue;
      }

      const sourceTitle =
        overrideTitle ?? marketingTitleFromSeo(seoTitle, product.category.slug);
      const productName = cleanDellModelName(sourceTitle);
      if (product.name === productName) {
        continue;
      }
      const storedSpecs = sanitizeDellRequiredSpecs(
        ensureModelSpec(
          ensurePartNumberSpec(parsedSpecs, partNumber),
          productName,
        ),
        productName,
      );
      const seo = resolveDellProductSeo({
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
            description: buildDellProductDescription(
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
            alt === `Dell ${product.name}`
          ) {
            await tx.productMedia.update({
              where: { id: media.id },
              data: { altText: productName },
            });
          }
        }
      });

      updated += 1;
      process.stdout.write(`${partNumber} → ${productName}\n`);
    }

    process.stdout.write(`Done. updated=${String(updated)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void restoreDellPartNumberTitles();
