/**
 * One-shot import: IP Phones from Sayt üçün IP Telefonlar.xlsx
 * Imports Cisco and Grandstream IP phones with images, specs, SEO, pricing, barcodes and store stock.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, unlink, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  CatalogStatus,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client';

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

const FALLBACK_IMAGE_URLS: Record<number, string> = {
  4: 'https://refurbphoneexchange.com/cdn/shop/products/7962G_1024x1024.jpg',
  13: 'https://www.atlasphones.com/cdn/shop/products/IMG_6722.jpg?v=1604691648',
  15: 'https://cdn11.bigcommerce.com/s-kw5wz/images/stencil/1280x1280/products/701/951/F111922827__79899.1428594247.jpg?c=2',
};

type ExcelRow = {
  num: number;
  mainCategory: string;
  subCategory: string;
  brand: string;
  model: string;
  condition: string;
  barcode: string | null;
  qty: number;
  priceAzn: Prisma.Decimal;
  features: string;
  imageUrl: string;
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

function normalizeAz(value: string): string {
  return value
    .split('')
    .map((c) => AZERBAIJANI_CHAR_MAP[c] ?? c)
    .join('')
    .toLowerCase();
}

function isUsedCondition(condition: string): boolean {
  const norm = normalizeAz(condition);
  return norm.includes('islenmis') || norm.includes('2-ci el') || norm.includes('used');
}

function slugify(value: string): string {
  return value
    .trim()
    .split('')
    .map((c) => AZERBAIJANI_CHAR_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseMoney(value: string, model: string): Prisma.Decimal {
  const normalized = value.replace(/[^\d.]/g, '');
  if (!normalized || isNaN(Number(normalized))) {
    if (model.toUpperCase() === 'GXP1400') {
      return new Prisma.Decimal(55);
    }
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(normalized);
}

function cleanBarcode(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '—' || trimmed === '-') return null;
  const match = trimmed.match(/^\(\d+\)(.+)$/);
  return match?.[1]?.trim() || trimmed;
}

function parseSpecs(features: string, condition: string): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [];
  const lines = features.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!label || !value) continue;
    entries.push({ label, value });
  }

  // Ensure Vəziyyəti spec exists
  if (!entries.some((e) => normalizeAz(e.label).includes('veziyyeti'))) {
    entries.splice(1, 0, { label: 'Vəziyyəti', value: condition });
  }

  return entries;
}

function resolveProductName(brand: string, model: string, condition: string, subCategory: string): string {
  const isUsed = isUsedCondition(condition);
  const isConference = normalizeAz(subCategory).includes('konfrans');

  if (isConference) {
    return `${brand} ${model} iclas otağı IP konfrans telefonu`;
  }

  switch (model.toUpperCase()) {
    case 'CP-7861-W-K9':
      return `${brand} CP-7861-W-K9 16-xətli ağ IP telefon`;
    case 'CP-7942G':
      return `${brand} CP-7942G 2-xətli biznes IP telefon`;
    case 'CP-7962G':
      return `${brand} CP-7962G 6-xətli biznes IP telefon`;
    case 'CP-9971-C-K9':
      return isUsed
        ? `${brand} CP-9971 sensorlu Gigabit video IP telefon (işlənmiş)`
        : `${brand} CP-9971 sensorlu Gigabit video IP telefon (yeni)`;
    case 'CP-8945-K9':
      return `${brand} CP-8945 kameralı Gigabit video IP telefon`;
    case 'CP-7961G-GE':
      return `${brand} CP-7961G-GE 6-xətli Gigabit IP telefon`;
    case 'CP-7961G':
      return `${brand} CP-7961G 6-xətli biznes IP telefon`;
    case 'CP-7945G':
      return `${brand} CP-7945G 2-xətli rəngli Gigabit IP telefon`;
    case 'CP-7965G':
      return `${brand} CP-7965G 6-xətli rəngli Gigabit IP telefon`;
    case 'SPA504G':
      return `${brand} SPA504G 4-xətli biznes IP telefon`;
    case 'CP-7971G-GE':
      return `${brand} CP-7971G-GE 8-xətli rəngli sensorlu Gigabit IP telefon`;
    case 'GXP1400':
      return `${brand} GXP1400 2-xətli HD IP telefon`;
    case 'CP-6921-C-K9':
      return `${brand} CP-6921 2-xətli qara masaüstü IP telefon`;
    case 'SPA525G':
      return `${brand} SPA525G 5-xətli rəngli Wi-Fi Bluetooth IP telefon`;
    case 'CP-7821-K9':
      return `${brand} CP-7821 2-xətli biznes IP telefon (yeni)`;
    case 'CP-7940G':
      return `${brand} CP-7940G 2-xətli klassik IP telefon`;
    case 'CP-7821-3PCC-K9':
      return `${brand} CP-7821 Multiplatform 3PCC açıq SIP IP telefon`;
    case 'CP-7841-K9':
      return `${brand} CP-7841 4-xətli Gigabit IP telefon`;
    case 'CP-7937G':
      return `${brand} CP-7937G iclas otağı IP konfrans telefonu`;
    default:
      return `${brand} ${model} IP telefon`;
  }
}

function resolveProductDescription(
  productName: string,
  brand: string,
  model: string,
  condition: string,
  subCategory: string,
  specs: Array<{ label: string; value: string }>,
): string {
  const isUsed = isUsedCondition(condition);
  const conditionText = isUsed
    ? 'İşlənmiş (əla texniki vəziyyətdə, tam test olunmuş)'
    : 'Tam yeni (istifadə olunmamış, orijinal qablaşdırmada)';

  const specsList = specs
    .filter((s) => !['brend', 'model'].includes(normalizeAz(s.label)))
    .map((s) => `• ${s.label}: ${s.value}`)
    .join('\n');

  return `${productName} — ${brand} tərəfindən hazırlanmış yüksək etibarlı və peşəkar rabitə avadanlığıdır. Müasir ofis, korporativ şəbəkə və zəng mərkəzləri üçün ideal səs keyfiyyəti, zəng idarəetməsi və şəbəkə sabitliyi təmin edir.

Əsas xüsusiyyətlər:
• Vəziyyəti: ${conditionText}
${specsList}

IT Market olaraq bütün təqdim olunan şəbəkə və rabitə avadanlıqlarına texniki keyfiyyət zəmanəti, operativ çatdırılma və peşəkar müştəri dəstəyi təqdim edirik.`;
}

function resolveSeo(productName: string, brand: string, model: string, subCategory: string): { seoTitle: string; seoDescription: string } {
  const seoTitle = `${productName} - IT Market`;
  const seoDescription = `${productName} modelini IT Market-dən sərfəli qiymət və zəmanətlə əldə edin. Orijinal ${brand} şəbəkə avadanlıqları və operativ çatdırılma.`;
  return { seoTitle, seoDescription };
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
  return 'image/jpeg';
}

function extensionForMime(mime: 'image/jpeg' | 'image/png' | 'image/webp'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function compressCatalogImage(body: Buffer): Promise<{
  body: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
} | null> {
  const inputPath = path.join(tmpdir(), `phone-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `phone-out-${randomUUID()}.jpg`);
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
        '85',
        outputPath,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
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
  if (!imageUrl) return null;
  try {
    const response = await fetch(imageUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      process.stderr.write(`Image download failed (${response.status}): ${imageUrl}\n`);
      return null;
    }
    let body: Buffer = Buffer.from(await response.arrayBuffer()) as Buffer;
    if (body.byteLength < 100) return null;

    let mimeType = sniffMime(body);
    if (body.byteLength > 2_000_000) {
      const compressed = await compressCatalogImage(body);
      if (compressed) {
        body = compressed.body;
        mimeType = compressed.mimeType;
      }
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
  } catch (err) {
    process.stderr.write(`Error downloading image ${imageUrl}: ${String(err)}\n`);
    return null;
  }
}

async function readExcel(): Promise<ExcelRow[]> {
  const dirFiles = await readdir(WORKSPACE_ROOT);
  const excelFileName = dirFiles.find((f) => f.includes('Sayt') && f.endsWith('.xlsx'));
  if (!excelFileName) {
    throw new Error('Excel file "Sayt üçün IP Telefonlar.xlsx" not found');
  }
  const excelPath = path.join(WORKSPACE_ROOT, excelFileName);
  const workbook = XLSX.readFile(excelPath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) throw new Error('Sheet missing');

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  const rows: ExcelRow[] = [];
  for (let i = 3; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || !r[0]) continue;
    const num = Number(r[0]);
    const mainCategory = String(r[1] ?? '').trim();
    const subCategory = String(r[2] ?? '').trim();
    const brand = String(r[3] ?? '').trim();
    const model = String(r[4] ?? '').trim();
    const condition = String(r[5] ?? '').trim();
    const barcode = cleanBarcode(r[6] !== null ? String(r[6]) : null);
    const qty = Math.max(0, parseInt(String(r[7] ?? '0'), 10) || 0);
    const priceAzn = parseMoney(String(r[8] ?? '0'), model);
    const features = String(r[9] ?? '').replace(/\r\n/g, '\n').trim();
    const rawUrl = String(r[10] ?? '').trim();
    const imageUrl = FALLBACK_IMAGE_URLS[num] ?? rawUrl;

    rows.push({
      num,
      mainCategory,
      subCategory,
      brand,
      model,
      condition,
      barcode,
      qty,
      priceAzn,
      features,
      imageUrl,
    });
  }
  return rows;
}

export async function importIpPhones(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await readExcel();
  console.log(`Found ${rows.length} products to import from Excel.`);

  try {
    // 1. Ensure Brand IDs
    const ciscoBrand = await prisma.brand.findUniqueOrThrow({ where: { slug: 'cisco' } });
    const grandstreamBrand = await prisma.brand.findUniqueOrThrow({ where: { slug: 'grandstream' } });

    // 2. Ensure Categories
    const ipPhoneCat = await prisma.category.findUniqueOrThrow({ where: { slug: 'ip-telefon' } });
    const ipConferenceCat = await prisma.category.findUniqueOrThrow({ where: { slug: 'ip-konfrans-telefonu' } });

    // 3. Ensure Store Location (ST-28MAY)
    const storeLocation = await prisma.location.findUnique({ where: { code: 'ST-28MAY' } });
    if (!storeLocation) {
      throw new Error('Store location ST-28MAY not found');
    }

    // Set of used barcodes during this import to avoid DB unique constraint collisions
    const usedBarcodes = new Set<string>();

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const isGrandstream = row.brand.toLowerCase().includes('grandstream');
      const brand = isGrandstream ? grandstreamBrand : ciscoBrand;
      const isConference = normalizeAz(row.subCategory).includes('konfrans');
      const category = isConference ? ipConferenceCat : ipPhoneCat;

      const productName = resolveProductName(brand.name, row.model, row.condition, row.subCategory);
      const isUsed = isUsedCondition(row.condition);
      
      // Build Unique SKU and Slug
      const cleanModelUpper = row.model.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const brandPrefix = isGrandstream ? 'GRA' : 'CIS';
      let sku = `${brandPrefix}-${cleanModelUpper}`;
      let slug = slugify(`${brand.slug}-${row.model}`);

      // Handle duplicate model with different condition (e.g. CP-9971-C-K9 used vs new)
      if (row.model === 'CP-9971-C-K9') {
        if (isUsed) {
          sku = `${brandPrefix}-${cleanModelUpper}-USED`;
          slug = `${slugify(`${brand.slug}-${row.model}`)}-islenmis`;
        } else {
          sku = `${brandPrefix}-${cleanModelUpper}`;
          slug = slugify(`${brand.slug}-${row.model}`);
        }
      }

      // Barcode validation to avoid duplicate collision
      let assignedBarcode: string | null = null;
      if (row.barcode) {
        if (!usedBarcodes.has(row.barcode)) {
          // Check if barcode belongs to another variant in DB
          const existingWithBarcode = await prisma.productVariant.findFirst({
            where: { barcode: row.barcode, status: CatalogStatus.ACTIVE, NOT: { sku } },
            select: { id: true },
          });
          if (!existingWithBarcode) {
            assignedBarcode = row.barcode;
            usedBarcodes.add(row.barcode);
          }
        }
      }

      const specs = parseSpecs(row.features, row.condition);
      const description = resolveProductDescription(
        productName,
        brand.name,
        row.model,
        row.condition,
        row.subCategory,
        specs,
      );
      const { seoTitle, seoDescription } = resolveSeo(productName, brand.name, row.model, row.subCategory);

      // Download Image
      console.log(`[№ ${row.num}] Downloading image for ${row.model}...`);
      const media = await downloadImage(row.imageUrl);

      const attributes: Record<string, string> = {
        Model: row.model,
        Vəziyyəti: row.condition,
      };
      for (const spec of specs.slice(0, 10)) {
        if (!(spec.label in attributes)) {
          attributes[spec.label] = spec.value;
        }
      }

      const availableByOrder = row.qty === 0;

      // Upsert Product & Variant in Transaction
      await prisma.$transaction(async (tx) => {
        let product = await tx.product.findUnique({
          where: { slug },
        });

        if (product) {
          product = await tx.product.update({
            where: { id: product.id },
            data: {
              categoryId: category.id,
              brandId: brand.id,
              name: productName,
              description,
              status: CatalogStatus.ACTIVE,
              seoTitle,
              seoDescription,
              requiredSpecs: specs,
            },
          });
          updatedCount++;
        } else {
          product = await tx.product.create({
            data: {
              categoryId: category.id,
              brandId: brand.id,
              name: productName,
              slug,
              description,
              status: CatalogStatus.ACTIVE,
              seoTitle,
              seoDescription,
              requiredSpecs: specs,
            },
          });
          createdCount++;
        }

        // Upsert ProductMedia
        if (media) {
          await tx.productMedia.deleteMany({
            where: { productId: product.id },
          });
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

        // Upsert Variant
        let variant = await tx.productVariant.findUnique({
          where: { sku },
        });

        if (variant) {
          variant = await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              productId: product.id,
              name: row.condition === 'Yeni' ? 'Yeni' : 'İşlənmiş',
              barcode: assignedBarcode,
              price: row.priceAzn,
              attributes,
              status: CatalogStatus.ACTIVE,
              availableByOrder,
            },
          });
        } else {
          variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku,
              barcode: assignedBarcode,
              name: row.condition === 'Yeni' ? 'Yeni' : 'İşlənmiş',
              price: row.priceAzn,
              attributes,
              currency: 'AZN',
              status: CatalogStatus.ACTIVE,
              availableByOrder,
            },
          });
        }

        // Upsert ProductVariantMedia
        if (media) {
          await tx.productVariantMedia.deleteMany({
            where: { variantId: variant.id },
          });
          await tx.productVariantMedia.create({
            data: {
              variantId: variant.id,
              objectKey: media.objectKey,
              mimeType: media.mimeType,
              byteSize: media.byteSize,
              altText: productName,
              sortOrder: 0,
            },
          });
        }

        // Upsert Inventory Balance
        await tx.inventoryBalance.upsert({
          where: {
            variantId_locationId: {
              variantId: variant.id,
              locationId: storeLocation.id,
            },
          },
          create: {
            variantId: variant.id,
            locationId: storeLocation.id,
            onHand: row.qty,
            reserved: 0,
          },
          update: {
            onHand: row.qty,
          },
        });
      });

      console.log(`[№ ${row.num}] Processed ${productName} (SKU: ${sku}, Price: ${row.priceAzn} AZN, Stock: ${row.qty})`);
    }

    console.log(`\nImport completed successfully! Created: ${createdCount}, Updated: ${updatedCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  importIpPhones().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
