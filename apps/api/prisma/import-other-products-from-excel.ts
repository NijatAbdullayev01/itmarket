/**
 * One-shot import: Digər Məhsullar from Sayt üçün Diger Mehsullar.xlsx
 * Imports Cisco cables, OEM/Samsung/SK hynix/Kingston RAMs, DYMO tapes, Mobicom SFP modules,
 * Philips/Dell/AOC/HP monitors, Ruijie Reyee switches and access points with images, specs, SEO, pricing and store stock.
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

loadEnvironment({ path: '../../.env', quiet: true });

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

const FALLBACK_IMAGE_URLS: Record<number, string> = {
  4: 'https://m.media-amazon.com/images/I/617a0U-ojjL._AC_UF894,1000_QL80_.jpg', // Server RAM RDIMM
  5: 'https://m.media-amazon.com/images/I/617a0U-ojjL._AC_UF894,1000_QL80_.jpg', // Server RAM RDIMM
  6: 'https://m.media-amazon.com/images/I/617a0U-ojjL._AC_UF894,1000_QL80_.jpg', // Samsung Server RAM RDIMM
  7: 'https://m.media-amazon.com/images/I/717h7rYAczL.jpg',                      // Desktop RAM UDIMM
  9: 'https://m.media-amazon.com/images/I/617a0U-ojjL._AC_UF894,1000_QL80_.jpg', // VLP Server RAM RDIMM
  12: 'https://m.media-amazon.com/images/I/717h7rYAczL.jpg',                     // Desktop RAM UDIMM
  13: 'https://m.media-amazon.com/images/I/717h7rYAczL.jpg',                     // Desktop RAM UDIMM
  15: 'https://m.media-amazon.com/images/I/61R61RLXD-L.jpg',                     // Desktop RAM UDIMM
  19: 'https://m.media-amazon.com/images/I/51shDRjbyEL._AC_UF894,1000_QL80_.jpg', // SK Hynix Server RAM RDIMM
  20: 'https://m.media-amazon.com/images/I/61UxfXTUyvL._AC_SL1500_.jpg',         // Wireless Optical Mouse
};

type ExcelRow = {
  num: number;
  mainCategory: string;
  subCategory: string;
  brand: string;
  model: string;
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

  // Ensure Vəziyyəti spec exists
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
  const isUsed = isUsedCondition(condition);
  const usedSuffix = isUsed ? ' (işlənmiş)' : '';

  switch (num) {
    case 1:
      return 'Cisco CAB-CONSOLE-RJ45 RJ45 to RS232 DB9 Konsol Kabeli';
    case 2:
      return 'Cisco USB-A to RJ45 FTDI Konsol Kabeli (CAB-CONSOLE-USB-A-RJ45)';
    case 3:
      return 'Cisco CAB-CONSOLE-USB-MICRO USB-A to Micro-USB Konsol Kabeli';
    case 4:
      return `OEM 8GB DDR3 1600MHz PC3-12800R ECC Registered Server RAM${usedSuffix}`;
    case 5:
      return `OEM 4GB DDR3L 1333MHz PC3L-10600R ECC Registered Server RAM${usedSuffix}`;
    case 6:
      return `Samsung 16GB DDR3 1866MHz PC3-14900R ECC RDIMM Server RAM (M393B2G70QH0-CMA)${usedSuffix}`;
    case 7:
      return `OEM 4GB DDR3 1600MHz PC3-12800U Masaüstü Kompüter RAM${usedSuffix}`;
    case 8:
      return `Samsung 2GB DDR3 1600MHz PC3-12800U Masaüstü Kompüter RAM (M378B5773DH0-CK0)${usedSuffix}`;
    case 9:
      return `OEM 4GB DDR3 1333MHz VLP ECC Registered RDIMM Server RAM${usedSuffix}`;
    case 10:
      return `Samsung 2GB DDR3 1333MHz PC3-10600U Masaüstü Kompüter RAM (M378B5673FH0-CH9)${usedSuffix}`;
    case 11:
      return `Kingston ValueRAM 1GB DDR3 1333MHz PC3-10600U Masaüstü RAM (KVR1333D3N9/1G)${usedSuffix}`;
    case 12:
      return `OEM 4GB DDR3 1333MHz PC3-10600 UDIMM Masaüstü Kompüter RAM${usedSuffix}`;
    case 13:
      return `OEM 2GB DDR3 1600MHz PC3-12800U UDIMM Masaüstü Kompüter RAM${usedSuffix}`;
    case 14:
      return `Samsung 4GB DDR3 1600MHz PC3-12800U Masaüstü Kompüter RAM (M378B5173EB0-CK0)${usedSuffix}`;
    case 15:
      return `OEM 4GB DDR3 1333MHz PC3-10600U Dual Rank Masaüstü RAM${usedSuffix}`;
    case 16:
      return `Kingston 4GB DDR3 1600MHz PC3-12800E ECC Unbuffered Server RAM (KVR16E11/4)${usedSuffix}`;
    case 17:
      return `SK hynix 8GB DDR4 2133MHz PC4-2133P ECC RDIMM Server RAM (HMA41GR7MFR4N-TF)${usedSuffix}`;
    case 18:
      return `Samsung 16GB DDR4 2133MHz PC4-2133P ECC RDIMM Server RAM (M393A2G40DB0-CPB)${usedSuffix}`;
    case 19:
      return `SK hynix 16GB DDR3L 1600MHz PC3L-12800R ECC RDIMM Server RAM (HMT42GR7BFR4A-PB)${usedSuffix}`;
    case 20:
      return 'OEM WYL4911B Simsiz Optik Siçan (Wireless Mouse)';
    case 21:
      return 'DYMO LetraTag 91205 (S0721650) Göy Plastik Etiket Lenti 12mm x 4m';
    case 22:
      return 'DYMO LetraTag 91203 (S0721630) Qırmızı Plastik Etiket Lenti 12mm x 4m';
    case 23:
      return 'DYMO LetraTag 91204 (S0721640) Sarı Plastik Etiket Lenti 12mm x 4m';
    case 24:
      return 'DYMO D1 45013 (S0720530) Standart Etiket Lenti 12mm x 7m (Qara/Ağ)';
    case 25:
      return 'DYMO LetraTag 91201 (S0721610) Ağ Plastik Etiket Lenti 12mm x 4m';
    case 26:
      return 'Mobicom DTSB5312L-CD20 1.25G BiDi WDM SFP Modul (TX1550/RX1310nm 20km LC)';
    case 27:
      return 'Mobicom DTSB3512L-CD20 1.25G BiDi WDM SFP Modul (TX1310/RX1550nm 20km LC)';
    case 28:
      return 'Mobicom DTSPB321XL-CD20 10G SFP+ BiDi WDM Modul (TX1330/RX1270nm 20km LC)';
    case 29:
      return 'Mobicom DTSPB231XL-CD20 10G SFP+ BiDi WDM Modul (TX1270/RX1330nm 20km LC)';
    case 30:
      return 'Philips 271V8L/00 27" FHD 75Hz VA Monitor';
    case 31:
      return 'Dell SE2722H 27" FHD 75Hz VA Monitor';
    case 32:
      return 'AOC 24B2XH/EU 23.8" FHD 75Hz IPS Çərçivəsiz Monitor';
    case 33:
      return 'Ruijie Reyee RG-NBS3100-24GT4SFP-P-V2 24-Port Gigabit PoE+ 4 SFP Cloud Switch (370W)';
    case 34:
      return 'Ruijie Reyee RG-NBS3100-8GT2SFP-P 8-Port Gigabit PoE+ 2 SFP Cloud Fanless Switch (125W)';
    case 35:
      return 'Ruijie Reyee RG-NBS3100-48GT4SFP-P 48-Port Gigabit PoE+ 4 SFP Cloud Switch (370W)';
    case 36:
      return 'Ruijie Reyee RG-RAP6262(G) Wi-Fi 6 AX1800 IP68 Çöl Şəraiti Outdoor Access Point';
    case 37:
      return `HP EliteDisplay E233 23" FHD IPS Erqonomik Monitor (1FH46AA)${usedSuffix}`;
    default:
      return `${brand} ${model}${usedSuffix}`;
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
    ? 'İşlənmiş (hərtərəfli texniki test edilmiş, tam saz vəziyyətdə)'
    : 'Tam yeni (istifadə olunmamış, orijinal qablaşdırmada)';

  const specsList = specs
    .filter((s) => !['brend', 'model'].includes(normalizeAz(s.label)))
    .map((s) => `• ${s.label}: ${s.value}`)
    .join('\n');

  return `${productName} — ${brand} tərəfindən istehsal olunmuş etibarlı və yüksək keyfiyyətli texnoloji məhsuldur.

Əsas göstəricilər və xüsusiyyətlər:
• Vəziyyəti: ${conditionText}
${specsList}

IT Market olaraq bütün məhsullara texniki keyfiyyət zəmanəti, operativ çatdırılma və peşəkar servis dəstəyi təqdim edirik.`;
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
  const inputPath = path.join(tmpdir(), `diger-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `diger-out-${randomUUID()}.jpg`);
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
  const excelFileName = dirFiles.find((f) => f.includes('Diger') && f.endsWith('.xlsx'));
  if (!excelFileName) {
    throw new Error('Excel file "Sayt üçün Diger Mehsullar.xlsx" not found');
  }
  const excelPath = path.join(WORKSPACE_ROOT, excelFileName);
  const workbook = XLSX.readFile(excelPath, { cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('Sheet name missing');
  const sheet = workbook.Sheets[firstSheetName];
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
    const qty = Math.max(0, parseInt(String(r[6] ?? '0'), 10) || 0);
    const priceAzn = parseMoney(r[7] ?? 0);
    const features = String(r[8] ?? '').replace(/\r\n/g, '\n').trim();
    const rawUrl = String(r[9] ?? '').trim();
    const imageUrl = FALLBACK_IMAGE_URLS[num] ?? rawUrl;

    rows.push({
      num,
      mainCategory,
      subCategory,
      brand,
      model,
      condition,
      qty,
      priceAzn,
      features,
      imageUrl,
    });
  }
  return rows;
}

export async function importOtherProducts(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await readExcel();
  console.log(`Found ${rows.length} products to import from "Sayt üçün Diger Mehsullar.xlsx".`);

  try {
    // 1. Ensure Brands
    const brandMap: Record<string, string> = {
      cisco: 'cisco',
      oem: 'oem',
      samsung: 'samsung',
      kingston: 'kingston',
      'sk hynix': 'sk-hynix',
      dymo: 'dymo',
      mobicom: 'mobicom',
      philips: 'philips',
      dell: 'dell',
      aoc: 'aoc',
      'ruijie reyee': 'ruijie',
      hp: 'hp',
    };

    const brandsToEnsure = [
      { name: 'Cisco', slug: 'cisco' },
      { name: 'OEM', slug: 'oem' },
      { name: 'Samsung', slug: 'samsung' },
      { name: 'Kingston', slug: 'kingston' },
      { name: 'SK hynix', slug: 'sk-hynix' },
      { name: 'DYMO', slug: 'dymo' },
      { name: 'Mobicom', slug: 'mobicom' },
      { name: 'Philips', slug: 'philips' },
      { name: 'Dell', slug: 'dell' },
      { name: 'AOC', slug: 'aoc' },
      { name: 'Ruijie', slug: 'ruijie' },
      { name: 'HP', slug: 'hp' },
    ];

    const brandEntityMap = new Map<string, { id: string; name: string; slug: string }>();

    for (const b of brandsToEnsure) {
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
      brandEntityMap.set(b.slug, brandRecord);
    }

    // 2. Ensure Categories
    // Check root categories
    const rootCategories = [
      { name: 'Şəbəkə avadanlıqları', slug: 'sebeke-avadanliqlari' },
      { name: 'Server', slug: 'server' },
      { name: 'Kompüter və komponentləri', slug: 'computer' },
      { name: 'Printerlər', slug: 'printerler' },
      { name: 'Monitorlar', slug: 'monitorlar' },
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
    const subCategoriesToEnsure = [
      { name: 'Şəbəkə aksesuarları', slug: 'sebeke-aksesuarlari', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'SFP modullar', slug: 'sfp-modullar', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Kommutator', slug: 'kommutator', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Access Point', slug: 'access-point', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'RAM', slug: 'server-ram', parentSlug: 'server' },
      { name: 'RAM', slug: 'ram', parentSlug: 'computer' },
      { name: 'Siçan', slug: 'sican', parentSlug: 'computer' },
      { name: 'Sərfiyyat materialları', slug: 'serfiyyat-materiallari', parentSlug: 'printerler' },
      { name: 'Monitor', slug: 'monitor', parentSlug: 'monitorlar' },
    ];

    const subCatMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const sc of subCategoriesToEnsure) {
      const parentId = rootCatMap.get(sc.parentSlug) ?? null;
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
      const normalizedBrand = normalizeAz(row.brand);
      const brandSlug = brandMap[normalizedBrand] || 'oem';
      const brand = brandEntityMap.get(brandSlug);
      if (!brand) {
        throw new Error(`Brand not found for ${row.brand} (${brandSlug})`);
      }

      // Resolve Category
      let targetSubCatSlug = 'sebeke-aksesuarlari';
      const normMain = normalizeAz(row.mainCategory);
      const normSub = normalizeAz(row.subCategory);

      if (normSub.includes('sfp')) {
        targetSubCatSlug = 'sfp-modullar';
      } else if (normSub.includes('kommutator') || normSub.includes('switch')) {
        targetSubCatSlug = 'kommutator';
      } else if (normSub.includes('access point')) {
        targetSubCatSlug = 'access-point';
      } else if (normSub.includes('sebeke aksessuar') || normSub.includes('sebeke aksesuarlar')) {
        targetSubCatSlug = 'sebeke-aksesuarlari';
      } else if (normMain.includes('server') && normSub.includes('ram')) {
        targetSubCatSlug = 'server-ram';
      } else if (normSub.includes('ram')) {
        targetSubCatSlug = 'ram';
      } else if (normSub.includes('sican') || normSub.includes('mouse')) {
        targetSubCatSlug = 'sican';
      } else if (normSub.includes('serfiyyat') || normMain.includes('printer')) {
        targetSubCatSlug = 'serfiyyat-materiallari';
      } else if (normSub.includes('monitor') || normMain.includes('monitor')) {
        targetSubCatSlug = 'monitor';
      }

      const category = subCatMap.get(targetSubCatSlug);
      if (!category) {
        throw new Error(`Category not resolved for ${row.mainCategory} > ${row.subCategory}`);
      }

      const isUsed = isUsedCondition(row.condition);
      const productName = resolveProductName(row.num, brand.name, row.model, row.condition, row.subCategory);

      // Unique SKU & Slug Generation
      const cleanModelUpper = row.model.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const brandPrefix = brand.slug.toUpperCase().slice(0, 3);
      let sku = isUsed ? `${brandPrefix}-${cleanModelUpper}-USED` : `${brandPrefix}-${cleanModelUpper}`;
      
      // Special cases for clean SKUs
      if (row.num === 1) sku = 'CIS-CAB-CONSOLE-RJ45';
      if (row.num === 2) sku = 'CIS-CAB-CONSOLE-USB-A-RJ45';
      if (row.num === 3) sku = 'CIS-CAB-CONSOLE-USB-MICRO';
      if (row.num === 4) sku = 'OEM-8GB-2RX4-PC3-12800R-USED';
      if (row.num === 5) sku = 'OEM-4GB-1RX4-PC3L-10600R-USED';
      if (row.num === 6) sku = 'SAM-M393B2G70QH0-CMA-USED';
      if (row.num === 7) sku = 'OEM-4GB-1RX8-PC3-12800U-USED';
      if (row.num === 8) sku = 'SAM-M378B5773DH0-CK0-USED';
      if (row.num === 9) sku = 'OEM-4GB-DDR3-1333-VLP-USED';
      if (row.num === 10) sku = 'SAM-M378B5673FH0-CH9-USED';
      if (row.num === 11) sku = 'KIN-KVR1333D3N9-1G-USED';
      if (row.num === 12) sku = 'OEM-4GB-PC3-10600-DDR3-1333-USED';
      if (row.num === 13) sku = 'OEM-2GB-1RX8-PC3-12800U-USED';
      if (row.num === 14) sku = 'SAM-M378B5173EB0-CK0-USED';
      if (row.num === 15) sku = 'OEM-4GB-2RX8-PC3-10600U-USED';
      if (row.num === 16) sku = 'KIN-KVR16E11-4-USED';
      if (row.num === 17) sku = 'HYN-HMA41GR7MFR4N-TF-USED';
      if (row.num === 18) sku = 'SAM-M393A2G40DB0-CPB-USED';
      if (row.num === 19) sku = 'HYN-HMT42GR7BFR4A-PB-USED';
      if (row.num === 20) sku = 'OEM-WYL4911B';
      if (row.num === 21) sku = 'DYM-91205-S0721650';
      if (row.num === 22) sku = 'DYM-91203-S0721630';
      if (row.num === 23) sku = 'DYM-91204-S0721640';
      if (row.num === 24) sku = 'DYM-45013-S0720530';
      if (row.num === 25) sku = 'DYM-91201-S0721610';
      if (row.num === 26) sku = 'MOB-DTSB5312L-CD20';
      if (row.num === 27) sku = 'MOB-DTSB3512L-CD20';
      if (row.num === 28) sku = 'MOB-DTSPB321XL-CD20';
      if (row.num === 29) sku = 'MOB-DTSPB231XL-CD20';
      if (row.num === 30) sku = 'PHI-271V8L-00';
      if (row.num === 31) sku = 'DEL-SE2722H';
      if (row.num === 32) sku = 'AOC-24B2XH-EU';
      if (row.num === 33) sku = 'RUI-RG-NBS3100-24GT4SFP-P-V2';
      if (row.num === 34) sku = 'RUI-RG-NBS3100-8GT2SFP-P';
      if (row.num === 35) sku = 'RUI-RG-NBS3100-48GT4SFP-P';
      if (row.num === 36) sku = 'RUI-RG-RAP6262-G';
      if (row.num === 37) sku = 'HP-ELITEDISPLAY-E233-USED';

      let slug = slugify(`${brand.slug}-${row.model}`);
      if (isUsed && !slug.endsWith('-islenmis')) {
        slug = `${slug}-islenmis`;
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
  importOtherProducts().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
