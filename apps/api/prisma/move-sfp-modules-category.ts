/**
 * Move optical SFP/SFP+/SFP28 modules from Şəbəkə aksesuarları to SFP modullar.
 * DAC cables, PSU and fan accessories stay in Şəbəkə aksesuarları.
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { CatalogStatus, PrismaClient } from '../src/generated/prisma/client';
import {
  isGrandstreamSfpModuleSku,
  normalizeGrandstreamSku,
} from '../src/catalog/grandstream-product-name';
import {
  buildGrandstreamProductDescription,
  resolveGrandstreamProductSeo,
  type GrandstreamSeoSpec,
} from '../src/catalog/grandstream-product-seo';

loadEnvironment({ path: '../../.env', quiet: true });

const PARENT_SLUG = 'sebeke-avadanliqlari';
const SOURCE_SLUG = 'sebeke-aksesuarlari';
const TARGET_SLUG = 'sfp-modullar';
const TARGET_NAME = 'SFP modullar';

function fold(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ç', 'c');
}

function asSpecs(value: unknown): GrandstreamSeoSpec[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: GrandstreamSeoSpec[] = [];
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

function isSfpOpticalModule(name: string, sku: string): boolean {
  if (isGrandstreamSfpModuleSku(sku)) {
    return true;
  }
  const hay = fold(`${name} ${sku}`);
  if (/\bcable\b|\bkabel\b|\bdac\b/.test(hay)) {
    return false;
  }
  if (
    /power supply|enerji techizati|fan module|ventilyator/.test(hay)
  ) {
    return false;
  }
  const skuFolded = fold(normalizeGrandstreamSku(sku));
  if (/^(sfp|qsfp)/.test(skuFolded)) {
    return true;
  }
  const looksSfp = /\bsfp\b|\bsfp\+|\bsfp28|\bqsfp\b|\bqsfp\+|\bqsfp28/.test(
    hay,
  );
  const looksModule = /modul|transceiver|optik/.test(hay);
  return looksSfp && looksModule;
}

async function ensureSfpModullarCategory(
  prisma: PrismaClient,
  parentId: string,
): Promise<string> {
  const existing = await prisma.category.findUnique({
    where: { slug: TARGET_SLUG },
    select: { id: true, parentId: true, status: true, name: true },
  });
  if (existing !== null) {
    if (existing.parentId !== parentId) {
      throw new Error(`Subcategory ${TARGET_SLUG} has unexpected parent`);
    }
    if (
      existing.status !== CatalogStatus.ACTIVE ||
      existing.name !== TARGET_NAME
    ) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { status: CatalogStatus.ACTIVE, name: TARGET_NAME },
      });
    }
    return existing.id;
  }

  const aggregate = await prisma.category.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  const created = await prisma.category.create({
    data: {
      name: TARGET_NAME,
      slug: TARGET_SLUG,
      parentId,
      status: CatalogStatus.ACTIVE,
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
  process.stdout.write(`Created subcategory ${TARGET_SLUG}\n`);
  return created.id;
}

async function moveSfpModules(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const parent = await prisma.category.findUnique({
      where: { slug: PARENT_SLUG },
      select: { id: true, parentId: true },
    });
    if (parent === null || parent.parentId !== null) {
      throw new Error('Şəbəkə avadanlıqları category not found');
    }

    const source = await prisma.category.findUnique({
      where: { slug: SOURCE_SLUG },
      select: { id: true, parentId: true },
    });
    if (source === null || source.parentId !== parent.id) {
      throw new Error('Şəbəkə aksesuarları subcategory not found');
    }

    const targetId = await ensureSfpModullarCategory(prisma, parent.id);

    const products = await prisma.product.findMany({
      where: { categoryId: source.id },
      select: {
        id: true,
        name: true,
        requiredSpecs: true,
        brand: { select: { slug: true } },
        variants: { select: { sku: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    process.stdout.write(
      `Şəbəkə aksesuarları products: ${products.length}\n`,
    );

    let moved = 0;
    for (const product of products) {
      const sku = product.variants[0]?.sku ?? '';
      if (!isSfpOpticalModule(product.name, sku)) {
        continue;
      }

      const data: {
        categoryId: string;
        seoTitle?: string;
        seoDescription?: string;
        description?: string;
      } = { categoryId: targetId };

      if (product.brand?.slug === 'grandstream' && sku !== '') {
        const specs = asSpecs(product.requiredSpecs);
        const seo = resolveGrandstreamProductSeo({
          sku,
          title: product.name,
          specs,
          subcategorySlug: TARGET_SLUG,
        });
        data.seoTitle = seo.seoTitle;
        data.seoDescription = seo.seoDescription;
        data.description = buildGrandstreamProductDescription(
          seo.pageIntro,
          specs,
        );
      }

      await prisma.product.update({
        where: { id: product.id },
        data,
      });
      moved += 1;
      process.stdout.write(`moved ${sku || product.id} | ${product.name}\n`);
    }

    process.stdout.write(`\nMoved ${moved} SFP modules to ${TARGET_SLUG}.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void moveSfpModules().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
