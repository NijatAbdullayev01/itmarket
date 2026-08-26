/**
 * Import AEM (DVR / Camera) products from "Sayt üçün 26082026_260812_162518 -AEM-DVR-CAMERA.xlsx".
 *
 * Column layout of the "Məhsullar" sheet (0-indexed after two title rows + header):
 *   0 № | 1 Model | 2 Barkod | 3 Vəziyyəti | 4 Qty | 5 Qiymət (endirimli)
 *   6 Köhnə qiymət | 7 Əsas kateqoriya | 8 Alt kateqoriya | 9 Brend
 *   10 Xüsusiyyətlər (AZ) | 11 Xüsusiyyətlər (RU) | 12 Xüsusiyyətlər (EN) | 13 Şəkil linkləri
 *
 * Imports 24 Hikvision DVR / NVR / IP camera / Analog camera products with images,
 * AZ/RU/EN translated specs (stored in requiredSpecs so the storefront shows the
 * correct translations when the customer switches locale), SEO, pricing and stock.
 *
 * Products are created under the existing "Təhlükəsizlik avadanlıqları" tree;
 * the "Analoq kamera" subcategory is created because the source workbook marks it
 * as new ("YENİ — yaradılmalıdır").
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
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

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
loadEnvironment({ path: path.join(WORKSPACE_ROOT, '.env'), quiet: true });

type ExcelRow = {
  num: number;
  mainCategory: string;
  subCategory: string;
  brand: string;
  model: string;
  barcode: string | null;
  condition: string;
  qty: number;
  priceAzn: Prisma.Decimal;
  previousPriceAzn: Prisma.Decimal;
  featuresAz: string;
  featuresRu: string;
  featuresEn: string;
  imageUrl: string;
};

type SpecEntry = {
  label: string;
  value: string;
  labelRu?: string;
  valueRu?: string;
  labelEn?: string;
  valueEn?: string;
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

function parseMoney(value: string | number): Prisma.Decimal {
  if (typeof value === 'number') {
    return new Prisma.Decimal(value);
  }
  const normalized = String(value).replace(/[^\d.]/g, '');
  if (!normalized || isNaN(Number(normalized))) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(normalized);
}

function parseSpecs(features: string): Array<{ label: string; value: string }> {
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
  return entries;
}

/**
 * AZ/RU/EN feature columns are line-aligned in the workbook, so each AZ spec is
 * paired with its Russian and English translation by index.
 */
function buildSpecEntriesWithTranslations(
  featuresAz: string,
  featuresRu: string,
  featuresEn: string,
): SpecEntry[] {
  const az = parseSpecs(featuresAz);
  const ru = parseSpecs(featuresRu);
  const en = parseSpecs(featuresEn);

  return az
    .map((entry, index) => {
      const ruEntry = ru[index];
      const enEntry = en[index];
      return {
        label: entry.label,
        value: entry.value,
        ...(ruEntry ? { labelRu: ruEntry.label, valueRu: ruEntry.value } : {}),
        ...(enEntry ? { labelEn: enEntry.label, valueEn: enEntry.value } : {}),
      };
    })
    .filter(
      (entry) =>
        !['veziyyeti', 'brend', 'model', 'barkod'].includes(
          normalizeAz(entry.label),
        ),
    );
}

function tipOf(featuresAz: string): string {
  for (const line of featuresAz.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Tip:')) {
      return trimmed.slice('Tip:'.length).trim();
    }
  }
  return '';
}

function resolveTypeFragment(tip: string): string {
  const t = tip.toLowerCase();
  if (t.includes('tandemvu')) return 'PTZ IP Kamera';
  if (t.includes('speed dome')) return 'Speed Dome IP Kamera';
  if (t.includes('ip pt')) return 'IP PT Kamera';
  if (t.includes('dvr')) return 'DVR';
  if (t.includes('nvr')) return 'NVR';
  if (t.includes('ip sabit') || t.includes('ip fixed')) return 'IP Kamera';
  if (t.includes('analoq') || t.includes('analog')) return 'Analoq Kamera';
  return '';
}

function cleanModel(model: string): string {
  let m = String(model).trim();
  const upper = m.toUpperCase();
  if (upper.startsWith('HIKVISION ')) {
    m = m.slice('HIKVISION '.length);
  }
  return m.trim();
}

function resolveSubCategorySlug(subCategory: string): string {
  const norm = normalizeAz(subCategory);
  if (norm.includes('dvr')) return 'dvr';
  if (norm.includes('nvr')) return 'nvr';
  if (norm.includes('ip kamera')) return 'ip-kamera';
  if (norm.includes('analoq kamera')) return 'analoq-kamera';
  return slugify(subCategory);
}

