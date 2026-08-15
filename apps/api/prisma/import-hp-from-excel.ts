/**
 * One-shot import: HP products from HP.xlsx
 * Qiymət AZN → variant.cost; Satış qiyməti AZN (+25%) → variant.price
 * Variants are created with availableByOrder=true (sifarişlə).
 *
 * Identity is the HP part number (SKU / P/N). Same marketing name may appear
 * on multiple configs; each P/N is a separate product so prices are not overwritten.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  CatalogStatus,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client';
import {
  findExistingImportedVariant,
  generateCatalogImportSku,
} from '../src/catalog/catalog-import-identity';
import {
  buildHpVariantAttributes,
  buildHpVariantName,
  enrichHpRequiredSpecs,
  normalizeHpSku,
  resolveHpCatalogIdentity,
} from '../src/catalog/hp-product-name';
import {
  buildHpProductDescription,
  resolveHpProductSeo,
} from '../src/catalog/hp-product-seo';

const requireFromBackoffice = createRequire(
  path.join(__dirname, '../../backoffice/package.json'),
);
const XLSX = requireFromBackoffice('xlsx') as typeof import('xlsx');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
loadEnvironment({ path: path.join(WORKSPACE_ROOT, '.env'), quiet: true });

const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'HP.xlsx');

const PARENT_SLUG_BY_LABEL: Record<string, string> = {
  noutbuklar: 'noutbuklar',
  monitorlar: 'monitorlar',
  'tv ve audio': 'tv-audio',
  'komputer ve komponentleri': 'computer',
};

const SUB_SLUG_BY_PARENT_AND_LABEL: Record<string, Record<string, string>> = {
  noutbuklar: {
    '2-in-1 noutbuk': '2-in-1-noutbuk',
    'enerji adapteri': 'enerji-adapteri',
    'mobil workstation': 'mobil-workstation',
    noutbuk: 'noutbuk',
    'noutbuk aksesuarlari': 'noutbuk-aksesuarlari',
    'noutbuk cantasi': 'noutbuk-cantasi',
  },
  monitorlar: {
    monitor: 'monitor',
    'ultra genis monitor': 'ultra-genis-monitor',
    'ultra keskin monitor': 'ultra-keskin-monitor',
  },
  'tv ve audio': {
    qulaqliq: 'qulaqliq',
  },
  'komputer ve komponentleri': {
    'dok stansiyasi': 'dok-stansiya',
    'dok stansiya': 'dok-stansiya',
    klaviatura: 'klaviatura',
    'klaviatura ve sican desti': 'klaviatura-ve-sican-desti',
    masaustu: 'masaustu',
    monoblok: 'monoblok',
    sican: 'sican',
    videokart: 'videokart',
  },
};

const PARENTS_TO_ENSURE: Array<{ slug: string; name: string }> = [
  { slug: 'noutbuklar', name: 'Noutbuklar' },
  { slug: 'monitorlar', name: 'Monitorlar' },
  { slug: 'tv-audio', name: 'TV və audio' },
  { slug: 'computer', name: 'Kompüter və komponentləri' },
];

const SUBCATEGORIES_TO_ENSURE: Array<{
  parentSlug: string;
  slug: string;
  name: string;
}> = [
  { parentSlug: 'noutbuklar', slug: 'noutbuk', name: 'Noutbuk' },
  { parentSlug: 'noutbuklar', slug: '2-in-1-noutbuk', name: '2-in-1 noutbuk' },
  {
    parentSlug: 'noutbuklar',
    slug: 'mobil-workstation',
    name: 'Mobil workstation',
  },
  {
    parentSlug: 'noutbuklar',
    slug: 'enerji-adapteri',
    name: 'Enerji adapteri',
  },
  {
    parentSlug: 'noutbuklar',
    slug: 'noutbuk-aksesuarlari',
    name: 'Noutbuk aksesuarları',
  },
  { parentSlug: 'noutbuklar', slug: 'noutbuk-cantasi', name: 'Noutbuk çantası' },
  { parentSlug: 'monitorlar', slug: 'monitor', name: 'Monitor' },
  {
    parentSlug: 'monitorlar',
    slug: 'ultra-keskin-monitor',
    name: 'Ultra kəskin monitor',
  },
  {
    parentSlug: 'monitorlar',
    slug: 'ultra-genis-monitor',
    name: 'Ultra geniş monitor',
  },
  { parentSlug: 'tv-audio', slug: 'qulaqliq', name: 'Qulaqlıq' },
  { parentSlug: 'computer', slug: 'masaustu', name: 'Masaüstü' },
  { parentSlug: 'computer', slug: 'monoblok', name: 'Monoblok' },
  { parentSlug: 'computer', slug: 'dok-stansiya', name: 'Dok stansiya' },
  { parentSlug: 'computer', slug: 'klaviatura', name: 'Klaviatura' },
  { parentSlug: 'computer', slug: 'sican', name: 'Siçan' },
  {
    parentSlug: 'computer',
    slug: 'klaviatura-ve-sican-desti',
    name: 'Klaviatura və siçan dəsti',
  },
  { parentSlug: 'computer', slug: 'videokart', name: 'Videokart' },
];

const SKIP_SPEC_LABELS = new Set([
  'brend',
  'status',
  'kateqoriya',
  'mənbə',
  'menbe',
  'sku',
]);

const AZERBAIJANI_CHAR_MAP: Record<string, string> = {
  ə: 'e',
  ı: 'i',
  ö: 'o',
  ü: 'u',
  ğ: 'g',
  ç: 'c',
  ş: 's',
  Ə: 'e',
  I: 'i',
  İ: 'i',
  Ö: 'o',
  Ü: 'u',
  Ğ: 'g',
  Ç: 'c',
  Ş: 's',
};

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Referer: 'https://www.hp.com/',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
};

type ExcelRow = {
  sku: string;
  title: string;
  features: string;
  costAzn: string;
  salePriceAzn: string;
  imageUrl: string;
  mainCategory: string;
  subCategory: string;
};

function slugifyCatalogLabel(value: string): string {
  return value
    .trim()
    .split('')
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseMoney(value: string): Prisma.Decimal {
  const normalized = value.replace(/\s/g, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid money value: ${value}`);
  }
  return new Prisma.Decimal(normalized);
}

function parseSpecs(features: string): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [];
  for (const rawLine of features.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator <= 0) {
      continue;
    }
    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (label === '' || value === '') {
      continue;
    }
    if (SKIP_SPEC_LABELS.has(label.toLocaleLowerCase('az'))) {
      continue;
    }
    entries.push({ label, value });
  }
  return entries;
}

function parseWarrantyMonths(features: string): number | null {
  const labeledYear = features.match(/Zəmanət:\s*(\d+)\s*il/i);
  if (labeledYear !== null) {
    return Number(labeledYear[1]) * 12;
  }
  const labeledMonth = features.match(/Zəmanət:\s*(\d+)\s*ay/i);
  if (labeledMonth !== null) {
    return Number(labeledMonth[1]);
  }
  const proseYear = features.match(/(\d+)\s*il zəmanət/i);
  if (proseYear !== null) {
    return Number(proseYear[1]) * 12;
  }
  return null;
}

function normalizeCategoryKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveCategorySlugs(
  mainCategory: string,
  subCategory: string,
): { parentSlug: string; subcategorySlug: string } {
  const parentKey = normalizeCategoryKey(mainCategory);
  const parentSlug = PARENT_SLUG_BY_LABEL[parentKey];
  if (parentSlug === undefined) {
    throw new Error(`Unknown main category: ${mainCategory}`);
  }
  const subKey = normalizeCategoryKey(subCategory);
  const subcategorySlug = SUB_SLUG_BY_PARENT_AND_LABEL[parentKey]?.[subKey];
  if (subcategorySlug === undefined) {
    throw new Error(
      `Unknown subcategory: ${subCategory} (under ${mainCategory})`,
    );
  }
  return { parentSlug, subcategorySlug };
}

function readExcelRows(): ExcelRow[] {
  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (sheet === undefined) {
    throw new Error('Excel sheet missing');
  }
  const matrix = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  const rows: ExcelRow[] = [];
  for (const [index, raw] of matrix.entries()) {
    if (index < 3 || raw === undefined) {
      continue;
    }
    const sku = normalizeHpSku(String(raw[3] ?? ''));
    const title = String(raw[4] ?? '').trim();
    if (sku === '' || title === '') {
      continue;
    }
    rows.push({
      sku,
      title,
      features: String(raw[5] ?? '')
        .replace(/\r\n/g, '\n')
        .trim(),
      costAzn: String(raw[8] ?? '').trim(),
      salePriceAzn: String(raw[9] ?? '').trim(),
      imageUrl: String(raw[10] ?? '').trim(),
      mainCategory: String(raw[1] ?? '').trim(),
      subCategory: String(raw[2] ?? '').trim(),
    });
  }
  return rows;
}

function assertSku(model: string): string {
  const sku = normalizeHpSku(model);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model}`);
  }
  return sku;
}

function ensurePartNumberSpec(
  specs: Array<{ label: string; value: string }>,
  sku: string,
): Array<{ label: string; value: string }> {
  const hasPart = specs.some(
    (entry) => entry.label.toLocaleLowerCase('az') === 'part number',
  );
  if (hasPart) {
    return specs;
  }
  return [...specs, { label: 'Part number', value: sku }];
}

async function compressCatalogImage(body: Buffer): Promise<{
  body: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
} | null> {
  const inputPath = path.join(tmpdir(), `hp-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `hp-out-${randomUUID()}.jpg`);
  await writeFile(inputPath, body);
  try {
    const result = spawnSync(
      'convert',
      [
        inputPath,
        '-alpha',
        'on',
        '-fuzz',
        '6%',
        '-trim',
        '+repage',
        '-resize',
        '984x984',
        '-background',
        '#FFFFFF',
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-gravity',
        'center',
        '-extent',
        '1200x1200',
        '-fuzz',
        '3%',
        '-fill',
        '#FFFFFF',
        '-opaque',
        '#F7F8FA',
        '-strip',
        '-quality',
        '86',
        outputPath,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      process.stderr.write(
        `Image compress failed: ${result.stderr || result.error?.message || 'unknown'}\n`,
      );
      return null;
    }
    const compressed = await readFile(outputPath);
    if (compressed.byteLength < 100) {
      return null;
    }
    return { body: compressed, mimeType: 'image/jpeg' };
  } finally {
    await Promise.allSettled([unlink(inputPath), unlink(outputPath)]);
  }
}

function imageUrlFallbacks(imageUrl: string): string[] {
  const urls = [imageUrl];
  if (imageUrl.includes('/highres/')) {
    urls.push(imageUrl.replace('/highres/', '/lowres/'));
  }
  if (imageUrl.endsWith('.png')) {
    urls.push(imageUrl.replace(/\.png$/i, '.jpg'));
  } else if (imageUrl.endsWith('.jpg')) {
    urls.push(imageUrl.replace(/\.jpg$/i, '.png'));
  }
  return [...new Set(urls)];
}

async function fetchImageBody(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl, {
      redirect: 'follow',
      headers: FETCH_HEADERS,
    });
    if (!response.ok) {
      return null;
    }
    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.byteLength < 100 || raw.byteLength > 15_000_000) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  if (imageUrl === '' || !/^https?:\/\//i.test(imageUrl)) {
    return null;
  }
  let raw: Buffer | null = null;
  for (const candidate of imageUrlFallbacks(imageUrl)) {
    raw = await fetchImageBody(candidate);
    if (raw !== null) {
      break;
    }
  }
  if (raw === null) {
    process.stderr.write(`Image download failed: ${imageUrl}\n`);
    return null;
  }
  const framed = await compressCatalogImage(raw);
  if (framed === null) {
    process.stderr.write(`Image frame failed: ${imageUrl}\n`);
    return null;
  }
  const objectKey = `/images/catalog/${randomUUID()}.jpg`;
  const fileName = path.basename(objectKey);
  const directories = [
    path.join(WORKSPACE_ROOT, 'apps/storefront/public/images/catalog'),
    path.join(WORKSPACE_ROOT, 'apps/backoffice/public/images/catalog'),
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
  }
  const primary = path.join(directories[0]!, fileName);
  await writeFile(primary, framed.body);
  await copyFile(primary, path.join(directories[1]!, fileName));
  return {
    objectKey,
    mimeType: framed.mimeType,
    byteSize: framed.body.byteLength,
  };
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'hp' },
    select: { id: true, name: true, status: true },
  });
  if (existing !== null) {
    if (existing.status !== CatalogStatus.ACTIVE || existing.name !== 'HP') {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { name: 'HP', status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id, name: 'HP' };
  }
  return prisma.brand.create({
    data: {
      name: 'HP',
      slug: 'hp',
      status: CatalogStatus.ACTIVE,
    },
    select: { id: true, name: true },
  });
}

async function ensureRootCategory(
  prisma: PrismaClient,
  slug: string,
  name: string,
): Promise<{ id: string }> {
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, parentId: true, status: true, name: true },
  });
  if (existing !== null) {
    if (existing.parentId !== null) {
      throw new Error(`Expected root category: ${slug}`);
    }
    if (existing.status !== CatalogStatus.ACTIVE || existing.name !== name) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name, status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id };
  }
  const aggregate = await prisma.category.aggregate({
    where: { parentId: null },
    _max: { sortOrder: true },
  });
  return prisma.category.create({
    data: {
      name,
      slug,
      status: CatalogStatus.ACTIVE,
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
}

async function ensureSubcategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  for (const parent of PARENTS_TO_ENSURE) {
    await ensureRootCategory(prisma, parent.slug, parent.name);
  }

  const parentBySlug = new Map<string, string>();
  for (const parentSlug of new Set(Object.values(PARENT_SLUG_BY_LABEL))) {
    const parent = await prisma.category.findUnique({
      where: { slug: parentSlug },
      select: { id: true, parentId: true, status: true },
    });
    if (parent === null) {
      throw new Error(`Main category missing: ${parentSlug}`);
    }
    if (parent.parentId !== null) {
      throw new Error(`Expected root category: ${parentSlug}`);
    }
    if (parent.status !== CatalogStatus.ACTIVE) {
      await prisma.category.update({
        where: { id: parent.id },
        data: { status: CatalogStatus.ACTIVE },
      });
    }
    parentBySlug.set(parentSlug, parent.id);
  }

  for (const entry of SUBCATEGORIES_TO_ENSURE) {
    const parentId = parentBySlug.get(entry.parentSlug);
    if (parentId === undefined) {
      throw new Error(`Parent missing for ${entry.slug}`);
    }
    const existing = await prisma.category.findUnique({
      where: { slug: entry.slug },
      select: { id: true, parentId: true, status: true, name: true },
    });
    if (existing === null) {
      const aggregate = await prisma.category.aggregate({
        where: { parentId },
        _max: { sortOrder: true },
      });
      await prisma.category.create({
        data: {
          name: entry.name,
          slug: entry.slug,
          parentId,
          status: CatalogStatus.ACTIVE,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
      continue;
    }
    if (existing.parentId !== parentId) {
      throw new Error(`Subcategory ${entry.slug} has unexpected parent`);
    }
    if (
      existing.status !== CatalogStatus.ACTIVE ||
      existing.name !== entry.name
    ) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name: entry.name, status: CatalogStatus.ACTIVE },
      });
    }
  }

  const categoryBySlug = new Map<string, string>();
  for (const entry of SUBCATEGORIES_TO_ENSURE) {
    const category = await prisma.category.findUnique({
      where: { slug: entry.slug },
      select: { id: true, parentId: true },
    });
    if (category === null) {
      throw new Error(`Subcategory missing: ${entry.slug}`);
    }
    if (category.parentId === null) {
      throw new Error(`Subcategory ${entry.slug} is a root category`);
    }
    categoryBySlug.set(entry.slug, category.id);
  }
  return categoryBySlug;
}

async function importHpProducts(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = readExcelRows();
  if (rows.length === 0) {
    throw new Error('No product rows found in Excel');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const brand = await ensureBrand(prisma);
    const categoryBySlug = await ensureSubcategories(prisma);

    for (const row of rows) {
      const sku = assertSku(row.sku);
      const { subcategorySlug } = resolveCategorySlugs(
        row.mainCategory,
        row.subCategory,
      );
      const categoryId = categoryBySlug.get(subcategorySlug);
      if (categoryId === undefined) {
        throw new Error(`Category id missing for ${subcategorySlug}`);
      }

      const parsedSpecs = parseSpecs(row.features);
      const storedSpecs = ensurePartNumberSpec(
        enrichHpRequiredSpecs(parsedSpecs, sku),
        sku,
      );
      const identity = resolveHpCatalogIdentity(row.title, storedSpecs, sku);
      const productName = identity.productName;
      const seo = resolveHpProductSeo({
        sku,
        title: productName,
        specs: storedSpecs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const price = parseMoney(row.salePriceAzn);
      const cost = parseMoney(row.costAzn);
      const productSlugBase = slugifyCatalogLabel(`hp ${sku}`);
      let productSlug = productSlugBase;

      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel: sku,
        specs: storedSpecs,
        includePhoneTabletVariantAttributes: false,
      });

      const skuClash = await prisma.productVariant.findUnique({
        where: { sku: generatedSku },
        select: {
          id: true,
          product: { select: { brandId: true } },
        },
      });
      if (skuClash !== null && skuClash.product.brandId !== brand.id) {
        process.stderr.write(
          `skipped ${sku}: SKU ${generatedSku} belongs to another brand\n`,
        );
        skipped += 1;
        continue;
      }

      const existingVariant = await findExistingImportedVariant(prisma, {
        brandId: brand.id,
        manufacturerModel: sku,
        generatedSku,
      });

      const attributes = buildHpVariantAttributes(
        storedSpecs,
        identity.colorFromName,
      );
      const variantName = buildHpVariantName(storedSpecs);
      const description = buildHpProductDescription(
        seo.pageIntro,
        storedSpecs,
        parsedSpecs.length === 0 ? row.features : undefined,
      );

      const existingMedia =
        existingVariant === null
          ? null
          : await prisma.productMedia.findFirst({
              where: { productId: existingVariant.productId },
              orderBy: { sortOrder: 'asc' },
              select: { id: true },
            });
      const media =
        existingMedia === null ? await downloadImage(row.imageUrl) : null;

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: productName,
              description,
              warrantyMonths,
              status: CatalogStatus.ACTIVE,
              seoTitle: seo.seoTitle,
              seoDescription: seo.seoDescription,
              requiredSpecs: storedSpecs,
            },
          });
          await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              sku: generatedSku,
              name: variantName,
              attributes,
              price,
              cost,
              currency: 'AZN',
              status: CatalogStatus.ACTIVE,
              availableByOrder: true,
            },
          });
          if (media !== null) {
            const currentMedia = await tx.productMedia.findFirst({
              where: { productId: existingVariant.productId },
              orderBy: { sortOrder: 'asc' },
              select: { id: true },
            });
            if (currentMedia === null) {
              await tx.productMedia.create({
                data: {
                  productId: existingVariant.productId,
                  objectKey: media.objectKey,
                  mimeType: media.mimeType,
                  byteSize: media.byteSize,
                  altText: productName,
                  sortOrder: 0,
                },
              });
            }
          }
        });
        updated += 1;
        process.stdout.write(`updated ${sku} → ${productName}\n`);
        continue;
      }

      const slugConflict = await prisma.product.findUnique({
        where: { slug: productSlug },
        select: { id: true },
      });
      if (slugConflict !== null) {
        productSlug = `${productSlugBase}-${randomUUID().slice(0, 8)}`;
      }

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            categoryId,
            brandId: brand.id,
            name: productName,
            slug: productSlug,
            description,
            warrantyMonths,
            status: CatalogStatus.ACTIVE,
            seoTitle: seo.seoTitle,
            seoDescription: seo.seoDescription,
            requiredSpecs: storedSpecs,
          },
          select: { id: true },
        });

        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: generatedSku,
            name: variantName,
            attributes,
            price,
            cost,
            currency: 'AZN',
            status: CatalogStatus.ACTIVE,
            availableByOrder: true,
          },
        });

        if (media !== null) {
          await tx.productMedia.create({
            data: {
              productId: product.id,
              objectKey: media.objectKey,
              mimeType: media.mimeType,
              byteSize: media.byteSize,
              altText: productName,
              sortOrder: 0,
            },
          });
        }
      });

      created += 1;
      process.stdout.write(
        `created ${sku} | ${price.toFixed(2)} AZN | ${subcategorySlug} | media=${media ? 'yes' : 'no'}\n`,
      );
    }

    process.stdout.write(
      `\nDone. created=${String(created)} updated=${String(updated)} skipped=${String(skipped)} totalRows=${String(rows.length)}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void importHpProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
