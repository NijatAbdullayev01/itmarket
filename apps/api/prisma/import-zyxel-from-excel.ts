/**
 * One-shot import: Zyxel products from Zyxel RRP for partner.xlsx
 * Partner price (ƏDV daxil) → variant.cost; sale = ROUND(cost × 1.25, 2) → variant.price
 * Variants are created with availableByOrder=true (sifarişlə).
 *
 * Safety: never overwrites a SKU that already belongs to another brand.
 * Existing Zyxel rows are updated in place; media is added only when missing.
 * Product photos: official Zyxel Product Photos URLs from the Excel sheet.
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
  normalizeZyxelSku,
  resolveZyxelCatalogName,
} from '../src/catalog/zyxel-product-name';
import {
  buildZyxelProductDescription,
  resolveZyxelProductSeo,
} from '../src/catalog/zyxel-product-seo';

type ExcelSheet = Record<string, unknown>;

type ExcelWorkbook = {
  SheetNames: string[];
  Sheets: Record<string, ExcelSheet | undefined>;
};

type ExcelParser = {
  readFile: (
    filePath: string,
    options?: { cellDates?: boolean },
  ) => ExcelWorkbook;
  utils: {
    sheet_to_json: <T>(
      sheet: ExcelSheet,
      options: { header: 1; defval: null; raw: false },
    ) => T[];
  };
};

const requireFromBackoffice = createRequire(
  path.join(__dirname, '../../backoffice/package.json'),
);
const XLSX = requireFromBackoffice('xlsx') as ExcelParser;

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
loadEnvironment({ path: path.join(WORKSPACE_ROOT, '.env'), quiet: true });

const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'Zyxel RRP for partner.xlsx');
const PRODUCTS_SHEET = 'Zyxel kataloq';

const PARENT_SLUG = 'sebeke-avadanliqlari';

const SUBCATEGORIES_TO_ENSURE: Array<{ slug: string; name: string }> = [
  { slug: 'kommutator', name: 'Kommutator' },
  { slug: 'access-point', name: 'Access Point' },
];

const SUBCATEGORY_SLUG_BY_LABEL: Record<string, string> = {
  kommutator: 'kommutator',
  'access point': 'access-point',
};

const SKIP_SPEC_LABELS = new Set([
  'brend',
  'status',
  'kateqoriya',
  'mənbə',
  'menbe',
]);

const BRAND_LOGO_URLS = [
  'https://info.zyxel.com/hubfs/Zyxel%20Networks%20logo.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Zyxel_logo.svg/640px-Zyxel_logo.svg.png',
];

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
};

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
  partNumber: string;
  title: string;
  features: string;
  costAzn: string;
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

function salePriceFromCost(cost: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(cost.mul('1.25').toFixed(2));
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

function resolveSubcategorySlug(label: string): string {
  const slug = SUBCATEGORY_SLUG_BY_LABEL[normalizeCategoryKey(label)];
  if (slug === undefined) {
    throw new Error(`Unknown subcategory: ${label}`);
  }
  return slug;
}

function pushSpec(
  entries: Array<{ label: string; value: string }>,
  label: string,
  value: string,
): void {
  const trimmedLabel = label.trim();
  const trimmedValue = value.trim();
  if (trimmedLabel === '' || trimmedValue === '') {
    return;
  }
  const key = trimmedLabel
    .toLocaleLowerCase('az')
    .split('')
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join('');
  if (SKIP_SPEC_LABELS.has(key)) {
    return;
  }
  if (
    entries.some(
      (entry) =>
        entry.label.toLocaleLowerCase('az') ===
        trimmedLabel.toLocaleLowerCase('az'),
    )
  ) {
    return;
  }
  entries.push({ label: trimmedLabel, value: trimmedValue });
}

function parseSpecs(features: string): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [];
  for (const rawLine of features.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }
    const fragments = line.split(/\s*\|\s*/);
    let pendingLabel: string | null = null;
    let pendingValue: string | null = null;
    for (const fragment of fragments) {
      const separator = fragment.indexOf(':');
      if (separator > 0) {
        if (pendingLabel !== null && pendingValue !== null) {
          pushSpec(entries, pendingLabel, pendingValue);
        }
        pendingLabel = fragment.slice(0, separator).trim();
        pendingValue = fragment.slice(separator + 1).trim();
        continue;
      }
      if (pendingValue !== null) {
        pendingValue = `${pendingValue} | ${fragment.trim()}`;
      }
    }
    if (pendingLabel !== null && pendingValue !== null) {
      pushSpec(entries, pendingLabel, pendingValue);
    }
  }
  return entries;
}