type ProductDefinition = {
  name: string;
  sku: string;
  slug: string;
  cleanModel: string;
  subCategorySlug: string;
};

function resolveProductDefinition(row: ExcelRow): ProductDefinition {
  const tip = tipOf(row.featuresAz);
  const fragment = resolveTypeFragment(tip);
  const clean = cleanModel(row.model);

  const name = `Hikvision ${clean}${fragment ? ` ${fragment}` : ''}`;

  const skuPart = clean
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const sku = `HIK-${skuPart}`;

  const slug = slugify(`hikvision-${clean}`);

  return {
    name,
    sku,
    slug,
    cleanModel: clean,
    subCategorySlug: resolveSubCategorySlug(row.subCategory),
  };
}

function resolveProductDescription(
  productName: string,
  brand: string,
  barcode: string | null,
  specs: Array<{ label: string; value: string }>,
): string {
  const specsList = specs
    .filter(
      (s) =>
        !['brend', 'model', 'barkod', 'veziyyeti'].includes(
          normalizeAz(s.label),
        ),
    )
    .map((s) => `• ${s.label}: ${s.value}`)
    .join('\n');

  return `${productName} — ${brand} tərəfindən istehsal olunmuş etibarlı və yüksək keyfiyyətli texnoloji məhsuldur.

Əsas göstəricilər və xüsusiyyətlər:
• Vəziyyəti: Tam yeni (istifadə olunmamış, orijinal qablaşdırmada)
${barcode ? `• Barkod: ${barcode}\n` : ''}${specsList}

IT Market olaraq bütün məhsullara texniki keyfiyyət zəmanəti, operativ çatdırılma və peşəkar servis dəstəyi təqdim edirik.`;
}

