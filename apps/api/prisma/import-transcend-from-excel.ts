/**
 * One-shot import: Transcend products from Transcend Price Q3Y25 (P)-8.xlsx
 * Retail (G) → variant.cost; sale = ROUND(cost × 1.25, 2) → variant.price
 * Variants are created with availableByOrder=true (sifarişlə).
 *
 * Safety: never overwrites a SKU that already belongs to another brand.
 * Existing Transcend rows are updated in place; media is added only when missing.
 * Product photos: Excel embedded image, then Icecat (EAN), then official Transcend page.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
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
  findExistingImportedVariant,
  generateCatalogImportSku,
} from '../src/catalog/catalog-import-identity';
import { normalizeVariantBarcode } from '../src/catalog/variant.domain';
import {
  normalizeTranscendSku,
  resolveTranscendCatalogName,
} from '../src/catalog/transcend-product-name';
import {
  buildTranscendProductDescription,
  resolveTranscendProductSeo,
} from '../src/catalog/transcend-product-seo';

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

const EXCEL_PATH = path.join(
  WORKSPACE_ROOT,
  'Transcend Price Q3Y25 (P)-8.xlsx',
);

const PARENT_SLUG_BY_LABEL: Record<string, string> = {
  'komputer ve komponentleri': 'computer',
};

const SUB_SLUG_BY_PARENT_AND_LABEL: Record<string, Record<string, string>> = {
  'komputer ve komponentleri': {
    'xarici ssd': 'xarici-ssd',
    'xarici hdd': 'xarici-hdd',
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
  { parentSlug: 'computer', slug: 'xarici-ssd', name: 'Xarici SSD' },
  { parentSlug: 'computer', slug: 'xarici-hdd', name: 'Xarici HDD' },
];

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

const OFFICIAL_IMAGE_BY_SKU: Record<string, string> = {
  TS1TESD410C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1319/PP_ESD410_1.png',
  TS2TESD410C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1319/PP_ESD410_1.png',
  TS500GESD380C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1223/list_ESD380C.png',
  TS1TESD380C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1223/list_ESD380C.png',
  TS2TESD380C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1223/list_ESD380C.png',
  TS500GESD265C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1317/PP_Front.png',
  TS1TESD265C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1317/PP_Front.png',
  TS512GESD310C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1299/Pp_ESD310C_01_2T.png',
  TS250GESD270C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1183/Pp_ESD270C_01.jpg',
  TS500GESD270C:
    'https://CDN.transcend-info.com/products/images/ModelPic/1183/Pp_ESD270C_01.jpg',
  TS1TSJ25M3S:
    'https://CDN.transcend-info.com/products/images/ModelPic/284/Pp_25M3S-1.png',
  TS1TSJ25M3G:
    'https://CDN.transcend-info.com/products/images/ModelPic/284/Pp_25M3G-1.png',
  TS2TSJ25M3S:
    'https://CDN.transcend-info.com/products/images/ModelPic/284/Pp_25M3S-1.png',
  TS2TSJ25M3G:
    'https://CDN.transcend-info.com/products/images/ModelPic/284/Pp_25M3G-1.png',
  TS1TSJ25H3B:
    'https://CDN.transcend-info.com/products/images/ModelPic/324/Productpic-2TSJ25H3B-1.jpg',
};

const PRODUCT_PAGE_BY_SKU: Record<string, string> = {
  TS1TESD410C: 'https://www.transcend-info.com/product/portable-ssd/esd410c',
  TS2TESD410C: 'https://www.transcend-info.com/product/portable-ssd/esd410c',
  TS500GESD380C: 'https://www.transcend-info.com/product/portable-ssd/esd380c',
  TS1TESD380C: 'https://www.transcend-info.com/product/portable-ssd/esd380c',
  TS2TESD380C: 'https://www.transcend-info.com/product/portable-ssd/esd380c',
  TS500GESD265C: 'https://www.transcend-info.com/product/portable-ssd/esd265c',
  TS1TESD265C: 'https://www.transcend-info.com/product/portable-ssd/esd265c',
  TS512GESD310C: 'https://www.transcend-info.com/product/portable-ssd/esd310',
  TS250GESD270C: 'https://www.transcend-info.com/product/portable-ssd/esd270c',
  TS500GESD270C: 'https://www.transcend-info.com/product/portable-ssd/esd270c',
  TS1TSJ25M3S:
    'https://www.transcend-info.com/product/external-hard-drive/storejet-25m3',
  TS1TSJ25M3G:
    'https://www.transcend-info.com/product/external-hard-drive/storejet-25m3',
  TS2TSJ25M3S:
    'https://www.transcend-info.com/product/external-hard-drive/storejet-25m3',
  TS2TSJ25M3G:
    'https://www.transcend-info.com/product/external-hard-drive/storejet-25m3',
  TS1TSJ25H3B:
    'https://www.transcend-info.com/product/external-hard-drive/storejet-25h3',
};

type ExcelRow = {
  excelRow: number;
  model: string;
  title: string;
  ean: string;
  productUrl: string;
  features: string;
  brand: string;
  costAzn: string;
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

function salePriceFromCost(cost: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(cost.mul('1.25').toFixed(2));
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

function cellHyperlink(sheet: ExcelSheet, address: string): string {
  const cell = sheet[address];
  if (cell === null || typeof cell !== 'object') {
    return '';
  }
  const link = (cell as { l?: { Target?: string } }).l?.Target?.trim() ?? '';
  return link;
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
    if (index < 2 || raw === undefined) {
      continue;
    }
    const brand = String(raw[0] ?? '').trim();
    const model = String(raw[1] ?? '').trim();
    const title = String(raw[2] ?? '').trim();
    if (brand === '' || model === '' || model === '-' || title === '') {
      continue;
    }
    rows.push({
      excelRow: index + 1,
      model,
      title,
      ean: String(raw[3] ?? '').trim(),
      productUrl: cellHyperlink(sheet, `E${index + 1}`),
      features: String(raw[9] ?? '')
        .replace(/\r\n/g, '\n')
        .trim(),
      brand,
      costAzn: String(raw[6] ?? '').trim(),
      mainCategory: String(raw[7] ?? '').trim(),
      subCategory: String(raw[8] ?? '').trim(),
    });
  }
  return rows;
}

async function unzipExcelEntries(): Promise<Map<string, Buffer>> {
  const dest = path.join(tmpdir(), `transcend-xlsx-${randomUUID()}`);
  await mkdir(dest, { recursive: true });
  try {
    const result = spawnSync(
      'unzip',
      [
        '-qq',
        '-o',
        EXCEL_PATH,
        'xl/media/*',
        'xl/drawings/*',
        'xl/drawings/_rels/*',
        '-d',
        dest,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      return new Map();
    }
    const entries = new Map<string, Buffer>();
    const drawingsDir = path.join(dest, 'xl/drawings');
    try {
      for (const fileName of await readdir(drawingsDir)) {
        const filePath = path.join(drawingsDir, fileName);
        entries.set(`xl/drawings/${fileName}`, await readFile(filePath));
      }
    } catch {
      return new Map();
    }
    const relsDir = path.join(dest, 'xl/drawings/_rels');
    try {
      for (const fileName of await readdir(relsDir)) {
        entries.set(
          `xl/drawings/_rels/${fileName}`,
          await readFile(path.join(relsDir, fileName)),
        );
      }
    } catch {
      // optional
    }
    const mediaDir = path.join(dest, 'xl/media');
    try {
      for (const fileName of await readdir(mediaDir)) {
        entries.set(
          `xl/media/${fileName}`,
          await readFile(path.join(mediaDir, fileName)),
        );
      }
    } catch {
      return new Map();
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

async function loadExcelEmbeddedImages(): Promise<Map<number, Buffer>> {
  const zip = await unzipExcelEntries();
  const images = new Map<number, Buffer>();
  const sizes = new Map<number, number>();
  const drawingFiles = [...zip.keys()].filter(
    (key) =>
      key.startsWith('xl/drawings/') &&
      key.endsWith('.xml') &&
      !key.includes('_rels'),
  );
  for (const drawingPath of drawingFiles) {
    const drawing = zip.get(drawingPath);
    const relsPath =
      drawingPath.replace('xl/drawings/', 'xl/drawings/_rels/') + '.rels';
    const rels = zip.get(relsPath);
    if (drawing === undefined || rels === undefined) {
      continue;
    }
    const ridToMedia = parseRelationshipTargets(rels.toString('utf8'));
    for (const anchor of parseDrawingAnchors(drawing.toString('utf8'))) {
      const mediaPath = ridToMedia.get(anchor.relationshipId);
      if (mediaPath === undefined) {
        continue;
      }
      const body = zip.get(mediaPath);
      if (body === undefined || body.byteLength < 100) {
        continue;
      }
      const previous = sizes.get(anchor.excelRow) ?? -1;
      if (body.byteLength > previous) {
        images.set(anchor.excelRow, body);
        sizes.set(anchor.excelRow, body.byteLength);
      }
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
  const inputPath = path.join(tmpdir(), `transcend-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `transcend-out-${randomUUID()}.jpg`);
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
    'https://www.transcend-info.com/',
    'https://www.icecat.biz/',
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

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
};

function curlImageBody(imageUrl: string): Buffer | null {
  const result = spawnSync(
    'curl',
    [
      '-fsSL',
      '-k',
      '-A',
      FETCH_HEADERS['User-Agent'],
      '-H',
      'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      '-H',
      'Referer: https://www.transcend-info.com/',
      '--max-time',
      '30',
      imageUrl,
    ],
    { maxBuffer: 15_000_000 },
  );
  if (result.status !== 0 || result.stdout === null) {
    return null;
  }
  const body = Buffer.isBuffer(result.stdout)
    ? result.stdout
    : Buffer.from(result.stdout);
  if (body.byteLength < 100) {
    return null;
  }
  try {
    sniffMime(body);
  } catch {
    return null;
  }
  return body;
}

async function fetchImageBody(imageUrl: string): Promise<Buffer | null> {
  const viaCurl = curlImageBody(imageUrl);
  if (viaCurl !== null) {
    return viaCurl;
  }
  for (const referer of referersFor(imageUrl)) {
    const headers: Record<string, string> = { ...FETCH_HEADERS };
    if (referer !== undefined) {
      headers.Referer = referer;
    }
    try {
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
    } catch {
      continue;
    }
  }
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

function firstHttpUrl(value: unknown): string | null {
  if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = firstHttpUrl(entry);
      if (nested !== null) {
        return nested;
      }
    }
  }
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = firstHttpUrl(nested);
      if (found !== null && /\.(jpe?g|png|webp)(\?|$)/i.test(found)) {
        return found;
      }
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = firstHttpUrl(nested);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

function icecatPreferredImage(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const data =
    root.data !== null && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;
  const image =
    data.Image !== null && typeof data.Image === 'object'
      ? (data.Image as Record<string, unknown>)
      : null;
  const preferred = [image?.HighPic, image?.Pic500x500, image?.LowPic];
  for (const candidate of preferred) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }
  return firstHttpUrl(data.Gallery ?? data.Image ?? payload);
}

async function icecatImageUrl(ean: string): Promise<string | null> {
  if (!/^\d{8,14}$/.test(ean)) {
    return null;
  }
  const url = `https://live.icecat.biz/api/?UserName=openIcecat-live&Language=en&GTIN=${ean}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': FETCH_HEADERS['User-Agent'],
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return icecatPreferredImage(payload);
  } catch {
    return null;
  }
}

function extractOgImage(html: string): string | null {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const url = match?.[1]?.trim();
    if (url !== undefined && /^https?:\/\//i.test(url)) {
      return url;
    }
  }
  return null;
}

async function productPageImageUrl(pageUrl: string): Promise<string | null> {
  if (pageUrl === '') {
    return null;
  }
  try {
    const response = await fetch(pageUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': FETCH_HEADERS['User-Agent'],
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    return extractOgImage(html);
  } catch {
    return null;
  }
}

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  if (imageUrl === '') {
    return null;
  }
  const body = await fetchImageBody(imageUrl);
  if (body === null) {
    process.stderr.write(`Image download failed: ${imageUrl}\n`);
    return null;
  }
  return saveCatalogImage(body, imageUrl);
}

async function resolveProductImage(input: {
  excelRow: number;
  sku: string;
  ean: string;
  productUrl: string;
  embedded: Map<number, Buffer>;
}): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  const embedded = input.embedded.get(input.excelRow);
  if (embedded !== undefined) {
    const saved = await saveCatalogImage(embedded, `excel:${input.sku}`);
    if (saved !== null) {
      return saved;
    }
  }

  const official = OFFICIAL_IMAGE_BY_SKU[input.sku];
  if (official !== undefined) {
    const saved = await downloadImage(official);
    if (saved !== null) {
      return saved;
    }
  }

  const icecat = await icecatImageUrl(input.ean);
  if (icecat !== null) {
    const saved = await downloadImage(icecat);
    if (saved !== null) {
      return saved;
    }
  }

  const pageUrl = input.productUrl || (PRODUCT_PAGE_BY_SKU[input.sku] ?? '');
  const ogImage = await productPageImageUrl(pageUrl);
  if (ogImage !== null) {
    const saved = await downloadImage(ogImage);
    if (saved !== null) {
      return saved;
    }
  }

  process.stderr.write(`no image for ${input.sku}\n`);
  return null;
}

function assertSku(model: string): string {
  const sku = normalizeTranscendSku(model);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model} → ${sku}`);
  }
  return sku;
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'transcend' },
    select: { id: true, name: true, status: true },
  });
  if (existing !== null) {
    if (
      existing.status !== CatalogStatus.ACTIVE ||
      existing.name !== 'Transcend'
    ) {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { name: 'Transcend', status: CatalogStatus.ACTIVE },
      });
    }
    return { id: existing.id, name: 'Transcend' };
  }
  return prisma.brand.create({
    data: {
      name: 'Transcend',
      slug: 'transcend',
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
      select: { id: true, parentId: true, status: true, name: true },
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
    if (
      existing.status !== CatalogStatus.ACTIVE ||
      existing.name !== entry.name
    ) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name: entry.name, status: CatalogStatus.ACTIVE },
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

async function barcodeIfAvailable(
  prisma: PrismaClient,
  barcode: string | null,
  variantId: string | null,
): Promise<string | null> {
  if (barcode === null) {
    return null;
  }
  const clash = await prisma.productVariant.findFirst({
    where: {
      barcode,
      status: CatalogStatus.ACTIVE,
      ...(variantId === null ? {} : { id: { not: variantId } }),
    },
    select: { id: true },
  });
  if (clash !== null) {
    process.stderr.write(`barcode already used, skipped: ${barcode}\n`);
    return null;
  }
  return barcode;
}

async function importTranscendProducts(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = readExcelRows();
  if (rows.length === 0) {
    throw new Error('No product rows found in Excel');
  }

  const embeddedImages = await loadExcelEmbeddedImages();
  process.stdout.write(
    `Excel embedded images: ${String(embeddedImages.size)}\n`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const brand = await ensureBrand(prisma);
    const categoryBySlug = await ensureSubcategories(prisma);

    for (const row of rows) {
      if (row.brand.toUpperCase() !== 'TRANSCEND') {
        throw new Error(`Unexpected brand for ${row.model}: ${row.brand}`);
      }

      if (row.costAzn === '') {
        process.stderr.write(`skipped ${row.model}: missing cost price\n`);
        skipped += 1;
        continue;
      }

      const sku = assertSku(row.model);
      const { subcategorySlug } = resolveCategorySlugs(
        row.mainCategory,
        row.subCategory,
      );
      const categoryId = categoryBySlug.get(subcategorySlug);
      if (categoryId === undefined) {
        throw new Error(`Category id missing for ${subcategorySlug}`);
      }

      const specs = parseSpecs(row.features);
      const productName = resolveTranscendCatalogName(sku, row.title);
      const seo = resolveTranscendProductSeo({
        sku,
        title: productName,
        specs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const cost = parseMoney(row.costAzn);
      const price = salePriceFromCost(cost);
      const productSlugBase = slugifyCatalogLabel(`transcend ${sku}`);
      let productSlug = productSlugBase;
      const barcode = normalizeVariantBarcode(row.ean);

      const skuSpecs = specs.filter(
        (entry) => entry.label.trim().toLocaleLowerCase('az') !== 'sürət',
      );
      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel: sku,
        specs: skuSpecs,
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

      const existingMedia =
        existingVariant === null
          ? null
          : await prisma.productMedia.findFirst({
              where: { productId: existingVariant.productId },
              orderBy: { sortOrder: 'asc' },
              select: { id: true },
            });
      const media =
        existingMedia === null
          ? await resolveProductImage({
              excelRow: row.excelRow,
              sku,
              ean: row.ean,
              productUrl: row.productUrl,
              embedded: embeddedImages,
            })
          : null;

      const nextBarcode = await barcodeIfAvailable(
        prisma,
        barcode,
        existingVariant?.id ?? null,
      );

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: sku,
              description: buildTranscendProductDescription(
                seo.pageIntro,
                specs,
              ),
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
              sku: generatedSku,
              name: sku,
              attributes,
              price,
              cost,
              currency: 'AZN',
              status: CatalogStatus.ACTIVE,
              availableByOrder: true,
              ...(nextBarcode !== null ? { barcode: nextBarcode } : {}),
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
            name: sku,
            slug: productSlug,
            description: buildTranscendProductDescription(seo.pageIntro, specs),
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
            barcode: nextBarcode,
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
      `\nDone. created=${created} updated=${updated} skipped=${skipped} totalRows=${rows.length}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void importTranscendProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
