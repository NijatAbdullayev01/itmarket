/**
 * One-shot import: UGREEN products from Ugreen_Məhsulları.xlsx
 * Sale price column → variant.price; AZN cost column → variant.cost
 * Variants are created with availableByOrder=true (sifarişlə).
 *
 * Safety: never overwrites a SKU that already belongs to another brand.
 * Existing UGREEN rows are updated in place; media is added only when missing.
 * Rows without sale/cost price are skipped (dealer list has no price either).
 * Product photos are taken from the dealer workbook Picture column (SKU/row match).
 * Icecat/Shopify URLs are only used when a row has no embedded photo.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
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
import {
  buildCatalogImportIdentity,
  findExistingImportedVariant,
  generateCatalogImportSku,
} from '../src/catalog/catalog-import-identity';
import {
  applyTitleLengthToSpecs,
  normalizeUgreenSku,
  resolveUgreenCatalogName,
} from '../src/catalog/ugreen-product-name';
import {
  buildUgreenProductDescription,
  resolveUgreenProductSeo,
} from '../src/catalog/ugreen-product-seo';

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

const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'Ugreen_Məhsulları.xlsx');
const DEALER_EXCEL_PATH = path.join(
  WORKSPACE_ROOT,
  'Ugreen Dealer Price Q3-1 2026-3.xlsx',
);

const PARENT_SLUG_BY_LABEL: Record<string, string> = {
  'smartfonlar ve aksesuarlar': 'smartfonlar',
  'komputer ve komponentleri': 'computer',
  noutbuklar: 'noutbuklar',
  'tv ve audio': 'tv-audio',
  'sebeke avadanliqlari': 'sebeke-avadanliqlari',
};

const SUB_SLUG_BY_PARENT_AND_LABEL: Record<string, Record<string, string>> = {
  'smartfonlar ve aksesuarlar': {
    'sarj cihazi': 'sarj-cihazi',
    'simsiz sarj': 'simsiz-sarj',
    'avtomobil sarji': 'avtomobil-telefon-sarji',
    powerbank: 'powerbank',
    'usb kabel': 'usb-kabel',
    'magsafe aksesuar': 'magsafe-aksesuar',
    'avtomobil tutacagi': 'avtomobil-telefon-tutacagi',
    'telefon dayaqi': 'telefon-dayagi',
  },
  'komputer ve komponentleri': {
    'bluetooth adapter': 'bluetooth-adapter',
    'dok stansiyasi': 'dok-stansiya',
    'hdd qutu': 'hdd-qutusu',
    'hdmi extender': 'hdmi-extender',
    'hdmi kabel': 'hdmi-kabel',
    'kart oxuyucu': 'kart-oxuyucusu',
    sican: 'sican',
    'ses karti': 'ses-karti',
    'teqdimat cihazi': 'teqdimat-cihazi',
    'usb hub': 'usb-hub',
    'usb switch': 'usb-switch',
    'video adapter': 'video-adapter',
  },
  noutbuklar: {
    'noutbuk aksesuarlari': 'noutbuk-aksesuarlari',
    'noutbuk cantasi': 'noutbuk-cantasi',
  },
  'tv ve audio': {
    'audio kabel': 'audio-kabel',
    'bluetooth adapter': 'bluetooth-adapter-audio',
    mikrofon: 'mikrofon',
    qulaqliq: 'qulaqliq',
  },
  'sebeke avadanliqlari': {
    'sebeke adapteri': 'sebeke-adapteri',
    'sebeke aksesuarlari': 'sebeke-aksesuarlari',
  },
};

const PARENTS_TO_ENSURE: Array<{ slug: string; name: string }> = [
  { slug: 'computer', name: 'Kompüter və komponentləri' },
];

const SUBCATEGORIES_TO_ENSURE: Array<{
  parentSlug: string;
  slug: string;
  name: string;
}> = [
  { parentSlug: 'smartfonlar', slug: 'sarj-cihazi', name: 'Şarj cihazı' },
  { parentSlug: 'smartfonlar', slug: 'simsiz-sarj', name: 'Simsiz şarj' },
  {
    parentSlug: 'smartfonlar',
    slug: 'avtomobil-telefon-sarji',
    name: 'Avtomobil telefon şarjı',
  },
  { parentSlug: 'smartfonlar', slug: 'powerbank', name: 'Powerbank' },
  { parentSlug: 'smartfonlar', slug: 'usb-kabel', name: 'USB kabel' },
  {
    parentSlug: 'smartfonlar',
    slug: 'magsafe-aksesuar',
    name: 'MagSafe aksesuar',
  },
  {
    parentSlug: 'smartfonlar',
    slug: 'avtomobil-telefon-tutacagi',
    name: 'Avtomobil telefon tutacağı',
  },
  { parentSlug: 'smartfonlar', slug: 'telefon-dayagi', name: 'Telefon dayağı' },
  {
    parentSlug: 'computer',
    slug: 'bluetooth-adapter',
    name: 'Bluetooth adapter',
  },
  { parentSlug: 'computer', slug: 'dok-stansiya', name: 'Dok stansiya' },
  { parentSlug: 'computer', slug: 'hdd-qutusu', name: 'HDD qutusu' },
  { parentSlug: 'computer', slug: 'hdmi-extender', name: 'HDMI extender' },
  { parentSlug: 'computer', slug: 'hdmi-kabel', name: 'HDMI kabel' },
  { parentSlug: 'computer', slug: 'kart-oxuyucusu', name: 'Kart oxuyucusu' },
  { parentSlug: 'computer', slug: 'sican', name: 'Siçan' },
  { parentSlug: 'computer', slug: 'ses-karti', name: 'Səs kartı' },
  { parentSlug: 'computer', slug: 'teqdimat-cihazi', name: 'Təqdimat cihazı' },
  { parentSlug: 'computer', slug: 'usb-hub', name: 'USB hub' },
  { parentSlug: 'computer', slug: 'usb-switch', name: 'USB switch' },
  { parentSlug: 'computer', slug: 'video-adapter', name: 'Video adapter' },
  {
    parentSlug: 'noutbuklar',
    slug: 'noutbuk-aksesuarlari',
    name: 'Noutbuk aksesuarları',
  },
  {
    parentSlug: 'noutbuklar',
    slug: 'noutbuk-cantasi',
    name: 'Noutbuk çantası',
  },
  { parentSlug: 'tv-audio', slug: 'audio-kabel', name: 'Audio kabel' },
  {
    parentSlug: 'tv-audio',
    slug: 'bluetooth-adapter-audio',
    name: 'Bluetooth adapter audio',
  },
  { parentSlug: 'tv-audio', slug: 'mikrofon', name: 'Mikrofon' },
  { parentSlug: 'tv-audio', slug: 'qulaqliq', name: 'Qulaqlıq' },
  {
    parentSlug: 'sebeke-avadanliqlari',
    slug: 'sebeke-adapteri',
    name: 'Şəbəkə adapteri',
  },
  {
    parentSlug: 'sebeke-avadanliqlari',
    slug: 'sebeke-aksesuarlari',
    name: 'Şəbəkə aksesuarları',
  },
];

const CABLE_LENGTH_SLUGS = new Set([
  'usb-kabel',
  'audio-kabel',
  'hdmi-kabel',
  'sebeke-aksesuarlari',
]);

const SKIP_SPEC_LABELS = new Set([
  'brend',
  'status',
  'kateqoriya',
  'mənbə',
  'menbe',
  'sku',
]);

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
  sku: string;
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
  const lines = features.split(/\r?\n|\s*\|\s*/);
  for (const rawLine of lines) {
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
    const key = label
      .toLocaleLowerCase('az')
      .split('')
      .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
      .join('');
    if (SKIP_SPEC_LABELS.has(key)) {
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

function resolveCategorySlugs(
  mainCategory: string,
  subCategory: string,
): { parentSlug: string; subcategorySlug: string } {
  const parentKey = normalizeCategoryKey(mainCategory);
  const parentSlug = PARENT_SLUG_BY_LABEL[parentKey];
  if (parentSlug === undefined) {
    throw new Error(`Unknown main category: ${mainCategory}`);
  }
  const subKey = normalizeCategoryKey(subCategory);
  const subcategorySlug = SUB_SLUG_BY_PARENT_AND_LABEL[parentKey]?.[subKey];
  if (subcategorySlug === undefined) {
    throw new Error(
      `Unknown subcategory: ${subCategory} (under ${mainCategory})`,
    );
  }
  return { parentSlug, subcategorySlug };
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
    const sku = String(raw[1] ?? '').trim();
    const title = String(raw[2] ?? '').trim();
    if (sku === '' || title === '') {
      continue;
    }
    rows.push({
      model,
      sku,
      title,
      features: String(raw[3] ?? '')
        .replace(/\r\n/g, '\n')
        .trim(),
      brand: String(raw[4] ?? '').trim(),
      costAzn: String(raw[5] ?? '').trim(),
      salePriceAzn: String(raw[7] ?? '').trim(),
      imageUrl: String(raw[8] ?? '').trim(),
      mainCategory: String(raw[9] ?? '').trim(),
      subCategory: String(raw[10] ?? '').trim(),
    });
  }
  return rows;
}

async function unzipDealerEntries(): Promise<Map<string, Buffer>> {
  const dest = path.join(tmpdir(), `ugreen-dealer-${randomUUID()}`);
  await mkdir(dest, { recursive: true });
  try {
    const result = spawnSync(
      'unzip',
      [
        '-qq',
        '-o',
        DEALER_EXCEL_PATH,
        'xl/media/*',
        'xl/drawings/drawing1.xml',
        'xl/drawings/_rels/drawing1.xml.rels',
        '-d',
        dest,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      throw new Error(
        `Dealer Excel unzip failed: ${result.stderr || result.error?.message || 'unknown'}`,
      );
    }
    const entries = new Map<string, Buffer>();
    entries.set(
      'xl/drawings/drawing1.xml',
      await readFile(path.join(dest, 'xl/drawings/drawing1.xml')),
    );
    entries.set(
      'xl/drawings/_rels/drawing1.xml.rels',
      await readFile(path.join(dest, 'xl/drawings/_rels/drawing1.xml.rels')),
    );
    const mediaDir = path.join(dest, 'xl/media');
    for (const fileName of await readdir(mediaDir)) {
      entries.set(
        `xl/media/${fileName}`,
        await readFile(path.join(mediaDir, fileName)),
      );
    }
    return entries;
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
}

function parseRelationshipTargets(relsXml: string): Map<string, string> {
  const targets = new Map<string, string>();
  for (const tag of relsXml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = tag[1] ?? '';
    const idMatch = attrs.match(/\bId="([^"]+)"/);
    const targetMatch = attrs.match(/\bTarget="([^"]+)"/);
    if (idMatch === null || targetMatch === null) {
      continue;
    }
    targets.set(idMatch[1]!, targetMatch[1]!.replace(/^\.\.\//, 'xl/'));
  }
  return targets;
}

function parseDrawingAnchors(
  drawingXml: string,
): Array<{ excelRow: number; relationshipId: string }> {
  const anchors: Array<{ excelRow: number; relationshipId: string }> = [];
  const pattern =
    /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>[\s\S]*?r:embed="(rId\d+)"/g;
  for (const match of drawingXml.matchAll(pattern)) {
    anchors.push({
      excelRow: Number(match[1]) + 1,
      relationshipId: match[2]!,
    });
  }
  return anchors;
}

function readDealerSkuByExcelRow(): Map<number, string> {
  const workbook = XLSX.readFile(DEALER_EXCEL_PATH, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (sheet === undefined) {
    throw new Error('Dealer Excel sheet missing');
  }
  const matrix = XLSX.utils.sheet_to_json<(string | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  const skuByRow = new Map<number, string>();
  for (const [index, raw] of matrix.entries()) {
    if (index < 6 || raw === undefined) {
      continue;
    }
    const skuCell = String(raw[2] ?? '').trim();
    const article = String(raw[3] ?? '').trim();
    let sku = skuCell;
    if (sku === '' || /^link$/i.test(sku)) {
      const fromArticle = article.match(/_([A-Z0-9]+)$/i);
      if (fromArticle === null) {
        continue;
      }
      sku = fromArticle[1]!;
    }
    try {
      skuByRow.set(index + 1, assertSku(sku));
    } catch {
      continue;
    }
  }
  return skuByRow;
}

async function loadDealerEmbeddedImages(): Promise<Map<string, Buffer>> {
  const zip = await unzipDealerEntries();
  const rels = zip.get('xl/drawings/_rels/drawing1.xml.rels');
  const drawing = zip.get('xl/drawings/drawing1.xml');
  if (rels === undefined || drawing === undefined) {
    throw new Error('Dealer Excel drawings missing');
  }
  const ridToMedia = parseRelationshipTargets(rels.toString('utf8'));
  const skuByRow = readDealerSkuByExcelRow();
  const images = new Map<string, Buffer>();
  const sizes = new Map<string, number>();
  for (const anchor of parseDrawingAnchors(drawing.toString('utf8'))) {
    const sku = skuByRow.get(anchor.excelRow);
    const mediaPath = ridToMedia.get(anchor.relationshipId);
    if (sku === undefined || mediaPath === undefined) {
      continue;
    }
    const body = zip.get(mediaPath);
    if (body === undefined || body.byteLength < 100) {
      continue;
    }
    const previous = sizes.get(sku) ?? -1;
    if (body.byteLength > previous) {
      images.set(sku, body);
      sizes.set(sku, body.byteLength);
    }
  }
  return images;
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
  const inputPath = path.join(tmpdir(), `ugreen-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `ugreen-out-${randomUUID()}.jpg`);
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
    'https://www.ugreen.com/',
    'https://www.icecat.biz/',
    'https://cdn.shopify.com/',
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
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    };
    if (referer !== undefined) {
      headers.Referer = referer;
    }
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
  }
  process.stderr.write(`Image download failed: ${imageUrl}\n`);
  return null;
}

async function saveCatalogImage(
  body: Buffer,
  sourceLabel: string,
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

async function resolveProductImage(
  imageUrl: string,
  sku: string,
  dealerImages: Map<string, Buffer>,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  const embedded = dealerImages.get(sku);
  if (embedded !== undefined) {
    return saveCatalogImage(embedded, `dealer-excel:${sku}`);
  }
  return downloadImage(imageUrl);
}

function catalogPublicPaths(objectKey: string): string[] {
  const fileName = path.basename(objectKey);
  return [
    path.join(WORKSPACE_ROOT, 'apps/storefront/public/images/catalog', fileName),
    path.join(WORKSPACE_ROOT, 'apps/backoffice/public/images/catalog', fileName),
  ];
}

async function deleteCatalogFile(objectKey: string): Promise<void> {
  await Promise.allSettled(
    catalogPublicPaths(objectKey).map((filePath) => unlink(filePath)),
  );
}

function assertSku(sku: string): string {
  const normalized = normalizeUgreenSku(sku);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(normalized)) {
    throw new Error(`Invalid SKU: ${sku} → ${normalized}`);
  }
  return normalized;
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'ugreen' },
    select: { id: true, name: true, status: true },
  });
  if (existing !== null) {
    if (
      existing.status !== CatalogStatus.ACTIVE ||
      existing.name !== 'UGREEN'
    ) {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { name: 'UGREEN', status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id, name: 'UGREEN' };
  }
  return prisma.brand.create({
    data: {
      name: 'UGREEN',
      slug: 'ugreen',
      status: CatalogStatus.ACTIVE,
    },
    select: { id: true, name: true },
  });
}

async function ensureRootCategory(
  prisma: PrismaClient,
  slug: string,
  name: string,
): Promise<{ id: string }> {
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, parentId: true, status: true, name: true },
  });
  if (existing !== null) {
    if (existing.parentId !== null) {
      throw new Error(`Expected root category: ${slug}`);
    }
    if (existing.status !== CatalogStatus.ACTIVE || existing.name !== name) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name, status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id };
  }
  const aggregate = await prisma.category.aggregate({
    where: { parentId: null },
    _max: { sortOrder: true },
  });
  return prisma.category.create({
    data: {
      name,
      slug,
      status: CatalogStatus.ACTIVE,
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
}

async function ensureSubcategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  for (const parent of PARENTS_TO_ENSURE) {
    await ensureRootCategory(prisma, parent.slug, parent.name);
  }

  const parentBySlug = new Map<string, string>();
  for (const parentSlug of new Set(Object.values(PARENT_SLUG_BY_LABEL))) {
    const parent = await prisma.category.findUnique({
      where: { slug: parentSlug },
      select: { id: true, parentId: true, status: true },
    });
    if (parent === null) {
      throw new Error(`Main category missing: ${parentSlug}`);
    }
    if (parent.parentId !== null) {
      throw new Error(`Expected root category: ${parentSlug}`);
    }
    if (parent.status !== CatalogStatus.ACTIVE) {
      await prisma.category.update({
        where: { id: parent.id },
        data: { status: CatalogStatus.ACTIVE },
      });
    }
    parentBySlug.set(parentSlug, parent.id);
  }

  for (const entry of SUBCATEGORIES_TO_ENSURE) {
    const parentId = parentBySlug.get(entry.parentSlug);
    if (parentId === undefined) {
      throw new Error(`Parent missing for ${entry.slug}`);
    }
    const existing = await prisma.category.findUnique({
      where: { slug: entry.slug },
      select: { id: true, parentId: true, status: true },
    });
    if (existing === null) {
      const aggregate = await prisma.category.aggregate({
        where: { parentId },
        _max: { sortOrder: true },
      });
      await prisma.category.create({
        data: {
          name: entry.name,
          slug: entry.slug,
          parentId,
          status: CatalogStatus.ACTIVE,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
      continue;
    }
    if (existing.parentId !== parentId) {
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
      select: { id: true, parentId: true },
    });
    if (category === null) {
      throw new Error(`Subcategory missing: ${entry.slug}`);
    }
    if (category.parentId === null) {
      throw new Error(`Subcategory ${entry.slug} is a root category`);
    }
    categoryBySlug.set(entry.slug, category.id);
  }
  return categoryBySlug;
}

async function importUgreenProducts(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = readExcelRows();
  if (rows.length === 0) {
    throw new Error('No product rows found in Excel');
  }

  const dealerImages = await loadDealerEmbeddedImages();
  process.stdout.write(
    `Dealer Excel embedded images: ${String(dealerImages.size)}\n`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let mediaAttached = 0;

  try {
    const brand = await ensureBrand(prisma);
    const categoryBySlug = await ensureSubcategories(prisma);

    for (const row of rows) {
      if (row.brand.toUpperCase() !== 'UGREEN') {
        throw new Error(`Unexpected brand for ${row.sku}: ${row.brand}`);
      }

      if (row.salePriceAzn === '' || row.costAzn === '') {
        process.stderr.write(
          `skipped ${row.sku}: missing sale or cost price\n`,
        );
        skipped += 1;
        continue;
      }

      const sku = assertSku(row.sku);
      const { subcategorySlug } = resolveCategorySlugs(
        row.mainCategory,
        row.subCategory,
      );
      const categoryId = categoryBySlug.get(subcategorySlug);
      if (categoryId === undefined) {
        throw new Error(`Category id missing for ${subcategorySlug}`);
      }

      let specs = parseSpecs(row.features);
      if (CABLE_LENGTH_SLUGS.has(subcategorySlug)) {
        specs = applyTitleLengthToSpecs(row.title, specs);
      }
      const manufacturerModel =
        row.model.trim() !== ''
          ? row.model.trim()
          : (specs.find((entry) => entry.label.trim().toLocaleLowerCase('az') === 'model')
              ?.value.trim() || sku);
      const productName = resolveUgreenCatalogName(sku, row.title, {
        subcategorySlug,
        specs,
      });
      const seo = resolveUgreenProductSeo({
        sku,
        title: productName,
        specs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const price = parseMoney(row.salePriceAzn);
      const cost = parseMoney(row.costAzn);
      const productSlugBase = slugifyCatalogLabel(`ugreen ${manufacturerModel}`);
      let productSlug = productSlugBase;

      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel,
        specs,
        includePhoneTabletVariantAttributes: false,
      });
      let existingVariant = await findExistingImportedVariant(prisma, {
        brandId: brand.id,
        manufacturerModel,
        generatedSku,
      });
      if (existingVariant === null) {
        const byArticle = await prisma.productVariant.findUnique({
          where: { sku },
          select: {
            id: true,
            productId: true,
            product: { select: { brandId: true } },
          },
        });
        if (byArticle !== null && byArticle.product.brandId === brand.id) {
          existingVariant = { id: byArticle.id, productId: byArticle.productId };
        }
      }

      const attributes: Record<string, string> = {
        Model: row.model === '' ? sku : row.model,
      };
      for (const spec of specs.slice(0, 12)) {
        if (!(spec.label in attributes)) {
          attributes[spec.label] = spec.value;
        }
      }

      const existingMedia =
        existingVariant === null
          ? null
          : await prisma.productMedia.findFirst({
              where: { productId: existingVariant.productId },
              orderBy: { sortOrder: 'asc' },
              select: { id: true, objectKey: true },
            });
      if (process.argv.includes('--replace-media')) {
        if (existingVariant === null) {
          continue;
        }
        const embedded = dealerImages.get(sku);
        if (embedded === undefined) {
          process.stderr.write(`no excel image for ${sku}\n`);
          skipped += 1;
          continue;
        }
        if (existingMedia !== null) {
          const currentPath = catalogPublicPaths(existingMedia.objectKey)[0];
          if (
            currentPath !== undefined &&
            existsSync(currentPath) &&
            (await readFile(currentPath)).equals(embedded)
          ) {
            continue;
          }
        }
        const media = await saveCatalogImage(embedded, `dealer-excel:${sku}`);
        if (media === null) {
          process.stderr.write(`excel image invalid for ${sku}\n`);
          skipped += 1;
          continue;
        }
        if (existingMedia === null) {
          await prisma.productMedia.create({
            data: {
              productId: existingVariant.productId,
              objectKey: media.objectKey,
              mimeType: media.mimeType,
              byteSize: media.byteSize,
              altText: productName,
              sortOrder: 0,
            },
          });
        } else {
          await prisma.productMedia.update({
            where: { id: existingMedia.id },
            data: {
              objectKey: media.objectKey,
              mimeType: media.mimeType,
              byteSize: media.byteSize,
              altText: productName,
            },
          });
          if (existingMedia.objectKey !== media.objectKey) {
            await deleteCatalogFile(existingMedia.objectKey);
          }
        }
        mediaAttached += 1;
        process.stdout.write(`replaced ${sku} → ${productName}\n`);
        continue;
      }
      if (process.argv.includes('--media-only')) {
        if (existingVariant === null || existingMedia !== null) {
          continue;
        }
        const media = await resolveProductImage(
          row.imageUrl,
          sku,
          dealerImages,
        );
        if (media === null) {
          process.stderr.write(`no image for ${sku}\n`);
          skipped += 1;
          continue;
        }
        await prisma.productMedia.create({
          data: {
            productId: existingVariant.productId,
            objectKey: media.objectKey,
            mimeType: media.mimeType,
            byteSize: media.byteSize,
            altText: productName,
            sortOrder: 0,
          },
        });
        mediaAttached += 1;
        process.stdout.write(`media ${sku} → ${productName}\n`);
        continue;
      }

      const media =
        existingMedia === null
          ? await resolveProductImage(row.imageUrl, sku, dealerImages)
          : null;

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: manufacturerModel,
              description: buildUgreenProductDescription(seo.pageIntro, specs),
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
              attributes,
              price,
              cost,
              currency: 'AZN',
              status: CatalogStatus.ACTIVE,
              availableByOrder: true,
            },
          });
          if (media !== null) {
            const currentMedia = await tx.productMedia.findFirst({
              where: { productId: existingVariant.productId },
              orderBy: { sortOrder: 'asc' },
              select: { id: true },
            });
            if (currentMedia === null) {
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
            name: manufacturerModel,
            slug: productSlug,
            description: buildUgreenProductDescription(seo.pageIntro, specs),
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
      `\nDone. created=${created} updated=${updated} skipped=${skipped} mediaAttached=${mediaAttached} totalRows=${rows.length}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void importUgreenProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
