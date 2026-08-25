/**
 * Import Konnektronik products from "Sayt üçün 13082026_260812_162518 -Konnektronik.xlsx".
 *
 * Column layout of the "Məhsullar" sheet (0-indexed after two title rows + header):
 *   0 № | 1 Model | 2 Barkod | 3 Qty | 4 Qiymət (endirimli) | 5 Köhnə qiymət
 *   6 Əsas kateqoriya | 7 Alt kateqoriya | 8 Brend | 9 Xüsusiyyətlər (AZ)
 *   10 Xüsusiyyətlər (RU) | 11 Xüsusiyyətlər (EN) | 12 Şəkil linkləri
 *
 * Imports TP-Link, Tapo and Mercusys products with images, specifications,
 * SEO metadata, pricing (current + previous), barcodes and store stock.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
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
  qty: number;
  priceAzn: Prisma.Decimal;
  previousPriceAzn: Prisma.Decimal;
  featuresAz: string;
  featuresRu: string;
  featuresEn: string;
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

function parseSpecs(
  features: string,
): Array<{ label: string; value: string }> {
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

type SpecEntry = {
  label: string;
  value: string;
  labelRu?: string;
  valueRu?: string;
  labelEn?: string;
  valueEn?: string;
};

/**
 * AZ/RU/EN feature sətirləri bir-birinə uyğun olduğundan (Excel-də hər dil
 * üçün ayrı sütun), hər AZ xüsusiyyətinə rus və ingilis tərcüməsini birləşdirir.
 */
function buildSpecEntriesWithTranslations(
  featuresAz: string,
  featuresRu: string,
  featuresEn: string,
): SpecEntry[] {
  const az = parseSpecs(featuresAz);
  const ru = parseSpecs(featuresRu);
  const en = parseSpecs(featuresEn);

  return az.map((entry, index) => {
    const ruEntry = ru[index];
    const enEntry = en[index];
    return {
      label: entry.label,
      value: entry.value,
      ...(ruEntry ? { labelRu: ruEntry.label, valueRu: ruEntry.value } : {}),
      ...(enEntry ? { labelEn: enEntry.label, valueEn: enEntry.value } : {}),
    };
  });
}

const PRODUCT_DEFINITIONS: Record<
  number,
  { name: string; sku: string; slug: string; brandSlug: string; subCategorySlug: string }
