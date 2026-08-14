/**
 * One-shot import: EnGenius products from EnGenius_Məhsulları.xlsx
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
  buildCatalogImportIdentity,
  findExistingImportedVariant,
  generateCatalogImportSku,
} from '../src/catalog/catalog-import-identity';
import { resolveEnGeniusCatalogName } from '../src/catalog/engenius-product-name';
import {
  buildEnGeniusProductDescription,
  resolveEnGeniusProductSeo,
} from '../src/catalog/engenius-product-seo';

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

loadEnvironment({ path: '../../.env', quiet: true });

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'EnGenius_Məhsulları.xlsx');

const PARENT_SLUG = 'sebeke-avadanliqlari';
const SUBCATEGORY_SLUG = 'kommutator';
const SUBCATEGORY_NAME = 'Kommutator';

const SUBCATEGORY_SLUG_BY_LABEL: Record<string, string> = {
  kommutator: SUBCATEGORY_SLUG,
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
    entries.push({ label, value });
  }
  return entries;
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

function resolveSubcategorySlug(label: string): string {
  const slug = SUBCATEGORY_SLUG_BY_LABEL[normalizeCategoryKey(label)];
  if (slug === undefined) {
    throw new Error(`Unknown subcategory: ${label}`);
  }
  return slug;
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
  const inputPath = path.join(tmpdir(), `engenius-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `engenius-out-${randomUUID()}.jpg`);
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

async function fetchImageBody(imageUrl: string): Promise<Buffer | null> {
  const response = await fetch(imageUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: 'https://www.engeniustech.com/',
    },
  });
  if (!response.ok) {
    process.stderr.write(
      `Image download failed (${response.status}): ${imageUrl}\n`,
    );
    return null;
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength < 100 || body.byteLength > 15_000_000) {
    process.stderr.write(`Image size out of range: ${imageUrl}\n`);
    return null;
  }
  return body;
}

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  if (imageUrl === '') {
    return null;
  }
  let body = await fetchImageBody(imageUrl);
  if (body === null) {
    return null;
  }
  let mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  try {
    mimeType = sniffMime(body);
  } catch {
    process.stderr.write(`Image mime unsupported: ${imageUrl}\n`);
    return null;
  }
  if (body.byteLength > 2_500_000) {
    const compressed = await compressCatalogImage(body);
    if (compressed === null) {
      process.stderr.write(`Image compress skipped: ${imageUrl}\n`);
      return null;
    }
    body = compressed.body;
    mimeType = compressed.mimeType;
  }
  const objectKey = `/images/catalog/${randomUUID()}.${extensionForMime(mimeType)}`;
  const fileName = path.basename(objectKey);
  const directories = [
    path.join(WORKSPACE_ROOT, 'apps/storefront/public/images/catalog'),
    path.join(WORKSPACE_ROOT, 'apps/backoffice/public/images/catalog'),
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
  }
  const primary = path.join(directories[0]!, fileName);
  await writeFile(primary, body);
  await copyFile(primary, path.join(directories[1]!, fileName));
  return { objectKey, mimeType, byteSize: body.byteLength };
}

function assertSku(model: string): string {
  const sku = model.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model}`);
  }
  return sku;
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'engenius' },
    select: { id: true, name: true, status: true },
  });
  if (existing !== null) {
    if (existing.status !== CatalogStatus.ACTIVE || existing.name !== 'EnGenius') {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { name: 'EnGenius', status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id, name: 'EnGenius' };
  }
  return prisma.brand.create({
    data: {
      name: 'EnGenius',
      slug: 'engenius',
      status: CatalogStatus.ACTIVE,
    },
    select: { id: true, name: true },
  });
}

async function ensureKommutatorCategory(
  prisma: PrismaClient,
): Promise<string> {
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

  const existing = await prisma.category.findUnique({
    where: { slug: SUBCATEGORY_SLUG },
    select: { id: true, parentId: true, status: true },
  });
  if (existing === null) {
    const aggregate = await prisma.category.aggregate({
      where: { parentId: parent.id },
      _max: { sortOrder: true },
    });
    const created = await prisma.category.create({
      data: {
        name: SUBCATEGORY_NAME,
        slug: SUBCATEGORY_SLUG,
        parentId: parent.id,
        status: CatalogStatus.ACTIVE,
        sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
      },
      select: { id: true },
    });
    return created.id;
  }
  if (existing.parentId !== parent.id) {
    throw new Error(`Subcategory ${SUBCATEGORY_SLUG} has unexpected parent`);
  }
  if (existing.status !== CatalogStatus.ACTIVE) {
    await prisma.category.update({
      where: { id: existing.id },
      data: { status: CatalogStatus.ACTIVE },
    });
  }
  return existing.id;
}

async function importEnGeniusProducts(): Promise<void> {
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
    const categoryId = await ensureKommutatorCategory(prisma);

    for (const row of rows) {
      if (row.brand.toUpperCase() !== 'ENGENIUS') {
        throw new Error(`Unexpected brand for ${row.model}: ${row.brand}`);
      }
      if (normalizeCategoryKey(row.mainCategory) !== 'sebeke avadanliqlari') {
        throw new Error(
          `Unexpected main category for ${row.model}: ${row.mainCategory}`,
        );
      }

      const sku = assertSku(row.model);
      const productName = resolveEnGeniusCatalogName(sku, row.title);
      const subcategorySlug = resolveSubcategorySlug(row.subCategory);
      if (subcategorySlug !== SUBCATEGORY_SLUG) {
        throw new Error(
          `Unexpected subcategory for ${row.model}: ${row.subCategory}`,
        );
      }

      const specs = parseSpecs(row.features);
      const seo = resolveEnGeniusProductSeo({
        sku,
        title: productName,
        specs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const price = parseMoney(row.salePriceAzn);
      const cost = parseMoney(row.costAzn);
      const productSlugBase = slugifyCatalogLabel(`engenius ${sku}`);
      let productSlug = productSlugBase;

      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel: sku,
        specs,
        includePhoneTabletVariantAttributes: false,
      });
      const existingVariant = await findExistingImportedVariant(prisma, {
        brandId: brand.id,
        manufacturerModel: sku,
        generatedSku,
      });


      const attributes: Record<string, string> = { Model: sku };
      for (const spec of specs.slice(0, 12)) {
        if (!(spec.label in attributes)) {
          attributes[spec.label] = spec.value;
        }
      }

      const media = await downloadImage(row.imageUrl);

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: sku,
              description: buildEnGeniusProductDescription(seo.pageIntro, specs),
              warrantyMonths,
              status: CatalogStatus.ACTIVE,
              seoTitle: seo.seoTitle,
              seoDescription: seo.seoDescription,
              requiredSpecs: specs,
            },
          });
          await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              name: sku,
              attributes: attributes,
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
            name: sku,
            slug: productSlug,
            description: buildEnGeniusProductDescription(seo.pageIntro, specs),
            warrantyMonths,
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
            attributes: attributes,
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

void importEnGeniusProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
