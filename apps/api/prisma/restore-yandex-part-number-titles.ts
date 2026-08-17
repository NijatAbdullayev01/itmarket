/**
 * Restore Yandex catalog names that were stored as compact manufacturer codes
 * (YNDX-00020-BLACK). Marketing titles come from seo_title; the code stays as
 * Model so storefront display becomes "Marketing Name (YNDX-…)".
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  ensureYandexModelSpec,
  isYandexCompactCodeName,
  resolveYandexCatalogName,
  type YandexNameSpec,
} from '../src/catalog/yandex-product-name';
import {
  buildYandexProductDescription,
  resolveYandexProductSeo,
} from '../src/catalog/yandex-product-seo';

loadEnvironment({
  path: path.resolve(__dirname, '../../../.env'),
  quiet: true,
});

/** Trailing SERP type hints only — keep color and product descriptors. */
const SEO_HINT_BY_SLUG: Record<string, string[]> = {
  'agilli-kolonka': ['ağıllı kolonka'],
  'portativ-kolonka': ['portativ kolonka', 'portativ ağıllı kolonka'],
  'agilli-lampa': ['ağıllı lampa'],
  'agilli-acar': ['ağıllı açar'],
  'agilli-sensor': ['ağıllı sensor'],
  'agilli-rozetka': ['ağıllı rozetka'],
  'agilli-pult': ['ağıllı pult'],
  'led-lent': ['LED lent', 'led lent'],
  'agilli-ev-merkezi': ['ağıllı ev mərkəzi'],
};

function asSpecs(value: unknown): YandexNameSpec[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: YandexNameSpec[] = [];
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
  sku: string,
): string {
  let title = seoTitle.trim().replace(/\s+/g, ' ');
  const hints = SEO_HINT_BY_SLUG[subcategorySlug] ?? [];
  for (const hint of hints) {
    const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`\\s+${escaped}$`, 'i'), '').trim();
  }
  return resolveYandexCatalogName(sku, title);
}

async function restoreYandexPartNumberTitles(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const products = await prisma.product.findMany({
      where: { brand: { slug: 'yandex' } },
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
      if (!isYandexCompactCodeName(product.name)) {
        continue;
      }
      const code = product.name.trim().toUpperCase();
      const seoTitle = product.seoTitle?.trim() ?? '';
      if (seoTitle === '' || isYandexCompactCodeName(seoTitle)) {
        process.stderr.write(`Skip yandex ${code}: missing usable seo_title\n`);
        continue;
      }

      const productName = marketingTitleFromSeo(
        seoTitle,
        product.category.slug,
        code,
      );
      if (product.name === productName) {
        continue;
      }

      const parsedSpecs = asSpecs(product.requiredSpecs);
      const storedSpecs = ensureYandexModelSpec(parsedSpecs, code);
      const seo = resolveYandexProductSeo({
        sku: code,
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
            description: buildYandexProductDescription(
              seo.pageIntro,
              storedSpecs,
            ),
          },
        });
        for (const media of product.media) {
          const alt = media.altText?.trim() ?? '';
          if (
            alt === '' ||
            alt === code ||
            alt === `Yandex ${code}` ||
            isYandexCompactCodeName(alt)
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
        samples.push({ before: code, after: productName });
      }
      process.stdout.write(`yandex ${code} → ${productName}\n`);
    }

    process.stdout.write(`Done. updated=${String(updated)}\n`);
    for (const sample of samples) {
      process.stdout.write(`sample: ${sample.before} → ${sample.after}\n`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void restoreYandexPartNumberTitles();