> = {
  2: {
    name: 'TP-Link VIGI C320I 2MP Xarici Bullet IP Kamera',
    sku: 'TPL-VIGI-C320I',
    slug: 'tp-link-vigi-c320i',
    brandSlug: 'tp-link',
    subCategorySlug: 'ip-kamera',
  },
  3: {
    name: 'TP-Link VIGI C220I 2MP Dome IP Kamera',
    sku: 'TPL-VIGI-C220I',
    slug: 'tp-link-vigi-c220i',
    brandSlug: 'tp-link',
    subCategorySlug: 'ip-kamera',
  },
  4: {
    name: 'TP-Link VIGI C230 3MP Tam Rəngli Dome IP Kamera',
    sku: 'TPL-VIGI-C230',
    slug: 'tp-link-vigi-c230',
    brandSlug: 'tp-link',
    subCategorySlug: 'ip-kamera',
  },
  5: {
    name: 'TP-Link VIGI C540 4MP Xarici PTZ Tam Rəngli IP Kamera',
    sku: 'TPL-VIGI-C540',
    slug: 'tp-link-vigi-c540',
    brandSlug: 'tp-link',
    subCategorySlug: 'ip-kamera',
  },
  7: {
    name: 'TP-Link Tapo C410 KIT EU 2K Simsiz Batareyalı Kamera Dəsti (Günəş Panel ilə)',
    sku: 'TAPO-C410-KIT',
    slug: 'tapo-c410-kit-eu',
    brandSlug: 'tapo',
    subCategorySlug: 'wi-fi-kameralar',
  },
  8: {
    name: 'TP-Link Tapo C501GW 1080p Xarici PTZ 4G LTE Kamera',
    sku: 'TAPO-C501GW',
    slug: 'tapo-c501gw',
    brandSlug: 'tapo',
    subCategorySlug: 'wi-fi-kameralar',
  },
  10: {
    name: 'Mercusys MR60X AX1500 Wi-Fi 6 Router',
    sku: 'MER-MR60X-AX1500',
    slug: 'mercusys-mr60x-ax1500',
    brandSlug: 'mercusys',
    subCategorySlug: 'router',
  },
  11: {
    name: 'Mercusys AC12 AC1200 İki Zolaqlı Wi-Fi Router',
    sku: 'MER-AC12-AC1200',
    slug: 'mercusys-ac12-ac1200',
    brandSlug: 'mercusys',
    subCategorySlug: 'router',
  },
  12: {
    name: 'Mercusys MR30G AC1200 Gigabit Wi-Fi Router',
    sku: 'MER-MR30G',
    slug: 'mercusys-mr30g',
    brandSlug: 'mercusys',
    subCategorySlug: 'router',
  },
  13: {
    name: 'Mercusys ME30 AC1200 Wi-Fi Siqnal Gücləndirici (Range Extender)',
    sku: 'MER-ME30',
    slug: 'mercusys-me30',
    brandSlug: 'mercusys',
    subCategorySlug: 'wi-fi-guclendirici',
  },
  14: {
    name: 'TP-Link TL-SG1008P 8-Port Gigabit PoE+ Kommutator (Switch)',
    sku: 'TPL-SG1008P',
    slug: 'tp-link-tl-sg1008p',
    brandSlug: 'tp-link',
    subCategorySlug: 'kommutator',
  },
  15: {
    name: 'TP-Link CPE510 5GHz Xarici CPE Access Point',
    sku: 'TPL-CPE510',
    slug: 'tp-link-cpe510',
    brandSlug: 'tp-link',
    subCategorySlug: 'access-point',
  },
  17: {
    name: 'TP-Link VIGI NVR1004H-4P 4 Kanallı PoE+ Şəbəkə Videoqeydiyyatçısı (NVR)',
    sku: 'TPL-NVR1004H-4P',
    slug: 'tp-link-vigi-nvr1004h-4p',
    brandSlug: 'tp-link',
    subCategorySlug: 'nvr',
  },
  18: {
    name: 'TP-Link LiteWave LS1210GP 9-Port Gigabit PoE+ Kommutator (Switch)',
    sku: 'TPL-LS1210GP',
    slug: 'tp-link-ls1210gp',
    brandSlug: 'tp-link',
    subCategorySlug: 'kommutator',
  },
  19: {
    name: 'TP-Link Omada EAP723 BE3600 Wi-Fi 7 Tavan Tipli Access Point',
    sku: 'TPL-EAP723',
    slug: 'tp-link-eap723',
    brandSlug: 'tp-link',
    subCategorySlug: 'access-point',
  },
  20: {
    name: 'TP-Link TL-SL1311P 8-Port PoE+ Kommutator (Switch)',
    sku: 'TPL-SL1311P',
    slug: 'tp-link-tl-sl1311p',
    brandSlug: 'tp-link',
    subCategorySlug: 'kommutator',
  },
  21: {
    name: 'TP-Link VIGI NVR1008H-8MP 8 Kanallı PoE+ Şəbəkə Videoqeydiyyatçısı (NVR)',
    sku: 'TPL-NVR1008H-8MP',
    slug: 'tp-link-vigi-nvr1008h-8mp',
    brandSlug: 'tp-link',
    subCategorySlug: 'nvr',
  },
};

function resolveProductName(num: number, brand: string, model: string): string {
  const definition = PRODUCT_DEFINITIONS[num];
  return definition ? definition.name : `${brand} ${model}`;
}