function resolveSeo(
  productName: string,
  brand: string,
): { seoTitle: string; seoDescription: string } {
  const seoTitle = `${productName} - IT Market`;
  const seoDescription = `${productName} modelini IT Market-dən ən sərfəli qiymət və rəsmi zəmanətlə əldə edin. Orijinal ${brand} avadanlıqları və operativ çatdırılma.`;
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

function extensionForMime(
  mime: 'image/jpeg' | 'image/png' | 'image/webp',
): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function compressCatalogImage(body: Buffer): Promise<{
  body: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
} | null> {
  const inputPath = path.join(tmpdir(), `aem-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `aem-out-${randomUUID()}.jpg`);
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
      process.stderr.write(
        `Image download failed (${response.status}): ${imageUrl}\n`,
      );
      return null;
    }
    let body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength < 100) return null;

    let mimeType = sniffMime(body);
    if (body.byteLength > 1_500_000) {
      const compressed = await compressCatalogImage(body);
      if (compressed) {
        body = Buffer.from(compressed.body);
        mimeType = compressed.mimeType;
      }
    }

    const objectKey = `/images/catalog/${randomUUID()}.${extensionForMime(mimeType)}`;
    const fileName = path.basename(objectKey);
    const directories = [
      path.join(WORKSPACE_ROOT, 'apps/storefront/public/images/catalog'),
      path.join(WORKSPACE_ROOT, 'apps/backoffice/public/images/catalog'),
      path.join(WORKSPACE_ROOT, 'apps/api/public/images/catalog'),
    ];
    for (const directory of directories) {
      await mkdir(directory, { recursive: true });
    }
    const primaryDir = directories[0];
    const boDir = directories[1];
    const apiDir = directories[2];
    if (!primaryDir || !boDir || !apiDir) {
      return null;
    }
    const primary = path.join(primaryDir, fileName);
    await writeFile(primary, body);
    await copyFile(primary, path.join(boDir, fileName));
    await copyFile(primary, path.join(apiDir, fileName));
    return { objectKey, mimeType, byteSize: body.byteLength };
  } catch (err) {
    process.stderr.write(
      `Error downloading image ${imageUrl}: ${String(err)}\n`,
    );
    return null;
  }
}

/**
 * The workbook exists in two Unicode encodings in the workspace; pick the file
 * that carries the image links (the product data is otherwise identical).
 */
async function resolveExcelPath(): Promise<string> {
  const dirFiles = await readdir(WORKSPACE_ROOT);
  const candidates = dirFiles.filter(
    (f) =>
      f.includes('AEM-DVR-CAMERA') &&
      f.includes('26082026') &&
      f.endsWith('.xlsx'),
  );
  if (candidates.length === 0) {
    throw new Error(
      'Excel file "Sayt üçün 26082026... -AEM-DVR-CAMERA.xlsx" not found',
    );
  }
  let best = candidates[0] as string;
  let bestImages = -1;
  for (const candidate of candidates) {
    const workbook = XLSX.readFile(path.join(WORKSPACE_ROOT, candidate), {
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0] || 'Məhsullar';
    const sheet = workbook.Sheets[sheetName];
    const matrix = sheet
      ? XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
          header: 1,
          defval: null,
          raw: false,
        })
      : [];
    let withImages = 0;
    for (let i = 3; i < matrix.length; i++) {
      const r = matrix[i];
      if (r?.[0] && String(r[13] ?? '').trim()) withImages++;
    }
    if (withImages > bestImages) {
      bestImages = withImages;
      best = candidate;
    }
  }
  return path.join(WORKSPACE_ROOT, best);
}

async function readExcel(): Promise<ExcelRow[]> {
  const excelPath = await resolveExcelPath();
  const workbook = XLSX.readFile(excelPath, { cellDates: true });
  const sheetName = workbook.SheetNames[0] || 'Məhsullar';
  const sheet = workbook.Sheets[sheetName];
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
    const model = String(r[1] ?? '').trim();
    const barcode = r[2] ? String(r[2]).trim() : null;
    const condition = String(r[3] ?? '').trim();
    const qty = Math.max(0, parseInt(String(r[4] ?? '0'), 10) || 0);
    const priceAzn = parseMoney(r[5] ?? 0);
    const previousPriceAzn = parseMoney(r[6] ?? 0);
    const mainCategory = String(r[7] ?? '').trim();
    const subCategory = String(r[8] ?? '').trim();
    const brand = String(r[9] ?? '').trim();
    const featuresAz = String(r[10] ?? '')
      .replace(/\r\n/g, '\n')
      .trim();
    const featuresRu = String(r[11] ?? '')
      .replace(/\r\n/g, '\n')
      .trim();
    const featuresEn = String(r[12] ?? '')
      .replace(/\r\n/g, '\n')
      .trim();
    const imageUrl = String(r[13] ?? '').trim();

    rows.push({
      num,
      mainCategory,
      subCategory,
      brand,
      model,
      barcode,
      condition,
      qty,
      priceAzn,
      previousPriceAzn,
      featuresAz,
      featuresRu,
      featuresEn,
      imageUrl,
    });
  }
  return rows;
}

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

export async function importAemDvrCameraFromExcel(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await readExcel();
  console.log(
    `Found ${rows.length} products to import from "Sayt üçün 26082026... -AEM-DVR-CAMERA.xlsx".`,
  );

  try {
    // 1. Ensure Brand
    let brand = await prisma.brand.findUnique({ where: { slug: 'hikvision' } });
    if (!brand) {
      brand = await prisma.brand.findFirst({
        where: { name: { equals: 'Hikvision', mode: 'insensitive' } },
      });
    }
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: 'Hikvision',
          slug: 'hikvision',
          status: CatalogStatus.ACTIVE,
        },
      });
    } else if (
      brand.slug !== 'hikvision' ||
      brand.status !== CatalogStatus.ACTIVE
    ) {
      brand = await prisma.brand.update({
        where: { id: brand.id },
        data: {
          name: 'Hikvision',
          slug: 'hikvision',
          status: CatalogStatus.ACTIVE,
        },
      });
    }
    console.log(`Brand ready: ${brand.name} (${brand.slug})`);

    // 2. Ensure Root Category
    let rootCategory = await prisma.category.findUnique({
      where: { slug: 'tehlukesizlik-avadanliqlari' },
    });
    if (!rootCategory) {
      rootCategory = await prisma.category.create({
        data: {
          name: 'Təhlükəsizlik avadanlıqları',
          slug: 'tehlukesizlik-avadanliqlari',
          parentId: null,
          status: CatalogStatus.ACTIVE,
        },
      });
    }

    // 3. Ensure Subcategories (Analoq kamera is new; others exist)
    const subCategoryDefs = [
      { name: 'DVR', slug: 'dvr' },
      { name: 'NVR', slug: 'nvr' },
      { name: 'IP kamera', slug: 'ip-kamera' },
      { name: 'Analoq kamera', slug: 'analoq-kamera' },
    ];
    const subCatMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    for (const sc of subCategoryDefs) {
      const cat = await prisma.category.upsert({
        where: { slug: sc.slug },
        create: {
          name: sc.name,
          slug: sc.slug,
          parentId: rootCategory.id,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: sc.name,
          parentId: rootCategory.id,
          status: CatalogStatus.ACTIVE,
        },
      });
      subCatMap.set(sc.slug, cat);
    }

    // 4. Ensure Store Location (ST-28MAY)
    const storeLocation = await prisma.location.findUnique({
      where: { code: 'ST-28MAY' },
    });
    if (!storeLocation) {
      throw new Error('Store location ST-28MAY not found');
    }

    let createdCount = 0;

    for (const row of rows) {
      const definition = resolveProductDefinition(row);

      const category = subCatMap.get(definition.subCategorySlug);
      if (!category) {
        throw new Error(
          `Category not resolved for ${row.mainCategory} > ${row.subCategory} (${definition.subCategorySlug})`,
        );
      }

      const productName = definition.name;
      const sku = definition.sku;
      const slug = definition.slug;

      const translatedFeatures = buildSpecEntriesWithTranslations(
        row.featuresAz,
        row.featuresRu,
        row.featuresEn,
      );

      const conditionValue =
        row.condition.trim() === 'Yeni' ? 'Yeni' : 'İşlənmiş';
      const specs: SpecEntry[] = [
        {
          label: 'Brend',
          value: brand.name,
          labelRu: 'Бренд',
          valueRu: brand.name,
          labelEn: 'Brand',
          valueEn: brand.name,
        },
        {
          label: 'Model',
          value: row.model,
          labelRu: 'Модель',
          valueRu: row.model,
          labelEn: 'Model',
          valueEn: row.model,
        },
      ];
      if (row.barcode) {
        specs.push({
          label: 'Barkod',
          value: row.barcode,
          labelRu: 'Штрихкод',
          valueRu: row.barcode,
          labelEn: 'Barcode',
          valueEn: row.barcode,
        });
      }
      specs.push({
        label: 'Vəziyyəti',
        value: conditionValue,
        labelRu: 'Состояние',
        valueRu: conditionValue === 'Yeni' ? 'Новый' : 'Б/У',
        labelEn: 'Condition',
        valueEn: conditionValue === 'Yeni' ? 'New' : 'Used',
      });
      specs.push(...translatedFeatures);

      const description = resolveProductDescription(
        productName,
        brand.name,
        row.barcode,
        specs,
      );
      const { seoTitle, seoDescription } = resolveSeo(productName, brand.name);

      const attributes: Record<string, string> = {
        Model: row.model,
        Vəziyyəti: conditionValue,
      };

      const availableByOrder = row.qty === 0;

      // Download/compress the image BEFORE opening the DB transaction — the
      // download is slow and would otherwise exhaust the interactive transaction timeout.
      const media = await downloadImage(row.imageUrl);

      await prisma.$transaction(
        async (tx: TransactionClient) => {
          const existingBySku = await tx.productVariant.findUnique({
            where: { sku },
          });
          if (existingBySku) {
            process.stdout.write(
              `[№ ${row.num}] SKIP ${productName} — variant ${sku} already exists\n`,
            );
            return;
          }
          const existingBySlug = await tx.product.findUnique({
            where: { slug },
          });
          if (existingBySlug) {
            process.stdout.write(
              `[№ ${row.num}] SKIP ${productName} — slug ${slug} already exists\n`,
            );
            return;
          }

          const product = await tx.product.create({
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

          if (media) {
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

          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku,
              barcode: row.barcode,
              name: conditionValue,
              price: row.priceAzn,
              previousPrice: row.previousPriceAzn,
              attributes,
              currency: 'AZN',
              status: CatalogStatus.ACTIVE,
              availableByOrder,
            },
          });

          if (media) {
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
              onHand: { increment: row.qty },
            },
          });

          createdCount++;
          process.stdout.write(
            `[№ ${row.num}] Created ${productName} (SKU: ${sku}, Price: ${row.priceAzn.toString()} AZN, Old: ${row.previousPriceAzn.toString()} AZN, Stock: ${row.qty}, Image: ${media ? 'yes' : 'no'})\n`,
          );
        },
        { timeout: 60_000 },
      );
    }

    console.log(`\nImport completed successfully! Created: ${createdCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  if (process.argv.includes('--dry-run')) {
    readExcel()
      .then((rows) => {
        for (const row of rows) {
          const definition = resolveProductDefinition(row);
          const specs = buildSpecEntriesWithTranslations(
            row.featuresAz,
            row.featuresRu,
            row.featuresEn,
          );
          console.log(
            `${row.num}\t${definition.name}\tSKU=${definition.sku}\tSLUG=${definition.slug}\t${definition.subCategorySlug}\tqty=${row.qty}\tprice=${row.priceAzn.toString()}\told=${row.previousPriceAzn.toString()}\timg=${row.imageUrl ? 'yes' : 'no'}\tspecs=${specs.length}`,
          );
        }
      })
      .catch((err) => {
        console.error('Dry-run failed:', err);
        process.exit(1);
      });
  } else {
    importAemDvrCameraFromExcel().catch((err) => {
      console.error('Fatal import error:', err);
      process.exit(1);
    });
  }
}
