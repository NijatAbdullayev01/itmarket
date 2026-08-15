/**
 * One-shot import: AKASO products from Akaso Q2 '26.xlsx
 * Dealer cost (H) → variant.cost; sale = ROUND(cost × 1.25, 2) → variant.price
 * Variants are created with availableByOrder=true (sifarişlə).
 *
 * Safety: never overwrites a SKU that already belongs to another brand.
 * Existing AKASO rows are updated in place; media is added only when missing.
 * Product photos: official AKASO cutout (when mapped), then Excel embedded images.
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
import {
  normalizeAkasoSku,
  resolveAkasoCatalogName,
} from '../src/catalog/akaso-product-name';
import {
  buildAkasoProductDescription,
  resolveAkasoProductSeo,
} from '../src/catalog/akaso-product-seo';

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

const EXCEL_PATH = path.join(WORKSPACE_ROOT, "Akaso Q2 '26.xlsx");
const PRODUCTS_SHEET = 'Məhsullar';

const PARENT_SLUG_BY_LABEL: Record<string, string> = {
  'kamera ve foto': 'kamera-foto',
};

const SUB_SLUG_BY_PARENT_AND_LABEL: Record<string, Record<string, string>> = {
  'kamera ve foto': {
    '360 kamera': '360-kamera',
    'eksn kamera': 'ekshn-kamera',
  },
};

const SUBCATEGORIES_TO_ENSURE: Array<{
  parentSlug: string;
  slug: string;
  name: string;
}> = [
  { parentSlug: 'kamera-foto', slug: '360-kamera', name: '360° kamera' },
  { parentSlug: 'kamera-foto', slug: 'ekshn-kamera', name: 'Ekşn kamera' },
];

const SPEC_COLUMNS: Array<{ index: number; label: string }> = [
  { index: 10, label: 'Sensor / linza' },
  { index: 11, label: 'Video' },
  { index: 12, label: 'Foto' },
  { index: 13, label: 'Stabilizasiya' },
  { index: 14, label: 'Ekran' },
  { index: 15, label: 'Su keçirməzlik' },
  { index: 16, label: 'Batareya' },
  { index: 17, label: 'Yaddaş kartı' },
  { index: 18, label: 'Bağlantı və tətbiq' },
  { index: 19, label: 'Əlavə xüsusiyyətlər' },
  { index: 4, label: 'Qablaşdırmada' },
];

const OFFICIAL_IMAGES_BY_SKU: Record<string, string[]> = {
  'BRAVE-4-PRO-SPORT-COMBO': [
    'https://www.akasotech.com/imageApi/support/product_pictures/minb4pro.png',
  ],
  'BRAVE-4': [
    'https://www.akasotech.com/imageApi/support/product_pictures/minb4.png',
  ],
};

const BRAND_LOGO_URL =
  'https://www.akasotech.com/_nuxt/img/akaso_logo_black_new.4d592f8.png';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
  Referer: 'https://www.akasotech.com/',
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

type ExcelRow = {
  excelRow: number;
  model: string;
  brand: string;
  costAzn: string;
  mainCategory: string;
  subCategory: string;
  specs: Array<{ label: string; value: string }>;
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

function normalizeCategoryKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .split('')
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, '')
    .replace(/\s+/g, ' ')
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

function cellText(
  raw: Array<string | null> | undefined,
  index: number,
): string {
  return String(raw?.[index] ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function readProductsSheet(): ExcelSheet {
  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const sheet =
    workbook.Sheets[PRODUCTS_SHEET] ?? workbook.Sheets[workbook.SheetNames[1]!];
  if (sheet === undefined) {
    throw new Error('Excel Məhsullar sheet missing');
  }
  return sheet;
}

function readExcelRows(): ExcelRow[] {
  const matrix = XLSX.utils.sheet_to_json<(string | null)[]>(
    readProductsSheet(),
    {
      header: 1,
      defval: null,
      raw: false,
    },
  );
  const rows: ExcelRow[] = [];
  for (const [index, raw] of matrix.entries()) {
    if (index === 0 || raw === undefined) {
      continue;
    }
    const model = cellText(raw, 0);
    if (model === '' || /^cəmi$/i.test(model)) {
      continue;
    }
    const specs: Array<{ label: string; value: string }> = [];
    for (const column of SPEC_COLUMNS) {
      const value = cellText(raw, column.index);
      if (value === '') {
        continue;
      }
      specs.push({ label: column.label, value });
    }
    rows.push({
      excelRow: index + 1,
      model,
      brand: cellText(raw, 3),
      costAzn: cellText(raw, 7),
      mainCategory: cellText(raw, 1),
      subCategory: cellText(raw, 2),
      specs,
    });
  }
  return rows;
}

async function unzipCatalogEntries(): Promise<Map<string, Buffer>> {
  const dest = path.join(tmpdir(), `akaso-catalog-${randomUUID()}`);
  await mkdir(dest, { recursive: true });
  try {
    const result = spawnSync(
      'unzip',
      [
        '-qq',
        '-o',
        EXCEL_PATH,
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
        `Catalog Excel unzip failed: ${result.stderr || result.error?.message || 'unknown'}`,
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
    const normalized = targetMatch[1]!
      .replace(/^\//, '')
      .replace(/^\.\.\//, 'xl/');
    targets.set(idMatch[1]!, normalized);
  }
  return targets;
}

function parseDrawingAnchors(
  drawingXml: string,
): Array<{ excelRow: number; colOff: number; relationshipId: string }> {
  const anchors: Array<{
    excelRow: number;
    colOff: number;
    relationshipId: string;
  }> = [];
  const pattern =
    /<(?:xdr:)?(?:twoCell|oneCell|absolute)Anchor\b[\s\S]*?<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?colOff>(\d+)<\/(?:xdr:)?colOff>[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>[\s\S]*?<\/(?:xdr:)?from>[\s\S]*?r:embed="(rId\d+)"/g;
  for (const match of drawingXml.matchAll(pattern)) {
    anchors.push({
      colOff: Number(match[1]),
      excelRow: Number(match[2]) + 1,
      relationshipId: match[3]!,
    });
  }
  return anchors;
}

function readSkuByExcelRow(): Map<number, string> {
  const skuByRow = new Map<number, string>();
  for (const row of readExcelRows()) {
    skuByRow.set(row.excelRow, normalizeAkasoSku(row.model));
  }
  return skuByRow;
}

async function loadEmbeddedImages(): Promise<Map<string, Buffer[]>> {
  const zip = await unzipCatalogEntries();
  const rels = zip.get('xl/drawings/_rels/drawing1.xml.rels');
  const drawing = zip.get('xl/drawings/drawing1.xml');
  if (rels === undefined || drawing === undefined) {
    throw new Error('Catalog Excel drawings missing');
  }
  const ridToMedia = parseRelationshipTargets(rels.toString('utf8'));
  const skuByRow = readSkuByExcelRow();
  const grouped = new Map<string, Array<{ colOff: number; body: Buffer }>>();
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
    const list = grouped.get(sku) ?? [];
    list.push({ colOff: anchor.colOff, body });
    grouped.set(sku, list);
  }
  const images = new Map<string, Buffer[]>();
  for (const [sku, list] of grouped) {
    list.sort((left, right) => left.colOff - right.colOff);
    images.set(
      sku,
      list.map((entry) => entry.body),
    );
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
  const inputPath = path.join(tmpdir(), `akaso-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `akaso-out-${randomUUID()}.jpg`);
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

async function saveCatalogImage(
  body: Buffer,
  sourceLabel: string,
  kind: 'catalog' | 'brands' = 'catalog',
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
  const objectKey = `/images/${kind}/${randomUUID()}.${extensionForMime(mimeType)}`;
  const fileName = path.basename(objectKey);
  const directories = [
    path.join(WORKSPACE_ROOT, `apps/storefront/public/images/${kind}`),
    path.join(WORKSPACE_ROOT, `apps/backoffice/public/images/${kind}`),
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
  }
  const primary = path.join(directories[0]!, fileName);
  await writeFile(primary, imageBody);
  await copyFile(primary, path.join(directories[1]!, fileName));
  return { objectKey, mimeType, byteSize: imageBody.byteLength };
}

async function fetchImageBody(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl, {
      redirect: 'follow',
      headers: FETCH_HEADERS,
    });
    if (!response.ok) {
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength < 100 || body.byteLength > 15_000_000) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

async function downloadImage(
  imageUrl: string,
): Promise<{ objectKey: string; mimeType: string; byteSize: number } | null> {
  const body = await fetchImageBody(imageUrl);
  if (body === null) {
    process.stderr.write(`Image download failed: ${imageUrl}\n`);
    return null;
  }
  return saveCatalogImage(body, imageUrl);
}

async function resolveProductImages(
  sku: string,
  embedded: Map<string, Buffer[]>,
): Promise<Array<{ objectKey: string; mimeType: string; byteSize: number }>> {
  const saved: Array<{
    objectKey: string;
    mimeType: string;
    byteSize: number;
  }> = [];
  for (const [index, url] of (OFFICIAL_IMAGES_BY_SKU[sku] ?? []).entries()) {
    const media = await downloadImage(url);
    if (media !== null) {
      saved.push(media);
    } else {
      process.stderr.write(`official image skipped ${sku} #${String(index)}\n`);
    }
  }
  for (const [index, body] of (embedded.get(sku) ?? []).entries()) {
    const media = await saveCatalogImage(body, `catalog-excel:${sku}:${index}`);
    if (media !== null) {
      saved.push(media);
    }
  }
  return saved;
}

function assertSku(model: string): string {
  const sku = normalizeAkasoSku(model);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
    throw new Error(`Invalid SKU: ${model} → ${sku}`);
  }
  return sku;
}

async function ensureBrand(
  prisma: PrismaClient,
): Promise<{ id: string; name: string }> {
  const existing = await prisma.brand.findUnique({
    where: { slug: 'akaso' },
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
        name: 'AKASO',
        slug: 'akaso',
        status: CatalogStatus.ACTIVE,
      },
      select: { id: true, name: true, logoObjectKey: true },
    });
    await attachBrandLogoIfMissing(prisma, created.id, created.logoObjectKey);
    return { id: created.id, name: 'AKASO' };
  }
  if (existing.status !== CatalogStatus.ACTIVE || existing.name !== 'AKASO') {
    await prisma.brand.update({
      where: { id: existing.id },
      data: { name: 'AKASO', status: CatalogStatus.ACTIVE },
    });
  }
  await attachBrandLogoIfMissing(prisma, existing.id, existing.logoObjectKey);
  return { id: existing.id, name: 'AKASO' };
}

async function attachBrandLogoIfMissing(
  prisma: PrismaClient,
  brandId: string,
  logoObjectKey: string | null,
): Promise<void> {
  if (logoObjectKey !== null && logoObjectKey !== '') {
    return;
  }
  const body = await fetchImageBody(BRAND_LOGO_URL);
  if (body === null) {
    process.stderr.write('AKASO brand logo download failed\n');
    return;
  }
  const logo = await saveCatalogImage(body, 'akaso-brand-logo', 'brands');
  if (logo === null) {
    return;
  }
  await prisma.brand.update({
    where: { id: brandId },
    data: {
      logoObjectKey: logo.objectKey,
      logoMimeType: logo.mimeType,
      logoByteSize: logo.byteSize,
    },
  });
}

async function ensureSubcategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
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

async function importAkasoProducts(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = readExcelRows();
  if (rows.length === 0) {
    throw new Error('No product rows found in Excel');
  }

  const embeddedImages = await loadEmbeddedImages();
  process.stdout.write(
    `Catalog Excel embedded image groups: ${String(embeddedImages.size)}\n`,
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
      if (row.brand.toUpperCase() !== 'AKASO') {
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

      const specs = row.specs;
      const productName = resolveAkasoCatalogName(sku, row.model);
      const seo = resolveAkasoProductSeo({
        sku,
        title: productName,
        specs,
        subcategorySlug,
      });
      const cost = parseMoney(row.costAzn);
      const price = salePriceFromCost(cost);
      const productSlugBase = slugifyCatalogLabel(`akaso ${sku}`);
      let productSlug = productSlugBase;

      const generatedSku = generateCatalogImportSku({
        brandName: brand.name,
        manufacturerModel: sku,
        specs: [],
        includePhoneTabletVariantAttributes: false,
      });
      const existingVariant = await findExistingImportedVariant(prisma, {
        brandId: brand.id,
        manufacturerModel: productName,
        generatedSku,
      });

      const attributes: Record<string, string> = { Model: sku };
      for (const spec of specs.slice(0, 12)) {
        if (!(spec.label in attributes)) {
          attributes[spec.label] = spec.value;
        }
      }

      const existingMediaCount =
        existingVariant === null
          ? 0
          : await prisma.productMedia.count({
              where: { productId: existingVariant.productId },
            });
      const mediaList =
        existingMediaCount === 0
          ? await resolveProductImages(sku, embeddedImages)
          : [];

      if (existingVariant !== null) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existingVariant.productId },
            data: {
              categoryId,
              brandId: brand.id,
              name: productName,
              description: buildAkasoProductDescription(seo.pageIntro, specs),
              warrantyMonths: 12,
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
            },
          });
          const currentMediaCount = await tx.productMedia.count({
            where: { productId: existingVariant.productId },
          });
          if (currentMediaCount === 0) {
            for (const [sortOrder, media] of mediaList.entries()) {
              await tx.productMedia.create({
                data: {
                  productId: existingVariant.productId,
                  objectKey: media.objectKey,
                  mimeType: media.mimeType,
                  byteSize: media.byteSize,
                  altText: productName,
                  sortOrder,
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
            description: buildAkasoProductDescription(seo.pageIntro, specs),
            warrantyMonths: 12,
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

        for (const [sortOrder, media] of mediaList.entries()) {
          await tx.productMedia.create({
            data: {
              productId: product.id,
              objectKey: media.objectKey,
              mimeType: media.mimeType,
              byteSize: media.byteSize,
              altText: productName,
              sortOrder,
            },
          });
        }
      });

      created += 1;
      process.stdout.write(
        `created ${sku} | ${price.toFixed(2)} AZN | ${subcategorySlug} | media=${String(mediaList.length)}\n`,
      );
    }

    process.stdout.write(
      `\nDone. created=${created} updated=${updated} skipped=${skipped} totalRows=${rows.length}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void importAkasoProducts().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
