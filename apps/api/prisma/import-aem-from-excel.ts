/**
 * Import AEM products from "Sayt üçün 26082026_260812_162518 -AEM.xlsx".
 *
 * Column layout of the "Məhsullar" sheet (0-indexed after two title rows + header):
 *   0 № | 1 Model | 2 Barkod | 3 Vəziyyəti | 4 Qty | 5 Qiymət (endirimli)
 *   6 Köhnə qiymət | 7 Əsas kateqoriya | 8 Alt kateqoriya | 9 Brend
 *   10 Xüsusiyyətlər (AZ) | 11 Xüsusiyyətlər (RU) | 12 Xüsusiyyətlər (EN) | 13 Şəkil linkləri
 *
 * Imports 28 products (F9 earbuds, Haylou smart watch, 2E speaker, DYMO label
 * maker, Ruijie networking) with images and AZ/RU/EN translated specs stored in
 * requiredSpecs so the storefront shows the correct translation on locale switch.
 *
 * New catalog entities created: brand "F9" and "Haylou"; subcategories
 * "Ağıllı saat" (under Smartfonlar və aksesuarlar) and
 * "Etiket printeri" (under Printerlər) — both marked "YENİ — yaradılmalıdır"
 * in the workbook "Kateqoriyalar" sheet.
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
export function buildSpecEntriesWithTranslations(
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

function stripBrandPrefix(model: string, brand: string): string {
  let cleaned = String(model).trim();
  const upper = cleaned.toUpperCase();
  const brandUpper = brand.toUpperCase();
  if (upper.startsWith(`${brandUpper} `)) {
    cleaned = cleaned.slice(brand.length).trim();
  } else if (upper.startsWith(`${brandUpper}-`)) {
    cleaned = cleaned.slice(brand.length).trimStart().replace(/^-/, '').trim();
  }
  return cleaned;
}

/**
 * Product marketing name. Four non-Ruijie products get explicit names matching
 * the site's catalog conventions; Ruijie names are `Ruijie <model> <type>`.
 */
function resolveProductName(brand: string, row: ExcelRow): string {
  const explicit: Record<string, string> = {
    '6971665580145': 'F9 Wireless Earbuds TWS V5.3',
    '6971664933871': 'Haylou GST Lite Smart Watch (LS13) Yaşıl',
    '680576169587': '2E SoundXTube TWS qara portativ kolonka',
    '071701063311': 'DYMO LetraTag 100H Etiket printeri',
  };
  const byBarcode = row.barcode ? explicit[row.barcode] : undefined;
  if (byBarcode) {
    return byBarcode;
  }

  const clean = stripBrandPrefix(row.model, brand);
  const fragmentBySubCategory: Record<string, string> = {
    Router: 'Router',
    Kommutator: 'Kommutator',
    'Access Point': 'Access Point',
    'Wi-Fi gücləndirici': 'Wi-Fi gücləndirici',
  };
  const fragment = fragmentBySubCategory[row.subCategory] ?? '';
  return `${brand} ${clean}${fragment ? ` ${fragment}` : ''}`.trim();
}