function resolveProductDescription(
  productName: string,
  barcode: string | null,
  specs: Array<{ label: string; value: string }>,
): string {
  const specsList = specs
    .filter((s) => !['brend', 'model', 'barkod', 'veziyyeti'].includes(normalizeAz(s.label)))
    .map((s) => `• ${s.label}: ${s.value}`)
    .join('\n');

  return `${productName} — ən yüksək standartlara cavab verən, etibarlı və davamlı məhsuldur.

Əsas texniki göstəricilər və xüsusiyyətlər:
• Vəziyyəti: Tam yeni (istifadə olunmamış, orijinal rəsmi qablaşdırmada)
${barcode ? `• Barkod: ${barcode}\n` : ''}${specsList}

IT Market olaraq bütün məhsullara rəsmi keyfiyyət zəmanəti, Bakı daxilində və bölgələrə operativ çatdırılma, eləcə də peşəkar texniki dəstək təqdim edirik.`;
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

function extensionForMime(mime: 'image/jpeg' | 'image/png' | 'image/webp'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function compressCatalogImage(body: Buffer): Promise<{
  body: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
} | null> {
  const inputPath = path.join(tmpdir(), `cat-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `cat-out-${randomUUID()}.jpg`);
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
    process.stderr.write(`Error downloading image ${imageUrl}: ${String(err)}\n`);
    return null;
  }
}

async function readExcel(): Promise<ExcelRow[]> {
  const dirFiles = await readdir(WORKSPACE_ROOT);
  const excelFileName = dirFiles.find(
    (f) => f.includes('Konnektronik') && f.endsWith('.xlsx'),
  );
  if (!excelFileName) {
    throw new Error('Excel file "Sayt üçün ... -Konnektronik.xlsx" not found');
  }
  const excelPath = path.join(WORKSPACE_ROOT, excelFileName);
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
    const qty = Math.max(0, parseInt(String(r[3] ?? '0'), 10) || 0);
    const priceAzn = parseMoney(r[4] ?? 0);
    const previousPriceAzn = parseMoney(r[5] ?? 0);
    const mainCategory = String(r[6] ?? '').trim();
    const subCategory = String(r[7] ?? '').trim();
    const brand = String(r[8] ?? '').trim();
    const featuresAz = String(r[9] ?? '').replace(/\r\n/g, '\n').trim();
    const featuresRu = String(r[10] ?? '').replace(/\r\n/g, '\n').trim();
    const featuresEn = String(r[11] ?? '').replace(/\r\n/g, '\n').trim();
    const imageUrl = String(r[12] ?? '').trim();

    rows.push({
      num,
      mainCategory,
      subCategory,
      brand,
      model,
      barcode,
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

export async function importKonnektronikFromExcel(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await readExcel();
  console.log(`Found ${rows.length} products to import.`);

  try {
    // 1. Ensure Brands
    const brandDefinitions = [
      { name: 'TP-Link', slug: 'tp-link' },
      { name: 'Tapo', slug: 'tapo' },
      { name: 'Mercusys', slug: 'mercusys' },
    ];

    const brandMap = new Map<string, { id: string; name: string; slug: string }>();

    for (const b of brandDefinitions) {
      let brandRecord = await prisma.brand.findUnique({
        where: { slug: b.slug },
      });

      if (!brandRecord) {
        const byName = await prisma.brand.findFirst({
          where: { name: { equals: b.name, mode: 'insensitive' } },
        });

        if (byName) {
          brandRecord = await prisma.brand.update({
            where: { id: byName.id },
            data: {
              name: b.name,
              slug: b.slug,
              status: CatalogStatus.ACTIVE,
            },
          });
        } else {
          brandRecord = await prisma.brand.create({
            data: {
              name: b.name,
              slug: b.slug,
              status: CatalogStatus.ACTIVE,
            },
          });
        }
      } else {
        brandRecord = await prisma.brand.update({
          where: { id: brandRecord.id },
          data: {
            name: b.name,
            status: CatalogStatus.ACTIVE,
          },
        });
      }
      brandMap.set(b.slug, brandRecord);
    }

    // 2. Ensure Root Categories
    const rootCategories = [
      { name: 'Təhlükəsizlik avadanlıqları', slug: 'tehlukesizlik-avadanliqlari' },
      { name: 'Şəbəkə avadanlıqları', slug: 'sebeke-avadanliqlari' },
    ];

    const rootCatMap = new Map<string, string>();
    for (const rc of rootCategories) {
      const cat = await prisma.category.upsert({
        where: { slug: rc.slug },
        create: {
          name: rc.name,
          slug: rc.slug,
          parentId: null,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: rc.name,
          status: CatalogStatus.ACTIVE,
        },
      });
      rootCatMap.set(rc.slug, cat.id);
    }

    // Ensure Subcategories (already present in the live catalog)
    const subCategories = [
      { name: 'IP kamera', slug: 'ip-kamera', parentSlug: 'tehlukesizlik-avadanliqlari' },
      { name: 'Wi-Fi kameralar', slug: 'wi-fi-kameralar', parentSlug: 'tehlukesizlik-avadanliqlari' },
      { name: 'NVR', slug: 'nvr', parentSlug: 'tehlukesizlik-avadanliqlari' },
      { name: 'Router', slug: 'router', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Kommutator', slug: 'kommutator', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Access Point', slug: 'access-point', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Wi-Fi gücləndirici', slug: 'wi-fi-guclendirici', parentSlug: 'sebeke-avadanliqlari' },
    ];

    const subCatMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const sc of subCategories) {
      const parentId = rootCatMap.get(sc.parentSlug);
      if (!parentId) throw new Error(`Parent category ${sc.parentSlug} not found`);

      const cat = await prisma.category.upsert({
        where: { slug: sc.slug },
        create: {
          name: sc.name,
          slug: sc.slug,
          parentId,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: sc.name,
          parentId,
          status: CatalogStatus.ACTIVE,
        },
      });
      subCatMap.set(sc.slug, cat);
    }

    // 3. Ensure Store Location (ST-28MAY)
    const storeLocation = await prisma.location.findUnique({ where: { code: 'ST-28MAY' } });
    if (!storeLocation) {
      throw new Error('Store location ST-28MAY not found');
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const definition = PRODUCT_DEFINITIONS[row.num];
      if (!definition) {
        process.stderr.write(`[№ ${row.num}] Skipping unknown product ${row.model}\n`);
        continue;
      }

      const brand = brandMap.get(definition.brandSlug);
      if (!brand) throw new Error(`Brand not found for ${definition.brandSlug}`);

      const category = subCatMap.get(definition.subCategorySlug);
      if (!category) {
        throw new Error(`Category not resolved for ${row.mainCategory} > ${row.subCategory}`);
      }

      const productName = resolveProductName(row.num, brand.name, row.model);
      const sku = definition.sku;
      const slug = definition.slug;

      const translatedFeatures = buildSpecEntriesWithTranslations(
        row.featuresAz,
        row.featuresRu,
        row.featuresEn,
      );

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
        value: 'Yeni',
        labelRu: 'Состояние',
        valueRu: 'Новый',
        labelEn: 'Condition',
        valueEn: 'New',
      });
      specs.push(...translatedFeatures);

      const description = resolveProductDescription(productName, row.barcode, specs);
      const { seoTitle, seoDescription } = resolveSeo(productName, brand.name);

      const availableByOrder = row.qty === 0;

      // Upsert Product & Variant in Transaction
      await prisma.$transaction(async (tx) => {
        let product = await tx.product.findUnique({
          where: { slug },
        });

        // Reuse an existing image so re-runs don't create orphan files.
        const existingMedia = product
          ? await tx.productMedia.findFirst({
              where: { productId: product.id },
              orderBy: { sortOrder: 'asc' },
            })
          : null;

        let media = existingMedia
          ? {
              objectKey: existingMedia.objectKey,
              mimeType: existingMedia.mimeType,
              byteSize: existingMedia.byteSize,
            }
          : await downloadImage(row.imageUrl);

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
              name: 'Standart',
              barcode: row.barcode,
              price: row.priceAzn,
              previousPrice: row.previousPriceAzn,
              attributes: {},
              status: CatalogStatus.ACTIVE,
              availableByOrder,
            },
          });
        } else {
          variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku,
              barcode: row.barcode,
              name: 'Standart',
              price: row.priceAzn,
              previousPrice: row.previousPriceAzn,
              attributes: {},
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

      console.log(
        `[№ ${row.num}] Processed ${productName} (SKU: ${sku}, Barcode: ${row.barcode || 'N/A'}, Price: ${row.priceAzn} AZN, Old price: ${row.previousPriceAzn} AZN, Stock: ${row.qty})`,
      );
    }

    console.log(`\nImport completed successfully! Created: ${createdCount}, Updated: ${updatedCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  importKonnektronikFromExcel().catch((err) => {
    console.error('Fatal import error:', err);
    process.exit(1);
  });
}
