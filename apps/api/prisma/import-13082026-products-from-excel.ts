/**
 * Import products from "Sayt üçün 13082026_260812_1625181.xlsx"
 * Imports TP-Link, Tapo, 2E, WiWU, UGREEN, and 70mai products with
 * images, specifications, SEO metadata, pricing, barcodes, and store stock.
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
  condition: string;
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

  if (!entries.some((e) => normalizeAz(e.label).includes('veziyyeti'))) {
    entries.splice(1, 0, { label: 'Vəziyyəti', value: condition });
  }

  return entries;
}

function resolveProductName(
  num: number,
  brand: string,
  model: string,
  condition: string,
  subCategory: string,
): string {
  switch (num) {
    case 1:
      return 'TP-Link Omada EAP653 UR AX3000 Wi-Fi 6 Tavan Tipli Giriş Nöqtəsi (Access Point)';
    case 2:
      return 'TP-Link LiteWave LS106P 6-Port 10/100M PoE+ Masaüstü Kommutator (Switch)';
    case 3:
      return 'TP-Link LiteWave LS1005 5-Port 10/100M Masaüstü Kommutator (Switch)';
    case 4:
      return 'TP-Link LiteWave LS1008 8-Port 10/100M Masaüstü Kommutator (Switch)';
    case 5:
      return 'TP-Link LiteWave LS105GP 5-Port Gigabit PoE+ Masaüstü Kommutator (Switch)';
    case 6:
      return 'TP-Link Deco X10 (2-Pack) AX1500 Mesh Wi-Fi 6 Sistemi';
    case 7:
      return 'TP-Link Deco M4 (2-Pack) AC1200 Whole Home Mesh Wi-Fi Sistemi';
    case 8:
      return 'TP-Link RE305 AC1200 Wi-Fi Siqnal Gücləndirici (Range Extender)';
    case 9:
      return 'TP-Link Tapo C230 3K 5MP Fırlanan Süni İntellektli Wi-Fi Təhlükəsizlik Kamerası';
    case 10:
      return 'TP-Link Tapo C210 2K 3MP Fırlanan Wi-Fi Təhlükəsizlik Kamerası';
    case 11:
      return 'TP-Link Tapo C310 3MP Xarici Məkan IP66 Wi-Fi Təhlükəsizlik Kamerası';
    case 12:
      return 'TP-Link Tapo C320WS 2K QHD 4MP Rəngli Gecə Görməli Xarici Wi-Fi Kamerası';
    case 13:
      return '2E Gaming MG340 RGB Simli Oyun Siçanı (2E-MG340UB)';
    case 14:
      return '2E Gaming MG345 RGB Transparent Şəffaf Oyun Siçanı (2E-MG345TR)';
    case 15:
      return '2E MF110 Simli Optik Siçan Black (2E-MF110UB)';
    case 16:
      return '2E MF211 Simsiz Optik Siçan Red (2E-MF211WR)';
    case 17:
      return '2E MF300 Silent Dual Mode Simsiz Siçan Pink (2E-MF300WPN)';
    case 18:
      return '2E MF2020 Simsiz Optik Siçan Black-Red (2E-MF2020WB)';
    case 19:
      return '2E MF325 Silent Vertical Şaquli Simsiz Siçan Black (2E-MF325WBK)';
    case 20:
      return 'WiWU Airbuds 3 SE TWS Simsiz Qulaqlıq White';
    case 21:
      return 'UGREEN Nexode Pro 45W Dual USB-C GaN Sürətli Şəbəkə Adapteri (X707 / 35008)';
    case 22:
      return 'UGREEN HiTune H5 TWS Simsiz Bluetooth Qulaqlıq White (WS201 / 15612)';
    case 23:
      return 'UGREEN Nexode Mini 20W GaN USB-C Sürətli Şəbəkə Adapteri (CD318 / 90664)';
    case 24:
      return '70mai Dash Cam 4K A800S Peşəkar Avtomobil Videoqeydiyyatçısı';
    case 25:
      return '2E Gaming KG330 LED Qara Membran Oyun Klaviaturası (2E-KG330UBK)';
    case 26:
      return '2E Gaming KG300 LED Qara Membran Oyun Klaviaturası (2E-KG300UB)';
    case 27:
      return '2E Gaming KG290 TKL Metal LED Oyun Klaviaturası (2E-KG290UB)';
    case 28:
      return '2E Gaming KG360 RGB Simsiz 65% Oyun Klaviaturası (2E-KG360UBK)';
    case 29:
      return '2E KT100 Scissor Touchpad Simsiz Klaviatura (2E-KT100WB_UA)';
    case 30:
      return '2E MK401 Simli Klaviatura və Siçan Dəsti Black (2E-MK401UB_UA)';
    case 31:
      return '2E MK410 Simsiz Klaviatura və Siçan Dəsti Black (2E-MK410MWB)';
    default:
      return `${brand} ${model}`;
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
  const conditionText = condition === 'Yeni'
    ? 'Tam yeni (istifadə olunmamış, orijinal rəsmi qablaşdırmada)'
    : 'İşlənmiş (tam test edilmiş və saz vəziyyətdə)';

  const specsList = specs
    .filter((s) => !['brend', 'model'].includes(normalizeAz(s.label)))
    .map((s) => `• ${s.label}: ${s.value}`)
    .join('\n');

  return `${productName} — ${brand} brendinin ən yüksək standartlara cavab verən, etibarlı və davamlı məhsuludur.

Əsas texniki göstəricilər və xüsusiyyətlər:
• Vəziyyəti: ${conditionText}
${specsList}

IT Market olaraq bütün məhsullara rəsmi keyfiyyət zəmanəti, Bakı daxilində və bölgələrə operativ çatdırılma, eləcə də peşəkar texniki dəstək təqdim edirik.`;
}

function resolveSeo(
  productName: string,
  brand: string,
  model: string,
  subCategory: string,
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
  const excelFileName = dirFiles.find((f) => f.includes('13082026') && f.endsWith('.xlsx'));
  if (!excelFileName) {
    throw new Error('Excel file "Sayt üçün 13082026_260812_1625181.xlsx" not found');
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
    const mainCategory = String(r[1] ?? '').trim();
    const subCategory = String(r[2] ?? '').trim();
    const brand = String(r[3] ?? '').trim();
    const model = String(r[4] ?? '').trim();
    const rawBarcode = r[5] ? String(r[5]).trim() : '';
    // Row 21 barcode fix if missing
    let barcode = rawBarcode || null;
    if (num === 21 && !barcode) {
      barcode = '6941876230082';
    }
    const condition = String(r[6] ?? 'Yeni').trim();
    const qty = Math.max(0, parseInt(String(r[7] ?? '0'), 10) || 0);
    const priceAzn = parseMoney(r[8] ?? 0);
    const features = String(r[9] ?? '').replace(/\r\n/g, '\n').trim();
    const imageUrl = String(r[10] ?? '').trim();

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
      features,
      imageUrl,
    });
  }
  return rows;
}

export async function importProductsFromExcel(): Promise<void> {
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
      { name: '2E', slug: '2e' },
      { name: 'WiWU', slug: 'wiwu' },
      { name: 'UGREEN', slug: 'ugreen' },
      { name: '70mai', slug: '70mai' },
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
      { name: 'Şəbəkə avadanlıqları', slug: 'sebeke-avadanliqlari' },
      { name: 'Təhlükəsizlik avadanlıqları', slug: 'tehlukesizlik-avadanliqlari' },
      { name: 'Gamer zona', slug: 'gamer-zona' },
      { name: 'Kompüter və komponentləri', slug: 'computer' },
      { name: 'TV və audio', slug: 'tv-audio' },
      { name: 'Smartfonlar və aksesuarlar', slug: 'smartfonlar' },
      { name: 'Kamera və foto', slug: 'kamera-foto' },
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

    // Ensure Subcategories
    const subCategories = [
      { name: 'Access Point', slug: 'access-point', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Kommutator', slug: 'kommutator', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Router', slug: 'router', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Wi-Fi gücləndirici', slug: 'wi-fi-guclendirici', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'IP kamera', slug: 'ip-kamera', parentSlug: 'tehlukesizlik-avadanliqlari' },
      { name: 'Wi-Fi kameralar', slug: 'wi-fi-kameralar', parentSlug: 'tehlukesizlik-avadanliqlari' },
      { name: 'Gaming siçan', slug: 'gaming-sican', parentSlug: 'gamer-zona' },
      { name: 'Gaming klaviatura', slug: 'gaming-klaviatura', parentSlug: 'gamer-zona' },
      { name: 'Siçan', slug: 'sican', parentSlug: 'computer' },
      { name: 'Klaviatura', slug: 'klaviatura', parentSlug: 'computer' },
      { name: 'Klaviatura və siçan dəsti', slug: 'klaviatura-ve-sican-desti', parentSlug: 'computer' },
      { name: 'Qulaqlıq', slug: 'qulaqliq', parentSlug: 'tv-audio' },
      { name: 'Şarj cihazı', slug: 'sarj-cihazi', parentSlug: 'smartfonlar' },
      { name: 'Videoqeydiyyatçı', slug: 'videoqeydiyyatci', parentSlug: 'kamera-foto' },
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
      // Resolve Brand
      const normBrand = normalizeAz(row.brand);
      let brandSlug = 'tp-link';
      if (normBrand.includes('tapo')) brandSlug = 'tapo';
      else if (normBrand.includes('2e')) brandSlug = '2e';
      else if (normBrand.includes('wiwu')) brandSlug = 'wiwu';
      else if (normBrand.includes('ugreen')) brandSlug = 'ugreen';
      else if (normBrand.includes('70mai')) brandSlug = '70mai';
      else if (normBrand.includes('tp-link') || normBrand.includes('tplink')) brandSlug = 'tp-link';

      const brand = brandMap.get(brandSlug);
      if (!brand) throw new Error(`Brand not found for ${row.brand} (${brandSlug})`);

      // Resolve Subcategory Slug
      let targetSubCatSlug = 'access-point';
      const normSub = normalizeAz(row.subCategory);
      const normMain = normalizeAz(row.mainCategory);

      if (normSub.includes('access point')) {
        targetSubCatSlug = 'access-point';
      } else if (normSub.includes('kommutator') || normSub.includes('switch')) {
        targetSubCatSlug = 'kommutator';
      } else if (normSub.includes('router')) {
        targetSubCatSlug = 'router';
      } else if (normSub.includes('guclendirici') || normSub.includes('extender')) {
        targetSubCatSlug = 'wi-fi-guclendirici';
      } else if (normSub.includes('ip kamera') || normSub.includes('kamera') && normMain.includes('tehlukesizlik')) {
        targetSubCatSlug = 'ip-kamera';
      } else if (normSub.includes('gaming sican') || (normSub.includes('sican') && normMain.includes('gamer'))) {
        targetSubCatSlug = 'gaming-sican';
      } else if (normSub.includes('gaming klaviatura') || (normSub.includes('klaviatura') && normMain.includes('gamer'))) {
        targetSubCatSlug = 'gaming-klaviatura';
      } else if (normSub.includes('dest') || (normSub.includes('klaviatura') && normSub.includes('sican'))) {
        targetSubCatSlug = 'klaviatura-ve-sican-desti';
      } else if (normSub.includes('klaviatura')) {
        targetSubCatSlug = 'klaviatura';
      } else if (normSub.includes('sican')) {
        targetSubCatSlug = 'sican';
      } else if (normSub.includes('qulaqliq')) {
        targetSubCatSlug = 'qulaqliq';
      } else if (normSub.includes('sarj')) {
        targetSubCatSlug = 'sarj-cihazi';
      } else if (normSub.includes('videoqeydiyyatci') || normSub.includes('dash cam')) {
        targetSubCatSlug = 'videoqeydiyyatci';
      }

      const category = subCatMap.get(targetSubCatSlug);
      if (!category) {
        throw new Error(`Category not resolved for ${row.mainCategory} > ${row.subCategory} (${targetSubCatSlug})`);
      }

      const productName = resolveProductName(row.num, brand.name, row.model, row.condition, row.subCategory);

      // Unique SKU Generation
      let cleanModelUpper = row.model.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      let sku = '';
      switch (row.num) {
        case 1: sku = 'TPL-EAP653-UR'; break;
        case 2: sku = 'TPL-LS106P'; break;
        case 3: sku = 'TPL-LS1005'; break;
        case 4: sku = 'TPL-LS1008'; break;
        case 5: sku = 'TPL-LS105GP'; break;
        case 6: sku = 'TPL-DECO-X10-2PK'; break;
        case 7: sku = 'TPL-DECO-M4-2PK'; break;
        case 8: sku = 'TPL-RE305'; break;
        case 9: sku = 'TAPO-C230'; break;
        case 10: sku = 'TAPO-C210'; break;
        case 11: sku = 'TAPO-C310'; break;
        case 12: sku = 'TAPO-C320WS'; break;
        case 13: sku = '2E-MG340UB'; break;
        case 14: sku = '2E-MG345TR'; break;
        case 15: sku = '2E-MF110UB'; break;
        case 16: sku = '2E-MF211WR'; break;
        case 17: sku = '2E-MF300WPN'; break;
        case 18: sku = '2E-MF2020WB'; break;
        case 19: sku = '2E-MF325WBK'; break;
        case 20: sku = 'WIWU-AIRBUDS-3-SE'; break;
        case 21: sku = 'UGR-X707-35008'; break;
        case 22: sku = 'UGR-HITUNE-H5-WS201'; break;
        case 23: sku = 'UGR-CD318-90664'; break;
        case 24: sku = '70MAI-A800S'; break;
        case 25: sku = '2E-KG330UBK'; break;
        case 26: sku = '2E-KG300UB'; break;
        case 27: sku = '2E-KG290UB'; break;
        case 28: sku = '2E-KG360UBK'; break;
        case 29: sku = '2E-KT100WB-UA'; break;
        case 30: sku = '2E-MK401UB-UA'; break;
        case 31: sku = '2E-MK410MWB'; break;
        default: sku = `${brand.slug.toUpperCase().slice(0, 3)}-${cleanModelUpper}`; break;
      }

      const slug = slugify(`${brand.slug}-${row.model}`);
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
              barcode: row.barcode,
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
              barcode: row.barcode,
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

      console.log(`[№ ${row.num}] Processed ${productName} (SKU: ${sku}, Barcode: ${row.barcode || 'N/A'}, Price: ${row.priceAzn} AZN, Stock: ${row.qty})`);
    }

    console.log(`\nImport completed successfully! Created: ${createdCount}, Updated: ${updatedCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  importProductsFromExcel().catch((err) => {
    console.error('Fatal import error:', err);
    process.exit(1);
  });
}