function resolveSku(brand: string, row: ExcelRow): string {
  const clean = stripBrandPrefix(row.model, brand);
  const part = clean
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${brand.toUpperCase()}-${part}`;
}

function resolveSubCategorySlug(subCategory: string): string {
  const norm = normalizeAz(subCategory);
  if (norm.includes('agilli saat')) return 'agilli-saat';
  if (norm.includes('etiket printeri')) return 'etiket-printeri';
  if (norm.includes('router')) return 'router';
  if (norm.includes('kommutator')) return 'kommutator';
  if (norm.includes('access point')) return 'access-point';
  if (norm.includes('wi-fi guclendirici')) return 'wi-fi-guclendirici';
  if (norm.includes('qulaqliq')) return 'qulaqliq';
  if (norm.includes('portativ kolonka')) return 'portativ-kolonka';
  return slugify(subCategory);
}

function resolveMainCategorySlug(mainCategory: string): string {
  const norm = normalizeAz(mainCategory);
  if (norm.includes('sebeke avadanliqlari')) return 'sebeke-avadanliqlari';
  if (norm.includes('tv ve audio')) return 'tv-audio';
  if (norm.includes('smartfonlar')) return 'smartfonlar';
  if (norm.includes('printerler')) return 'printerler';
  return slugify(mainCategory);
}

type ProductDefinition = {
  name: string;
  sku: string;
  slug: string;
  mainCategorySlug: string;
  subCategorySlug: string;
};

function resolveProductDefinition(row: ExcelRow): ProductDefinition {
  const name = resolveProductName(row.brand, row);
  const slug = slugify(name);
  const sku = resolveSku(row.brand, row);
  return {
    name,
    sku,
    slug,
    mainCategorySlug: resolveMainCategorySlug(row.mainCategory),
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
      f.includes('AEM') &&
      !f.includes('DVR-CAMERA') &&
      f.includes('26082026') &&
      f.endsWith('.xlsx'),
  );
  if (candidates.length === 0) {
    throw new Error('Excel file "Sayt üçün 26082026... -AEM.xlsx" not found');
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

export async function readExcel(): Promise<ExcelRow[]> {
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

export async function importAemFromExcel(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await readExcel();
  console.log(
    `Found ${rows.length} products to import from "Sayt üçün 26082026... -AEM.xlsx".`,
  );

  try {
    // 1. Ensure Brands (F9 and Haylou are new; the others exist)
    const brandDefs = [
      { name: 'F9', slug: 'f9' },
      { name: 'Haylou', slug: 'haylou' },
      { name: '2E', slug: '2e' },
      { name: 'DYMO', slug: 'dymo' },
      { name: 'Ruijie', slug: 'ruijie' },
    ];
    const brandMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const def of brandDefs) {
      const brand = await prisma.brand.upsert({
        where: { slug: def.slug },
        create: {
          name: def.name,
          slug: def.slug,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: def.name,
          status: CatalogStatus.ACTIVE,
        },
      });
      brandMap.set(def.slug, brand);
      console.log(`Brand ready: ${brand.name} (${brand.slug})`);
    }

    // 2. Ensure Root Categories
    const rootDefs = [
      { name: 'Şəbəkə avadanlıqları', slug: 'sebeke-avadanliqlari' },
      { name: 'TV və audio', slug: 'tv-audio' },
      { name: 'Smartfonlar və aksesuarlar', slug: 'smartfonlar' },
      { name: 'Printerlər', slug: 'printerler' },
    ];
    const rootMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const def of rootDefs) {
      const category = await prisma.category.upsert({
        where: { slug: def.slug },
        create: {
          name: def.name,
          slug: def.slug,
          parentId: null,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: def.name,
          status: CatalogStatus.ACTIVE,
        },
      });
      rootMap.set(def.slug, category);
      console.log(`Category ready: ${category.name} (${category.slug})`);
    }

    // 3. Ensure Subcategories (Ağıllı saat and Etiket printeri are new)
    const subCategoryDefs: Array<{
      name: string;
      slug: string;
      parentSlug: string;
    }> = [
      { name: 'Router', slug: 'router', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Kommutator', slug: 'kommutator', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Access Point', slug: 'access-point', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Wi-Fi gücləndirici', slug: 'wi-fi-guclendirici', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Qulaqlıq', slug: 'qulaqliq', parentSlug: 'tv-audio' },
      { name: 'Portativ kolonka', slug: 'portativ-kolonka', parentSlug: 'tv-audio' },
      { name: 'Ağıllı saat', slug: 'agilli-saat', parentSlug: 'smartfonlar' },
      { name: 'Etiket printeri', slug: 'etiket-printeri', parentSlug: 'printerler' },
    ];
    const subCatMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    for (const sc of subCategoryDefs) {
      const parent = rootMap.get(sc.parentSlug);
      if (!parent) {
        throw new Error(`Parent category not found: ${sc.parentSlug}`);
      }
      const category = await prisma.category.upsert({
        where: { slug: sc.slug },
        create: {
          name: sc.name,
          slug: sc.slug,
          parentId: parent.id,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: sc.name,
          parentId: parent.id,
          status: CatalogStatus.ACTIVE,
        },
      });
      subCatMap.set(sc.slug, category);
      console.log(`Category ready: ${category.name} (${category.slug})`);
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

      const brand = brandMap.get(slugify(row.brand));
      if (!brand) {
        throw new Error(`Brand not resolved: ${row.brand}`);
      }
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
    importAemFromExcel().catch((err) => {
      console.error('Fatal import error:', err);
      process.exit(1);
    });
  }
}
