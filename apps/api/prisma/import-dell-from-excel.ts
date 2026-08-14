/**
 * One-shot import: Dell products from Dell_Məhsulları.xlsx
 * Sale price column → variant.price; AZN cost column → variant.cost
 * Variants are created with availableByOrder=true (sifarişlə).
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
  buildDellVariantAttributes,
  buildDellVariantName,
  resolveDellCatalogIdentity,
  sanitizeDellRequiredSpecs,
} from '../src/catalog/dell-product-name';
import {
  dellScene7AssetPath,
  isDellScene7Url,
  scene7CardImageUrl,
} from '../src/catalog/dell-official-image';
import {
  buildDellProductDescription,
  resolveDellProductSeo,
} from '../src/catalog/dell-product-seo';

const requireFromBackoffice = createRequire(
  path.join(__dirname, '../../backoffice/package.json'),
);
const XLSX = requireFromBackoffice('xlsx') as typeof import('xlsx');

loadEnvironment({ path: '../../.env', quiet: true });

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'Dell_Məhsulları.xlsx');

const PARENT_SLUG_BY_LABEL: Record<string, string> = {
  noutbuklar: 'noutbuklar',
  monitorlar: 'monitorlar',
  'gamer zona': 'gamer-zona',
  'tv ve audio': 'tv-audio',
  'komputer ve komponentleri': 'computer',
  'sebeke avadanliqlari': 'sebeke-avadanliqlari',
};

const SUB_SLUG_BY_PARENT_AND_LABEL: Record<string, Record<string, string>> = {
  noutbuklar: {
    'mobil workstation': 'mobil-workstation',
    '2-in-1 noutbuk': '2-in-1-noutbuk',
    'enerji adapteri': 'enerji-adapteri',
    'noutbuk aksesuarlari': 'noutbuk-aksesuarlari',
    'noutbuk cantasi': 'noutbuk-cantasi',
    noutbuk: 'noutbuk',
  },
  monitorlar: {
    monitor: 'monitor',
    'usb-c hub monitor': 'usb-c-hub-monitor',
    'ultra genis monitor': 'ultra-genis-monitor',
    'ultra keskin monitor': 'ultra-keskin-monitor',
  },
  'gamer zona': {
    'gaming klaviatura': 'gaming-klaviatura',
    'gaming monitor': 'gaming-monitor',
    'gaming sican': 'gaming-sican',
    'gaming canta': 'gaming-canta',
    qulaqliq: 'gaming-qulaqliq',
  },
  'tv ve audio': {
    qulaqliq: 'qulaqliq',
  },
  'komputer ve komponentleri': {
    'dok stansiyasi': 'dok-stansiya',
    'klaviatura ve sican desti': 'klaviatura-ve-sican-desti',
    klaviatura: 'klaviatura',
    masaustu: 'masaustu',
    monoblok: 'monoblok',
    sican: 'sican',
  },
  'sebeke avadanliqlari': {
    'sebeke adapteri': 'sebeke-adapteri',
  },
};

const SUBCATEGORIES_TO_ENSURE: Array<{
  parentSlug: string;
  slug: string;
  name: string;
}> = [
  {
    parentSlug: 'computer',
    slug: 'klaviatura-ve-sican-desti',
    name: 'Klaviatura və siçan dəsti',
  },
  {
    parentSlug: 'sebeke-avadanliqlari',
    slug: 'sebeke-adapteri',
    name: 'Şəbəkə adapteri',
  },
];

const SKIP_SPEC_LABELS = new Set(['kateqoriya', 'mənbə', 'menbe']);

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

type ExcelRow = {
  model: string;
  title: string;
  features: string;
  brand: string;
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

function specValue(
  specs: Array<{ label: string; value: string }>,
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) =>
    matcher(entry.label.toLocaleLowerCase('az')),
  );
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

function parseWarrantyMonths(features: string): number | null {
  const yearMatch = features.match(/Zəmanət:\s*(\d+)\s*il/i);
  if (yearMatch !== null) {
    return Number(yearMatch[1]) * 12;
  }
  const monthMatch = features.match(/Zəmanət:\s*(\d+)\s*ay/i);
  if (monthMatch !== null) {
    return Number(monthMatch[1]);
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

function cpuSkuSuffix(cpu: string): string {
  const compact = cpu.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ultra = compact.match(/ULTRA(\d)/);
  if (ultra?.[1] !== undefined) {
    return `U${ultra[1]}`;
  }
  const coreI = compact.match(/I(\d)/);
  if (coreI?.[1] !== undefined) {
    return `I${coreI[1]}`;
  }
  const coreN = compact.match(/CORE(\d)/);
  if (coreN?.[1] !== undefined) {
    return `C${coreN[1]}`;
  }
  return 'CFG';
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
    if (index === 0 || raw === undefined) {
      continue;
    }
    const model = String(raw[0] ?? '').trim();
    const title = String(raw[1] ?? '').trim();
    if (model === '' || title === '') {
      continue;
    }
    rows.push({
      model,
      title,
      features: String(raw[2] ?? '')
        .replace(/\r\n/g, '\n')
        .trim(),
      brand: String(raw[3] ?? '').trim(),
      costAzn: String(raw[5] ?? '').trim(),
      salePriceAzn: String(raw[7] ?? '').trim(),
      imageUrl: String(raw[8] ?? '').trim(),
      mainCategory: String(raw[9] ?? '').trim(),
      subCategory: String(raw[10] ?? '').trim(),
    });
  }
  return rows;
}

async function compressCatalogImage(body: Buffer): Promise<{
  body: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
} | null> {
  const inputPath = path.join(tmpdir(), `dell-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `dell-out-${randomUUID()}.jpg`);
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

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  if (imageUrl === '') {
    return null;
  }
  const scene7Path = isDellScene7Url(imageUrl)
    ? dellScene7AssetPath(imageUrl)
    : null;
  const fetchUrl =
    scene7Path !== null ? scene7CardImageUrl(scene7Path) : imageUrl;
  const response = await fetch(fetchUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: 'https://www.dell.com/',
    },
  });
  if (!response.ok) {
    process.stderr.write(
      `Image download failed (${response.status}): ${fetchUrl}\n`,
    );
    return null;
  }
  const raw = Buffer.from(await response.arrayBuffer());
  if (raw.byteLength < 100 || raw.byteLength > 15_000_000) {
    process.stderr.write(`Image size out of range: ${fetchUrl}\n`);
    return null;
  }
  const framed = await compressCatalogImage(raw);
  if (framed === null) {
    process.stderr.write(`Image frame failed: ${fetchUrl}\n`);
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

function assertSku(model: string): string {
  const sku = model.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model}`);
  }
  return sku;
}

function allocateSkus(rows: ExcelRow[]): string[] {
  const occurrenceByModel = new Map<string, number>();
  for (const row of rows) {
    const key = row.model.trim().toUpperCase();
    occurrenceByModel.set(key, (occurrenceByModel.get(key) ?? 0) + 1);
  }

  const used = new Set<string>();
  return rows.map((row) => {
    const base = assertSku(row.model);
    const duplicated = (occurrenceByModel.get(base) ?? 0) > 1;
    let sku = base;
    if (duplicated) {
      const specs = parseSpecs(row.features);
      const cpu = specValue(specs, (label) => label.startsWith('prosessor'));
      const suffix = cpu !== null ? cpuSkuSuffix(cpu) : 'CFG';
      sku = assertSku(`${base}-${suffix}`);
    }
    if (used.has(sku)) {
      for (let index = 2; index < 30; index += 1) {
        const candidate = assertSku(`${base}-${index}`);
        if (!used.has(candidate)) {
          sku = candidate;
          break;
        }
      }
    }
    if (used.has(sku)) {
      throw new Error(`Cannot allocate unique SKU for ${row.model}`);
    }
    used.add(sku);
    return sku;
  });
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'dell' },
    select: { id: true, name: true, status: true },
  });
  if (existing !== null) {
    if (existing.status !== CatalogStatus.ACTIVE) {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id, name: existing.name };
  }
  const created = await prisma.brand.create({
    data: {
      name: 'Dell',
      slug: 'dell',
      status: CatalogStatus.ACTIVE,
    },
    select: { id: true, name: true },
  });
  return created;
}

async function ensureSubcategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
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
      select: { id: true, parentId: true, status: true },
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
    if (existing.status !== CatalogStatus.ACTIVE) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { status: CatalogStatus.ACTIVE },
      });
    }
  }

  const categoryBySlug = new Map<string, string>();
  const requiredSlugs = new Set<string>();
  for (const byLabel of Object.values(SUB_SLUG_BY_PARENT_AND_LABEL)) {
    for (const slug of Object.values(byLabel)) {
      requiredSlugs.add(slug);
    }
  }

  for (const slug of requiredSlugs) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, parentId: true, status: true },
    });
    if (category === null) {
      throw new Error(`Subcategory missing: ${slug}`);
    }
    if (category.parentId === null) {
      throw new Error(`Subcategory ${slug} is a root category`);
    }
    if (category.status !== CatalogStatus.ACTIVE) {
      await prisma.category.update({
        where: { id: category.id },
        data: { status: CatalogStatus.ACTIVE },
      });
    }
    categoryBySlug.set(slug, category.id);
  }

  return categoryBySlug;
}

async function importDellProducts(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = readExcelRows();
  if (rows.length === 0) {
    throw new Error('No product rows found in Excel');
  }
  const skus = allocateSkus(rows);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let created = 0;
  let updated = 0;

  try {
    const brand = await ensureBrand(prisma);
    const categoryBySlug = await ensureSubcategories(prisma);

    for (const [index, row] of rows.entries()) {
      if (row.brand.toUpperCase() !== 'DELL') {
        throw new Error(`Unexpected brand for ${row.model}: ${row.brand}`);
      }

      const sku = skus[index];
      if (sku === undefined) {
        throw new Error(`SKU missing for row ${index}`);
      }

      const { subcategorySlug } = resolveCategorySlugs(
        row.mainCategory,
        row.subCategory,
      );
      const categoryId = categoryBySlug.get(subcategorySlug);
      if (categoryId === undefined) {
        throw new Error(`Category id missing for ${subcategorySlug}`);
      }

      const specs = parseSpecs(row.features);
      const identity = resolveDellCatalogIdentity(row.title, specs);
      const storedSpecs = sanitizeDellRequiredSpecs(specs);
      const productName = identity.productName;
      const seo = resolveDellProductSeo({
        sku,
        title: productName,
        specs: storedSpecs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const price = parseMoney(row.salePriceAzn);
      const cost = parseMoney(row.costAzn);
      const productSlugBase = slugifyCatalogLabel(`dell ${sku}`);
      let productSlug = productSlugBase;

      const existingVariant = await prisma.productVariant.findUnique({
        where: { sku },
        select: {
          id: true,
          productId: true,
        },
      });

      const attributes = buildDellVariantAttributes(
        specs,
        identity.colorFromName,
      );
      const variantName = buildDellVariantName(specs);

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
              description: buildDellProductDescription(seo.pageIntro, storedSpecs),
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
            const existingMedia = await tx.productMedia.findFirst({
              where: { productId: existingVariant.productId },
              orderBy: { sortOrder: 'asc' },
              select: { id: true },
            });
            if (existingMedia === null) {
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
            description: buildDellProductDescription(seo.pageIntro, storedSpecs),
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
            sku,
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
      `\nDone. created=${created} updated=${updated} totalRows=${rows.length}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void importDellProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
