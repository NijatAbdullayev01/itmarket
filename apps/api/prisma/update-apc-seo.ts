import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  buildApcProductDescription,
  resolveApcProductSeo,
  type ApcSeoSpec,
} from '../src/catalog/apc-product-seo';

loadEnvironment({ path: '../../.env', quiet: true });

function asSpecs(value: unknown): ApcSeoSpec[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: ApcSeoSpec[] = [];
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

async function updateApcSeo(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const products = await prisma.product.findMany({
      where: { brand: { slug: 'apc' } },
      select: {
        id: true,
        name: true,
        requiredSpecs: true,
        category: { select: { slug: true } },
        variants: { select: { sku: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    if (products.length === 0) {
      process.stdout.write('No APC products found.\n');
      return;
    }

    let updated = 0;
    for (const product of products) {
      const sku = product.variants[0]?.sku;
      if (sku === undefined) {
        process.stderr.write(`Skip ${product.id}: missing SKU\n`);
        continue;
      }
      const specs = asSpecs(product.requiredSpecs);
      const seo = resolveApcProductSeo({
        sku,
        title: product.name,
        specs,
        subcategorySlug: product.category.slug,
      });
      await prisma.product.update({
        where: { id: product.id },
        data: {
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
          description: buildApcProductDescription(seo.pageIntro, specs),
        },
      });
      updated += 1;
      process.stdout.write(
        `${sku}\t${seo.seoTitle.length}\t${seo.seoDescription.length}\t${seo.seoTitle}\n`,
      );
    }

    process.stdout.write(`\nUpdated ${updated} APC products.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void updateApcSeo().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
