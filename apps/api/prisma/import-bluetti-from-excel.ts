/**
 * One-shot import: Bluetti products from Bluetti_Məhsulları.xlsx
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
import {
  buildBluettiProductDescription,
  resolveBluettiProductSeo,
} from '../src/catalog/bluetti-product-seo';

const requireFromBackoffice = createRequire(
  path.join(__dirname, '../../backoffice/package.json'),
);
const XLSX = requireFromBackoffice('xlsx') as typeof import('xlsx');

loadEnvironment({ path: '../../.env', quiet: true });

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'Bluetti_Məhsulları.xlsx');

const SUBCATEGORY_SLUG_BY_LABEL: Record<string, string> = {
  'portativ enerji stansiyasi': 'portativ-enerji-stansiyasi',
  'portativ enerji stansiyası': 'portativ-enerji-stansiyasi',
  'gunes paneli': 'gunes-paneli',
  'günəş paneli': 'gunes-paneli',
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
  const inputPath = path.join(tmpdir(), `bluetti-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `bluetti-out-${randomUUID()}.jpg`);
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

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  if (imageUrl === '') {
    return null;
  }
  const response = await fetch(imageUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'itmarket-catalog-import/1.0' },
  });
  if (!response.ok) {
    process.stderr.write(
      `Image download failed (${response.status}): ${imageUrl}\n`,
    );
    return null;
  }
  let body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength < 100 || body.byteLength > 15_000_000) {
    process.stderr.write(`Image size out of range: ${imageUrl}\n`);
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

async function importBluettiProducts(): Promise<void> {
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
    const brand = await prisma.brand.findUnique({
      where: { slug: 'bluetti' },
      select: { id: true, name: true, status: true },
    });
    if (brand === null) {
      throw new Error('Bluetti brand not found (slug=bluetti)');
    }
    if (brand.status !== CatalogStatus.ACTIVE) {
      await prisma.brand.update({
        where: { id: brand.id },
        data: { status: CatalogStatus.ACTIVE },
      });
    }

    const energyRoot = await prisma.category.findUnique({
      where: { slug: 'portativ-enerji' },
      select: { id: true, status: true },
    });
    if (energyRoot === null) {
      throw new Error('Portativ enerji category not found');
    }

    const categoryBySlug = new Map<string, string>();
    for (const slug of new Set(Object.values(SUBCATEGORY_SLUG_BY_LABEL))) {
      const category = await prisma.category.findUnique({
        where: { slug },
        select: { id: true, parentId: true, status: true, name: true },
      });
      if (category === null) {
        throw new Error(`Subcategory missing: ${slug}`);
      }
      if (category.parentId !== energyRoot.id) {
        throw new Error(`Subcategory ${slug} is not under Portativ enerji`);
      }
      if (category.status !== CatalogStatus.ACTIVE) {
        await prisma.category.update({
          where: { id: category.id },
          data: { status: CatalogStatus.ACTIVE },
        });
      }
      categoryBySlug.set(slug, category.id);
    }

    for (const row of rows) {
      if (row.brand.toUpperCase() !== 'BLUETTI') {
        throw new Error(`Unexpected brand for ${row.model}: ${row.brand}`);
      }
      if (normalizeCategoryKey(row.mainCategory) !== 'portativ enerji') {
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

      const specs = parseSpecs(row.features);
      const seo = resolveBluettiProductSeo({
        sku,
        title: row.title,
        specs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const price = parseMoney(row.salePriceAzn);
      const cost = parseMoney(row.costAzn);
      const productSlugBase = slugifyCatalogLabel(`bluetti ${sku}`);
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
              description: buildBluettiProductDescription(seo.pageIntro, specs),
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
                  altText: row.title,
                  sortOrder: 0,
                },
              });
            }
          }
        });
        updated += 1;
        process.stdout.write(`updated ${sku} → ${row.title}\n`);
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
            description: buildBluettiProductDescription(seo.pageIntro, specs),
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
              altText: row.title,
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

void importBluettiProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
