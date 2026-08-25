/**
 * Import Diger products from "Sayt üçün 24082026_260812_162518 -Diger.xlsx".
 *
 * Column layout of the "Məhsullar" sheet (0-indexed after two title rows + header):
 *   0 № | 1 Model | 2 Barkod | 3 Vəziyyəti | 4 Qty | 5 Qiymət (endirimli)
 *   6 Köhnə qiymət | 7 Əsas kateqoriya | 8 Alt kateqoriya | 9 Brend
 *   10 Xüsusiyyətlər (AZ) | 11 Xüsusiyyətlər (RU) | 12 Xüsusiyyətlər (EN) | 13 Şəkil linkləri
 *
 * Imports Cisco / HP / Aruba / Fortinet / Palo Alto / TP-Link / Linksys / Grandstream
 * network equipment with images, translated specs (AZ/RU/EN), SEO, pricing and store stock.
 *
 * If a product already exists on the site (matched by SKU / slug / barcode / model),
 * it is NOT re-created — only its quantity is added at the ST-28MAY location.
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

function titleCaseAz(word: string): string {
  if (!word) return word;
  if (/^[A-Z0-9+./\-]+$/.test(word) && word.length > 1) {
    return word;
  }
  const first = word.charAt(0);
  if (first === 'i') return `İ${word.slice(1)}`;
  if (first === 'ı') return `I${word.slice(1)}`;
  return `${first.toUpperCase()}${word.slice(1)}`;
}

function resolveTypeFragment(tip: string): string {
  const t = tip.toLowerCase();
  if (t.includes('simsiz giriş nöqtəsi')) return 'Simsiz Giriş Nöqtəsi';
  if (t.includes('simsiz körpü')) return 'Simsiz Körpü';
  if (t.includes('kontroller')) return 'Wi-Fi Kontroller';
  if (t.includes('kommutator')) {
    const base = (tip.split('(')[0] ?? '').trim().replace(/^Idarəolunmaz/i, 'İdarəolunmaz');
    return base.split(/\s+/).filter(Boolean).map(titleCaseAz).join(' ');
  }
  if (t.includes('integrated services router')) return 'Integrated Services Router';
  if (t.includes('edge router')) return 'Edge Router';
  if (t.includes('səs routeri')) return 'Səs Routeri';
  if (t.includes('modul access router')) return 'Modul Access Router';
  if (t.includes('4g lte router')) return '4G LTE Router';
  if (t.includes('simsiz + 3g router')) return 'Simsiz 3G Router';
  if (t.includes('simsiz router')) return 'Simsiz Router';
  if (t.includes('firewall router')) return 'Firewall Router';
  if (t.includes('simsiz təhlükəsizlik cihazı')) return 'Simsiz Təhlükəsizlik Cihazı';
  if (t.includes('enterprise firewall')) return 'Enterprise Firewall';
  if (t.includes('adaptive security appliance')) return 'Firewall';
  if (t.includes('voip ata şlüz')) return 'VoIP ATA';
  if (t.includes('voip ata + dect baza')) return 'VoIP ATA DECT Baza';
  if (t.includes('dect ip telefon')) return 'DECT IP Telefon';
  if (t.includes('simsiz (wi-fi) ip telefon')) return 'Simsiz IP Telefon';
  if (t.includes('dect baza stansiyası')) return 'DECT Baza Stansiyası';
  if (t.includes('dect qulaqlıq')) return 'DECT Qulaqlıq';
  if (t.includes('analoq telefon')) return 'Analoq Telefon';
  if (t.includes('ip telefon')) return 'IP Telefon';
  if (t.includes('rack server')) return t.includes('1u') ? 'Rack Server 1U' : 'Rack Server 2U';
  if (t.includes('firewall')) return 'Firewall';
  if (t.includes('server')) return 'Server';
  return '';
}

const BRAND_PREFIXES: Record<string, string[]> = {
  Cisco: ['CISCO AIR ', 'CISCO ', 'CIS '],
  Aruba: ['ARUBA ', 'ARU '],
  HP: ['HP ', 'HEWLETT PACKARD '],
  Fortinet: ['FORTINET ', 'FORTI '],
  'Palo Alto': ['PALOALTO ', 'PALO ALTO ', 'PALOALTO-NETWORKS '],
  'TP-Link': ['TPLINK ', 'TP-LINK ', 'TP LINK '],
  Linksys: ['LINKSYS ', 'LINK '],
  Grandstream: ['GRANDSTREAM ', 'GSC ', 'GS '],
};

const BRAND_SKU_PREFIX: Record<string, string> = {
  Cisco: 'CIS',
  Aruba: 'ARU',
  HP: 'HP',
  Fortinet: 'FOR',
  'Palo Alto': 'PAL',
  'TP-Link': 'TPL',
  Linksys: 'LIN',
  Grandstream: 'GRA',
};

const BRAND_SLUGS: Record<string, string> = {
  Cisco: 'cisco',
  Aruba: 'aruba',
  HP: 'hp',
  Fortinet: 'fortinet',
  'Palo Alto': 'palo-alto',
  'TP-Link': 'tp-link',
  Linksys: 'linksys',
  Grandstream: 'grandstream',
};

const SUB_CATEGORY_SLUGS: Record<string, string> = {
  'Access Point': 'access-point',
  'Wi-Fi kontroller': 'wi-fi-kontroller',
  Kommutator: 'kommutator',
  Router: 'router',
  Firewall: 'firewall',
  'VoIP və IP telefonlar': 'voip-ip-telefonlar',
  Serverlər: 'serverler',
};

function stripTrailingTypeWord(model: string): string {
  let m = model;
  let lower = m.toLowerCase();
  for (const word of [' router', ' switch', ' kommutator', ' dect']) {
    if (lower.endsWith(word)) {
      m = m.slice(0, -word.length);
      lower = m.toLowerCase();
    }
  }
  return m;
}

function cleanModel(model: string, brand: string, subCategory: string): string {
  let m = String(model).trim().toUpperCase();
  m = stripTrailingTypeWord(m);
  for (const prefix of BRAND_PREFIXES[brand] ?? []) {
    if (m.startsWith(prefix)) {
      m = m.slice(prefix.length);
      break;
    }
  }
  if (subCategory === 'Access Point' && m.startsWith('AIR ')) {
    m = m.slice('AIR '.length);
  }
  if (subCategory === 'VoIP və IP telefonlar' && m.startsWith('IP PHONE ')) {
    m = m.slice('IP PHONE '.length);
  }
  return m.trim();
}

function isUsedCondition(condition: string): boolean {
  const norm = normalizeAz(condition);
  return norm !== 'yeni' && norm !== 'new';
}

type ProductDefinition = {
  name: string;
  sku: string;
  slug: string;
  brandSlug: string;
  subCategorySlug: string;
  cleanModel: string;
  isUsed: boolean;
};

function resolveProductDefinition(row: ExcelRow): ProductDefinition {
  const tip = tipOf(row.featuresAz);
  const fragment = resolveTypeFragment(tip);
  const clean = cleanModel(row.model, row.brand, row.subCategory);
  const used = isUsedCondition(row.condition);

  const name = `${row.brand} ${clean}${fragment ? ` ${fragment}` : ''}${used ? ' (işlənmiş)' : ''}`;

  const skuPart = clean
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const sku = `${BRAND_SKU_PREFIX[row.brand] ?? 'GEN'}-${skuPart}${used ? '-USED' : ''}`;

  const slugBase = slugify(`${BRAND_SLUGS[row.brand] ?? slugify(row.brand)}-${clean}`);
  const slug = used && !slugBase.endsWith('-islenmis') ? `${slugBase}-islenmis` : slugBase;

  return {
    name,
    sku,
    slug,
    brandSlug: BRAND_SLUGS[row.brand] ?? slugify(row.brand),
    subCategorySlug: SUB_CATEGORY_SLUGS[row.subCategory] ?? slugify(row.subCategory),
    cleanModel: clean,
    isUsed: used,
  };
}

function resolveProductDescription(
  productName: string,
  brand: string,
  used: boolean,
  barcode: string | null,
  specs: Array<{ label: string; value: string }>,
): string {
  const conditionText = used
    ? 'İşlənmiş (hərtərəfli texniki test edilmiş, tam saz vəziyyətdə)'
    : 'Tam yeni (istifadə olunmamış, orijinal qablaşdırmada)';

  const specsList = specs
    .filter((s) => !['brend', 'model', 'barkod', 'veziyyeti'].includes(normalizeAz(s.label)))
    .map((s) => `• ${s.label}: ${s.value}`)
    .join('\n');

  return `${productName} — ${brand} tərəfindən istehsal olunmuş etibarlı və yüksək keyfiyyətli texnoloji məhsuldur.

Əsas göstəricilər və xüsusiyyətlər:
• Vəziyyəti: ${conditionText}
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
  const excelFileName = dirFiles.find(
    (f) => f.includes('Diger') && f.includes('24082026') && f.endsWith('.xlsx'),
  );
  if (!excelFileName) {
    throw new Error('Excel file "Sayt üçün 24082026... -Diger.xlsx" not found');
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
    const condition = String(r[3] ?? '').trim();
    const qty = Math.max(0, parseInt(String(r[4] ?? '0'), 10) || 0);
    const priceAzn = parseMoney(r[5] ?? 0);
    const previousPriceAzn = parseMoney(r[6] ?? 0);
    const mainCategory = String(r[7] ?? '').trim();
    const subCategory = String(r[8] ?? '').trim();
    const brand = String(r[9] ?? '').trim();
    const featuresAz = String(r[10] ?? '').replace(/\r\n/g, '\n').trim();
    const featuresRu = String(r[11] ?? '').replace(/\r\n/g, '\n').trim();
    const featuresEn = String(r[12] ?? '').replace(/\r\n/g, '\n').trim();
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

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

async function findExistingProduct(
  tx: TransactionClient,
  row: ExcelRow,
  definition: ProductDefinition,
  brandId: string,
): Promise<{ productId: string; variantId: string } | null> {
  // 1. Exact SKU match
  const bySku = await tx.productVariant.findUnique({
    where: { sku: definition.sku },
  });
  if (bySku) {
    return { productId: bySku.productId, variantId: bySku.id };
  }

  // 2. Exact slug match
  const bySlug = await tx.product.findUnique({
    where: { slug: definition.slug },
  });
  if (bySlug) {
    const variant = await tx.productVariant.findFirst({
      where: { productId: bySlug.id },
      orderBy: { createdAt: 'asc' },
    });
    if (variant) {
      return { productId: bySlug.id, variantId: variant.id };
    }
  }

  // 3. Barcode match
  if (row.barcode) {
    const byBarcode = await tx.productVariant.findFirst({
      where: { barcode: row.barcode },
    });
    if (byBarcode) {
      return { productId: byBarcode.productId, variantId: byBarcode.id };
    }
  }

  // 4. Model match — only for sufficiently specific model strings
  const normalizedModel = normalizeAz(definition.cleanModel);
  const foldedModel = normalizedModel.replace(/[^a-z0-9]/g, '');
  if (foldedModel.length >= 5) {
    const candidates = await tx.product.findMany({
      where: { brandId, status: CatalogStatus.ACTIVE },
      select: { id: true, name: true, requiredSpecs: true },
      take: 500,
    });
    for (const candidate of candidates) {
      const nameFolded = normalizeAz(candidate.name).replace(/[^a-z0-9]/g, '');
      if (nameFolded.includes(foldedModel)) {
        const variant = await tx.productVariant.findFirst({
          where: { productId: candidate.id },
          orderBy: { createdAt: 'asc' },
        });
        if (variant) {
          return { productId: candidate.id, variantId: variant.id };
        }
      }
      const specs = Array.isArray(candidate.requiredSpecs)
        ? (candidate.requiredSpecs as Array<Record<string, unknown>>)
        : [];
      for (const spec of specs) {
        if (
          typeof spec.label === 'string' &&
          normalizeAz(spec.label) === 'model' &&
          typeof spec.value === 'string' &&
          normalizeAz(spec.value).replace(/[^a-z0-9]/g, '') === foldedModel
        ) {
          const variant = await tx.productVariant.findFirst({
            where: { productId: candidate.id },
            orderBy: { createdAt: 'asc' },
          });
          if (variant) {
            return { productId: candidate.id, variantId: variant.id };
          }
        }
      }
    }
  }

  return null;
}

export async function importDigerFromExcel(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const rows = await readExcel();
  console.log(`Found ${rows.length} products to import from "Sayt üçün 24082026... -Diger.xlsx".`);

  try {
    // 1. Ensure Brands
    const brandsToEnsure = [
      { name: 'Cisco', slug: 'cisco' },
      { name: 'Aruba', slug: 'aruba' },
      { name: 'HP', slug: 'hp' },
      { name: 'Fortinet', slug: 'fortinet' },
      { name: 'Palo Alto', slug: 'palo-alto' },
      { name: 'TP-Link', slug: 'tp-link' },
      { name: 'Linksys', slug: 'linksys' },
      { name: 'Grandstream', slug: 'grandstream' },
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

    // 2. Ensure Root Categories
    const rootCategories = [
      { name: 'Şəbəkə avadanlıqları', slug: 'sebeke-avadanliqlari' },
      { name: 'Server', slug: 'server' },
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
      { name: 'Wi-Fi Kontroller', slug: 'wi-fi-kontroller', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Kommutator', slug: 'kommutator', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Router', slug: 'router', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Firewall', slug: 'firewall', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'VoIP və IP telefonlar', slug: 'voip-ip-telefonlar', parentSlug: 'sebeke-avadanliqlari' },
      { name: 'Serverlər', slug: 'serverler', parentSlug: 'server' },
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
      const definition = resolveProductDefinition(row);

      const brand = brandEntityMap.get(definition.brandSlug);
      if (!brand) throw new Error(`Brand not found for ${row.brand} (${definition.brandSlug})`);

      const category = subCatMap.get(definition.subCategorySlug);
      if (!category) {
        throw new Error(`Category not resolved for ${row.mainCategory} > ${row.subCategory}`);
      }

      const productName = definition.name;
      const sku = definition.sku;
      const slug = definition.slug;

      const translatedFeatures = buildSpecEntriesWithTranslations(
        row.featuresAz,
        row.featuresRu,
        row.featuresEn,
      );

      const conditionValue = row.condition.trim() === 'Yeni' ? 'Yeni' : 'İşlənmiş';
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
        definition.isUsed,
        row.barcode,
        specs,
      );
      const { seoTitle, seoDescription } = resolveSeo(productName, brand.name);

      const attributes: Record<string, string> = {
        Model: row.model,
        Vəziyyəti: conditionValue,
      };

      const availableByOrder = row.qty === 0;

      // Download/compress the image BEFORE opening the DB transaction — the download is
      // slow and would otherwise exhaust the interactive transaction timeout.
      const media = await downloadImage(row.imageUrl);

      await prisma.$transaction(
        async (tx) => {
          const existing = await findExistingProduct(tx, row, definition, brand.id);

        if (existing) {
          // Product already exists — only add quantities, never re-create.
          const balance = await tx.inventoryBalance.upsert({
            where: {
              variantId_locationId: {
                variantId: existing.variantId,
                locationId: storeLocation.id,
              },
            },
            create: {
              variantId: existing.variantId,
              locationId: storeLocation.id,
              onHand: row.qty,
              reserved: 0,
            },
            update: {
              onHand: { increment: row.qty },
            },
          });
          await tx.productVariant.update({
            where: { id: existing.variantId },
            data: { availableByOrder: balance.onHand === 0 },
          });
          updatedCount++;
          process.stdout.write(
            `[№ ${row.num}] EXISTING ${productName} — qty +${row.qty} (now ${balance.onHand}) added to variant ${existing.variantId}\n`,
          );
          return;
        }

        // Create product
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
          `[№ ${row.num}] Created ${productName} (SKU: ${sku}, Price: ${row.priceAzn} AZN, Old: ${row.previousPriceAzn} AZN, Stock: ${row.qty})\n`,
        );
        },
        { timeout: 60_000 },
      );
    }

    console.log(`\nImport completed successfully! Created: ${createdCount}, Quantity-added: ${updatedCount}`);
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
          console.log(
            `${row.num}\t${definition.name}\tSKU=${definition.sku}\tSLUG=${definition.slug}\t${definition.subCategorySlug}\tqty=${row.qty}\tprice=${row.priceAzn}\told=${row.previousPriceAzn}\timg=${row.imageUrl ? 'yes' : 'no'}`,
          );
        }
      })
      .catch((err) => {
        console.error('Dry-run failed:', err);
        process.exit(1);
      });
  } else {
    importDigerFromExcel().catch((err) => {
      console.error('Fatal import error:', err);
      process.exit(1);
    });
  }
}
