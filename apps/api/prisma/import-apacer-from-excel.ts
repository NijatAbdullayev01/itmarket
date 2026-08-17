/**
 * One-shot import: Apacer products from apacer.xlsx
 * Maya AZN → variant.cost; Satış qiyməti AZN (+25%) → variant.price
 * Variants are created with availableByOrder=true (sifarişlə).
 *
 * Identity is the Apacer part number (slash folded to hyphen).
 * The shared AP1TBAS2280Q4U5-1 PS5 row uses identity AS2280Q4U-1TB-PS5.
 * Rows without cost or sale price are skipped.
 * Photos prefer the Excel URL (Apacer CDN), then the embedded row image.
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
  normalizeApacerSku,
  resolveApacerCatalogName,
  resolveApacerIdentitySku,
} from '../src/catalog/apacer-product-name';
import {
  buildApacerProductDescription,
  resolveApacerProductSeo,
} from '../src/catalog/apacer-product-seo';

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

const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'apacer.xlsx');

const PARENT_SLUG_BY_LABEL: Record<string, string> = {
  'komputer ve komponentleri': 'computer',
  'gamer zona': 'gamer-zona',
};

const SUB_SLUG_BY_PARENT_AND_LABEL: Record<string, Record<string, string>> = {
  'komputer ve komponentleri': {
    'ddr4 ram': 'ddr4-ram',
    'm2 nvme ssd': 'm2-nvme-ssd',
    'm 2 nvme ssd': 'm2-nvme-ssd',
    'usb flash': 'usb-flash',
    'xarici ssd': 'xarici-ssd',
    'xarici hdd': 'xarici-hdd',
  },
  'gamer zona': {
    'gaming ssd': 'gaming-ssd',
  },
};

const PARENTS_TO_ENSURE: Array<{ slug: string; name: string }> = [
  { slug: 'computer', name: 'Kompüter və komponentləri' },
  { slug: 'gamer-zona', name: 'Gamer zona' },
];

const SUBCATEGORIES_TO_ENSURE: Array<{
  parentSlug: string;
  slug: string;
  name: string;
}> = [
  { parentSlug: 'computer', slug: 'ddr4-ram', name: 'DDR4 RAM' },
  { parentSlug: 'computer', slug: 'm2-nvme-ssd', name: 'M.2 NVMe SSD' },
  { parentSlug: 'computer', slug: 'usb-flash', name: 'USB flash' },
  { parentSlug: 'computer', slug: 'xarici-ssd', name: 'Xarici SSD' },
  { parentSlug: 'computer', slug: 'xarici-hdd', name: 'Xarici HDD' },
  { parentSlug: 'gamer-zona', slug: 'gaming-ssd', name: 'Gaming SSD' },
];

const SKIP_SPEC_LABELS = new Set([
  'brend',
  'status',
  'kateqoriya',
  'əsas kateqoriya',
  'esas kateqoriya',
  'alt kateqoriya',
  'mənbə',
  'menbe',
  'sku',
  'sku qeyd',
  'ean',
  'part number',
  'part nomresi',
  'part nömrəsi',
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

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
};

const BRAND_LOGO_URLS = [
  'https://cdn.worldvectorlogo.com/logos/apacer.svg',
  'https://www.apacer.com/upload/media/common/logo/apacer_logo.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Apacer_logo.svg/320px-Apacer_logo.svg.png',
];

type ExcelRow = {
  excelRow: number;
  sku: string;
  partNumber: string;
  title: string;
  features: string;
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
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Invalid money value: ${value}`);
  }
  return new Prisma.Decimal(amount.toFixed(2));
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
    if (
      SKIP_SPEC_LABELS.has(key) ||
      SKIP_SPEC_LABELS.has(label.toLocaleLowerCase('az'))
    ) {
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

function isHttpImageUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }
  if (/\.pdf(?:[?#]|$)/i.test(value)) {
    return false;
  }
  return true;
}

function extractImageUrl(value: string): string {
  const match = value.match(/https?:\/\/[^\s|]+/i);
  const url = match?.[0]?.replace(/[),.;]+$/g, '') ?? '';
  return isHttpImageUrl(url) ? url : '';
}

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\r\n/g, '\n').trim();
}

function readExcelRows(): ExcelRow[] {
  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const sheetName = workbook.SheetNames.includes('Kataloq')
    ? 'Kataloq'
    : workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('Excel sheet missing');
  }
  const sheet = workbook.Sheets[sheetName];
  if (sheet === undefined) {
    throw new Error('Excel sheet missing');
  }
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  const rows: ExcelRow[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of matrix.entries()) {
    if (index < 3 || raw === undefined) {
      continue;
    }
    const partNumber = cellText(raw[4]);
    const title = cellText(raw[5]);
    if (partNumber === '' || title === '') {
      continue;
    }
    const sku = resolveApacerIdentitySku(partNumber, title);
    if (sku === '') {
      continue;
    }
    const costAzn = cellText(raw[9]);
    const salePriceAzn = cellText(raw[10]);
    if (costAzn === '' || salePriceAzn === '') {
      process.stderr.write(`skipped ${sku}: missing price\n`);
      continue;
    }
    if (seen.has(sku)) {
      process.stderr.write(`skipped duplicate identity ${sku}\n`);
      continue;
    }
    seen.add(sku);
    rows.push({
      excelRow: index + 1,
      sku,
      partNumber,
      title,
      features: cellText(raw[6]),
      costAzn,
      salePriceAzn,
      imageUrl: extractImageUrl(cellText(raw[12])),
      mainCategory: cellText(raw[2]),
      subCategory: cellText(raw[3]),
    });
  }
  return rows;
}

function assertSku(model: string): string {
  const sku = normalizeApacerSku(model);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model}`);
  }
  return sku;
}

function ensurePartNumberSpec(
  specs: Array<{ label: string; value: string }>,
  sku: string,
): Array<{ label: string; value: string }> {
  const hasPart = specs.some((entry) => {
    const label = entry.label.toLocaleLowerCase('az');
    return label === 'part number' || label === 'part nömrəsi';
  });
  if (hasPart) {
    return specs;
  }
  return [{ label: 'Part number', value: sku }, ...specs];
}

async function unzipCatalogEntries(): Promise<Map<string, Buffer>> {
  const dest = path.join(tmpdir(), `apacer-catalog-${randomUUID()}`);
  await mkdir(dest, { recursive: true });
  try {
    const result = spawnSync('unzip', ['-qq', '-o', EXCEL_PATH, '-d', dest], {
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(
        `Catalog Excel unzip failed: ${result.stderr || result.error?.message || 'unknown'}`,
      );
    }
    const entries = new Map<string, Buffer>();
    const drawingsDir = path.join(dest, 'xl/drawings');
    try {
      for (const entry of await readdir(drawingsDir, { withFileTypes: true })) {
        if (!entry.isFile()) {
          continue;
        }
        entries.set(
          `xl/drawings/${entry.name}`,
          await readFile(path.join(drawingsDir, entry.name)),
        );
      }
    } catch {
      // optional
    }
    const relsDir = path.join(dest, 'xl/drawings/_rels');
    try {
      for (const entry of await readdir(relsDir, { withFileTypes: true })) {
        if (!entry.isFile()) {
          continue;
        }
        entries.set(
          `xl/drawings/_rels/${entry.name}`,
          await readFile(path.join(relsDir, entry.name)),
        );
      }
    } catch {
      // optional
    }
    const mediaDir = path.join(dest, 'xl/media');
    try {
      for (const entry of await readdir(mediaDir, { withFileTypes: true })) {
        if (!entry.isFile()) {
          continue;
        }
        entries.set(
          `xl/media/${entry.name}`,
          await readFile(path.join(mediaDir, entry.name)),
        );
      }
    } catch {
      // optional
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
    targets.set(
      idMatch[1]!,
      targetMatch[1]!.replace(/^\.\.\//, 'xl/').replace(/^\//, ''),
    );
  }
  return targets;
}

function parseDrawingAnchors(
  drawingXml: string,
): Array<{ excelRow: number; relationshipId: string }> {
  const anchors: Array<{ excelRow: number; relationshipId: string }> = [];
  const patterns = [
    /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>[\s\S]*?r:embed="(rId\d+)"/g,
    /<from>[\s\S]*?<row>(\d+)<\/row>[\s\S]*?<\/from>[\s\S]*?r:embed="(rId\d+)"/g,
  ];
  for (const pattern of patterns) {
    for (const match of drawingXml.matchAll(pattern)) {
      anchors.push({
        excelRow: Number(match[1]) + 1,
        relationshipId: match[2]!,
      });
    }
    if (anchors.length > 0) {
      break;
    }
  }
  return anchors;
}

async function loadEmbeddedImages(
  rows: readonly ExcelRow[],
): Promise<Map<string, Buffer>> {
  const zip = await unzipCatalogEntries();
  const skuByRow = new Map<number, string>();
  for (const row of rows) {
    skuByRow.set(row.excelRow, row.sku);
  }
  const images = new Map<string, Buffer>();
  const drawingFiles = [...zip.keys()].filter(
    (key) =>
      key.startsWith('xl/drawings/') &&
      key.endsWith('.xml') &&
      !key.includes('_rels'),
  );
  for (const drawingPath of drawingFiles) {
    const drawing = zip.get(drawingPath);
    const relsPath = `${drawingPath.replace('xl/drawings/', 'xl/drawings/_rels/')}.rels`;
    const rels = zip.get(relsPath);
    if (drawing === undefined || rels === undefined) {
      continue;
    }
    const ridToMedia = parseRelationshipTargets(rels.toString('utf8'));
    for (const anchor of parseDrawingAnchors(drawing.toString('utf8'))) {
      const sku = skuByRow.get(anchor.excelRow);
      const mediaPath = ridToMedia.get(anchor.relationshipId);
      if (sku === undefined || mediaPath === undefined || images.has(sku)) {
        continue;
      }
      const body = zip.get(mediaPath);
      if (body === undefined || body.byteLength < 100) {
        continue;
      }
      images.set(sku, body);
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
  const inputPath = path.join(tmpdir(), `apacer-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `apacer-out-${randomUUID()}.jpg`);
  await writeFile(inputPath, body);
  try {
    const result = spawnSync(
      'convert',
      [
        inputPath,
        '-alpha',
        'on',
        '-fuzz',
        '6%',
        '-trim',
        '+repage',
        '-resize',
        '984x984',
        '-background',
        '#FFFFFF',
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-gravity',
        'center',
        '-extent',
        '1200x1200',
        '-strip',
        '-quality',
        '86',
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
    'https://icecat.biz/',
    'https://images.icecat.biz/',
    'https://www.apacer.com/',
    'https://media.apacer.com/',
    'https://cdn.worldvectorlogo.com/',
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
      if (body.subarray(0, 4).toString('ascii') === '%PDF') {
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
  raw: Buffer,
  kind: 'catalog' | 'brands' = 'catalog',
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  let framed = await compressCatalogImage(raw);
  if (framed === null) {
    try {
      const mimeType = sniffMime(raw);
      framed = { body: raw, mimeType };
    } catch {
      return null;
    }
  }
  const objectKey = `/images/${kind}/${randomUUID()}.${extensionForMime(framed.mimeType)}`;
  const fileName = path.basename(objectKey);
  const directories = [
    path.join(WORKSPACE_ROOT, `apps/storefront/public/images/${kind}`),
    path.join(WORKSPACE_ROOT, `apps/backoffice/public/images/${kind}`),
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
  }
  const primary = path.join(directories[0]!, fileName);
  await writeFile(primary, framed.body);
  await copyFile(primary, path.join(directories[1]!, fileName));
  return {
    objectKey,
    mimeType: framed.mimeType,
    byteSize: framed.body.byteLength,
  };
}

async function resolveProductImage(
  imageUrl: string,
  sku: string,
  embedded: Buffer | undefined,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  const candidates = [imageUrl].filter(
    (url) => url !== '' && isHttpImageUrl(url),
  );
  for (const candidate of candidates) {
    const remote = await fetchImageBody(candidate);
    if (remote === null) {
      continue;
    }
    const saved = await saveCatalogImage(remote);
    if (saved !== null) {
      return saved;
    }
  }
  if (embedded !== undefined) {
    const saved = await saveCatalogImage(embedded);
    if (saved !== null) {
      return saved;
    }
  }
  if (imageUrl !== '') {
    process.stderr.write(`Image missing: ${sku} ${imageUrl}\n`);
  } else {
    process.stderr.write(`Image missing: ${sku}\n`);
  }
  return null;
}

function extractEan(features: string): string | null {
  const match = features.match(/^EAN:\s*(\d{8,14})\s*$/im);
  if (match === null) {
    return null;
  }
  return match[1] ?? null;
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

async function attachBrandLogoIfMissing(
  prisma: PrismaClient,
  brandId: string,
  logoObjectKey: string | null,
): Promise<void> {
  if (logoObjectKey !== null && logoObjectKey !== '') {
    return;
  }
  for (const url of BRAND_LOGO_URLS) {
    const body = await fetchImageBody(url);
    if (body === null) {
      continue;
    }
    const logo = await saveCatalogImage(body, 'brands');
    if (logo === null) {
      continue;
    }
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        logoObjectKey: logo.objectKey,
        logoMimeType: logo.mimeType,
        logoByteSize: logo.byteSize,
      },
    });
    return;
  }
  process.stderr.write('Apacer brand logo download failed\n');
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'apacer' },
    select: {
      id: true,
      name: true,
      status: true,
      logoObjectKey: true,
    },
  });
  if (existing === null) {
    const created = await prisma.brand.create({
      data: {
        name: 'Apacer',
        slug: 'apacer',
        status: CatalogStatus.ACTIVE,
      },
      select: { id: true, name: true, logoObjectKey: true },
    });
    await attachBrandLogoIfMissing(prisma, created.id, created.logoObjectKey);
    return { id: created.id, name: 'Apacer' };
  }
  if (
    existing.status !== CatalogStatus.ACTIVE ||
    existing.name !== 'Apacer'
  ) {
    await prisma.brand.update({
      where: { id: existing.id },
      data: { name: 'Apacer', status: CatalogStatus.ACTIVE },
    });
  }
  await attachBrandLogoIfMissing(prisma, existing.id, existing.logoObjectKey);
  return { id: existing.id, name: 'Apacer' };
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
      select: { id: true },
    });
    if (category === null) {
      throw new Error(`Subcategory missing: ${entry.slug}`);
    }
    categoryBySlug.set(entry.slug, category.id);
  }
  return categoryBySlug;
}

async function importApacerProducts(): Promise<void> {
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
  let skipped = 0;
  let withMedia = 0;

  try {
    const brand = await ensureBrand(prisma);
    const categoryBySlug = await ensureSubcategories(prisma);
    const embeddedImages = await loadEmbeddedImages(rows);
    process.stdout.write(
      `Excel rows=${String(rows.length)} embedded images=${String(embeddedImages.size)}\n`,
    );

    for (const row of rows) {
      const { subcategorySlug } = resolveCategorySlugs(
        row.mainCategory,
        row.subCategory,
      );
      const categoryId = categoryBySlug.get(subcategorySlug);
      if (categoryId === undefined) {
        throw new Error(`Category id missing for ${subcategorySlug}`);
      }

      const sku = assertSku(row.sku);
      const specs = ensurePartNumberSpec(
        parseSpecs(row.features),
        row.partNumber || sku,
      );
      const productName = resolveApacerCatalogName(sku, row.title);
      const seo = resolveApacerProductSeo({
        sku,
        title: productName,
        specs,
        subcategorySlug,
      });
      const warrantyMonths = parseWarrantyMonths(row.features);
      const price = parseMoney(row.salePriceAzn);
      const cost = parseMoney(row.costAzn);
      const productSlugBase = slugifyCatalogLabel(`apacer ${sku}`);
      let productSlug = productSlugBase;

      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel: sku,
        specs: [],
        includePhoneTabletVariantAttributes: false,
      });
      const skuClash = await prisma.productVariant.findUnique({
        where: { sku: generatedSku },
        select: {
          id: true,
          product: { select: { brandId: true } },
        },
      });
      if (skuClash !== null && skuClash.product.brandId !== brand.id) {
        process.stderr.write(
          `skipped ${sku}: SKU ${generatedSku} belongs to another brand\n`,
        );
        skipped += 1;
        continue;
      }

      let existingVariant = await findExistingImportedVariant(prisma, {
        brandId: brand.id,
        manufacturerModel: sku,
        generatedSku,
      });
      if (existingVariant === null) {
        const byCatalogName = await prisma.product.findFirst({
          where: { brandId: brand.id, name: productName },
          select: {
            id: true,
            variants: {
              select: { id: true },
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (byCatalogName?.variants[0] !== undefined) {
          existingVariant = {
            id: byCatalogName.variants[0].id,
            productId: byCatalogName.id,
          };
        }
      }

      const attributes: Record<string, string> = {
        Model: row.partNumber || sku,
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
              select: { id: true },
            });
      const media =
        existingMedia === null
          ? await resolveProductImage(
              row.imageUrl,
              sku,
              embeddedImages.get(sku),
            )
          : null;
      if (media !== null) {
        withMedia += 1;
      }

      const nextBarcode = await barcodeIfAvailable(
        prisma,
        normalizeVariantBarcode(extractEan(row.features)),
        existingVariant?.id ?? null,
      );

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: productName,
              description: buildApacerProductDescription(
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
              name: 'Standart',
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
            name: productName,
            slug: productSlug,
            description: buildApacerProductDescription(seo.pageIntro, specs),
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
      `\nDone. created=${String(created)} updated=${String(updated)} skipped=${String(skipped)} media=${String(withMedia)} totalRows=${String(rows.length)}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void importApacerProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