function cellText(
  raw: Array<string | null> | undefined,
  index: number,
): string {
  return String(raw?.[index] ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function readExcelRows(): ExcelRow[] {
  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const sheet =
    workbook.Sheets[PRODUCTS_SHEET] ?? workbook.Sheets[workbook.SheetNames[0]!];
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
    const model = cellText(raw, 5);
    const title = cellText(raw, 6);
    const costAzn = cellText(raw, 9);
    if (model === '' || title === '' || costAzn === '') {
      continue;
    }
    rows.push({
      model,
      partNumber: cellText(raw, 4),
      title,
      features: cellText(raw, 8),
      costAzn,
      imageUrl: cellText(raw, 11),
      mainCategory: cellText(raw, 1),
      subCategory: cellText(raw, 2),
    });
  }
  return rows;
}

function sniffMime(body: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (
    body.length >= 3 &&
    body[0] === 0xff &&
    body[1] === 0xd8 &&
    body[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    body.length >= 8 &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    body.length >= 12 &&
    body.toString('ascii', 0, 4) === 'RIFF' &&
    body.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  throw new Error('Unsupported image content');
}

function extensionForMime(
  mime: 'image/jpeg' | 'image/png' | 'image/webp',
): string {
  if (mime === 'image/png') {
    return 'png';
  }
  if (mime === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

async function compressCatalogImage(body: Buffer): Promise<{
  body: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
} | null> {
  const inputPath = path.join(tmpdir(), `zyxel-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `zyxel-out-${randomUUID()}.jpg`);
  await writeFile(inputPath, body);
  try {
    const result = spawnSync(
      'convert',
      [
        inputPath,
        '-resize',
        '1600x1600>',
        '-strip',
        '-quality',
        '82',
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

function referersFor(imageUrl: string): Array<string | undefined> {
  const referers: Array<string | undefined> = [
    'https://www.zyxel.com/',
    'https://www.zyxel.com/global/en/',
  ];
  try {
    const parsed = new URL(imageUrl);
    const origin = `${parsed.protocol}//${parsed.host}/`;
    if (!referers.includes(origin)) {
      referers.push(origin);
    }
  } catch {
    referers.push(undefined);
    return referers;
  }
  referers.push(undefined);
  return referers;
}

async function fetchImageBody(imageUrl: string): Promise<Buffer | null> {
  for (const referer of referersFor(imageUrl)) {
    const headers: Record<string, string> = { ...FETCH_HEADERS };
    if (referer !== undefined) {
      headers.Referer = referer;
    }
    try {
      const response = await fetch(imageUrl, {
        redirect: 'follow',
        headers,
      });
      if (!response.ok) {
        continue;
      }
      const body = Buffer.from(await response.arrayBuffer());
      if (body.byteLength < 100 || body.byteLength > 15_000_000) {
        continue;
      }
      return body;
    } catch {
      continue;
    }
  }
  process.stderr.write(`Image download failed: ${imageUrl}\n`);
  return null;
}

async function saveCatalogImage(
  body: Buffer,
  sourceLabel: string,
  kind: 'catalog' | 'brands' = 'catalog',
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  let imageBody = body;
  let mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  try {
    mimeType = sniffMime(imageBody);
  } catch {
    process.stderr.write(`Image mime unsupported: ${sourceLabel}\n`);
    return null;
  }
  if (imageBody.byteLength > 2_500_000) {
    const compressed = await compressCatalogImage(imageBody);
    if (compressed === null) {
      process.stderr.write(`Image compress skipped: ${sourceLabel}\n`);
      return null;
    }
    imageBody = compressed.body;
    mimeType = compressed.mimeType;
  }
  const objectKey = `/images/${kind}/${randomUUID()}.${extensionForMime(mimeType)}`;
  const fileName = path.basename(objectKey);
  const directories = [
    path.join(WORKSPACE_ROOT, `apps/storefront/public/images/${kind}`),
    path.join(WORKSPACE_ROOT, `apps/backoffice/public/images/${kind}`),
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
  }
  const primary = path.join(directories[0]!, fileName);
  await writeFile(primary, imageBody);
  await copyFile(primary, path.join(directories[1]!, fileName));
  return { objectKey, mimeType, byteSize: imageBody.byteLength };
}

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  if (imageUrl === '') {
    return null;
  }
  const body = await fetchImageBody(imageUrl);
  if (body === null) {
    return null;
  }
  return saveCatalogImage(body, imageUrl);
}

function assertSku(model: string): string {
  const sku = normalizeZyxelSku(model);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model} → ${sku}`);
  }
  return sku;
}

async function attachBrandLogoIfMissing(
  prisma: PrismaClient,
  brandId: string,
  logoObjectKey: string | null,
): Promise<void> {
  if (logoObjectKey !== null && logoObjectKey !== '') {
    return;
  }
  for (const url of BRAND_LOGO_URLS) {
    const body = await fetchImageBody(url);
    if (body === null) {
      continue;
    }
    const logo = await saveCatalogImage(body, 'zyxel-brand-logo', 'brands');
    if (logo === null) {
      continue;
    }
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        logoObjectKey: logo.objectKey,
        logoMimeType: logo.mimeType,
        logoByteSize: logo.byteSize,
      },
    });
    return;
  }
  process.stderr.write('Zyxel brand logo download failed\n');
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'zyxel' },
    select: {
      id: true,
      name: true,
      status: true,
      logoObjectKey: true,
    },
  });
  if (existing === null) {
    const created = await prisma.brand.create({
      data: {
        name: 'Zyxel',
        slug: 'zyxel',
        status: CatalogStatus.ACTIVE,
      },
      select: { id: true, name: true, logoObjectKey: true },
    });
    await attachBrandLogoIfMissing(prisma, created.id, created.logoObjectKey);
    return { id: created.id, name: 'Zyxel' };
  }
  if (existing.status !== CatalogStatus.ACTIVE || existing.name !== 'Zyxel') {
    await prisma.brand.update({
      where: { id: existing.id },
      data: { name: 'Zyxel', status: CatalogStatus.ACTIVE },
    });
  }
  await attachBrandLogoIfMissing(prisma, existing.id, existing.logoObjectKey);
  return { id: existing.id, name: 'Zyxel' };
}

async function ensureSubcategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  const parent = await prisma.category.findUnique({
    where: { slug: PARENT_SLUG },
    select: { id: true, parentId: true, status: true },
  });
  if (parent === null) {
    throw new Error('Şəbəkə avadanlıqları category not found');
  }
  if (parent.parentId !== null) {
    throw new Error('Expected root category: sebeke-avadanliqlari');
  }
  if (parent.status !== CatalogStatus.ACTIVE) {
    await prisma.category.update({
      where: { id: parent.id },
      data: { status: CatalogStatus.ACTIVE },
    });
  }

  for (const entry of SUBCATEGORIES_TO_ENSURE) {
    const existing = await prisma.category.findUnique({
      where: { slug: entry.slug },
      select: { id: true, parentId: true, status: true },
    });
    if (existing === null) {
      const aggregate = await prisma.category.aggregate({
        where: { parentId: parent.id },
        _max: { sortOrder: true },
      });
      await prisma.category.create({
        data: {
          name: entry.name,
          slug: entry.slug,
          parentId: parent.id,
          status: CatalogStatus.ACTIVE,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
      continue;
    }
    if (existing.parentId !== parent.id) {
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
  for (const entry of SUBCATEGORIES_TO_ENSURE) {
    const category = await prisma.category.findUnique({
      where: { slug: entry.slug },
      select: { id: true },
    });
    if (category === null) {
      throw new Error(`Subcategory missing: ${entry.slug}`);
    }
    categoryBySlug.set(entry.slug, category.id);
  }
  return categoryBySlug;
}

async function importZyxelProducts(): Promise<void> {
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

  try {
    const brand = await ensureBrand(prisma);
    const categoryBySlug = await ensureSubcategories(prisma);

    for (const row of rows) {
      if (normalizeCategoryKey(row.mainCategory) !== 'sebeke avadanliqlari') {
        throw new Error(
          `Unexpected main category for ${row.model}: ${row.mainCategory}`,
        );
      }

      const sku = assertSku(row.model);
      const subcategorySlug = resolveSubcategorySlug(row.subCategory);
      const categoryId = categoryBySlug.get(subcategorySlug);
      if (categoryId === undefined) {
        throw new Error(`Category id missing for ${subcategorySlug}`);
      }

      const specs: Array<{ label: string; value: string }> = [];
      pushSpec(specs, 'Model', row.model);
      if (row.partNumber !== '') {
        pushSpec(specs, 'Part nömrəsi', row.partNumber);
      }
      for (const spec of parseSpecs(row.features)) {
        pushSpec(specs, spec.label, spec.value);
      }
      const productName = resolveZyxelCatalogName(sku, row.title);
      const seo = resolveZyxelProductSeo({
        sku,
        title: productName,
        specs,
        subcategorySlug,
      });
      const cost = parseMoney(row.costAzn);
      const price = salePriceFromCost(cost);
      const productSlugBase = slugifyCatalogLabel(`zyxel ${sku}`);
      let productSlug = productSlugBase;

      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel: sku,
        specs: [],
        includePhoneTabletVariantAttributes: false,
      });
      const existingByGenerated = await prisma.productVariant.findUnique({
        where: { sku: generatedSku },
        select: {
          id: true,
          product: { select: { brandId: true } },
        },
      });
      if (
        existingByGenerated !== null &&
        existingByGenerated.product.brandId !== brand.id
      ) {
        throw new Error(`SKU ${generatedSku} already belongs to another brand`);
      }
      const existingVariant = await findExistingImportedVariant(prisma, {
        brandId: brand.id,
        manufacturerModel: sku,
        generatedSku,
      });

      const attributes: Record<string, string> = { Model: row.model };
      if (row.partNumber !== '') {
        attributes['Part nömrəsi'] = row.partNumber;
      }
      for (const spec of specs.slice(0, 12)) {
        if (!(spec.label in attributes)) {
          attributes[spec.label] = spec.value;
        }
      }

      const existingMediaCount =
        existingVariant === null
          ? 0
          : await prisma.productMedia.count({
              where: { productId: existingVariant.productId },
            });
      const media =
        existingMediaCount === 0 ? await downloadImage(row.imageUrl) : null;

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: productName,
              description: buildZyxelProductDescription(seo.pageIntro, specs),
              status: CatalogStatus.ACTIVE,
              seoTitle: seo.seoTitle,
              seoDescription: seo.seoDescription,
              requiredSpecs: specs,
            },
          });
          await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              sku: generatedSku,
              name: 'Standart',
              attributes,
              price,
              cost,
              currency: 'AZN',
              status: CatalogStatus.ACTIVE,
              availableByOrder: true,
            },
          });
          if (media !== null) {
            const currentMediaCount = await tx.productMedia.count({
              where: { productId: existingVariant.productId },
            });
            if (currentMediaCount === 0) {
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
            description: buildZyxelProductDescription(seo.pageIntro, specs),
            status: CatalogStatus.ACTIVE,
            seoTitle: seo.seoTitle,
            seoDescription: seo.seoDescription,
            requiredSpecs: specs,
          },
          select: { id: true },
        });

        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: generatedSku,
            name: 'Standart',
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

void importZyxelProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
