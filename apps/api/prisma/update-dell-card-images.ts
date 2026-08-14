/**
 * Refresh Dell catalog photos from official Dell Scene7 / SNP sources
 * and frame them for square storefront product cards (object-fit: cover).
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import {
  buildDellGalleryAssetPaths,
  buildDellModelGalleryGuesses,
  dellScene7AssetPath,
  isDellScene7Url,
  isDellSnpUrl,
  scene7CardImageUrl,
  scene7ProbeImageUrl,
  snpPartImageUrl,
} from '../src/catalog/dell-official-image';

const requireFromBackoffice = createRequire(
  path.join(__dirname, '../../backoffice/package.json'),
);
const XLSX = requireFromBackoffice('xlsx') as typeof import('xlsx');

loadEnvironment({ path: '../../.env', quiet: true });

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'Dell_Məhsulları.xlsx');
const CARD_BG = '#FFFFFF';
const LEGACY_CARD_BG = '#F7F8FA';
const CARD_SIZE = 1200;
const PRODUCT_FIT = 984;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

type ExcelRow = {
  model: string;
  title: string;
  imageUrl: string;
};

type DownloadedImage = {
  body: Buffer;
  mimeType: 'image/jpeg';
  source: string;
};

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
    const title = String(raw[1] ?? '').trim();
    if (model === '') {
      continue;
    }
    rows.push({
      model,
      title,
      imageUrl: String(raw[8] ?? '').trim(),
    });
  }
  return rows;
}

function excelSkuKey(model: string): string {
  return model.trim().toUpperCase();
}

function skuMatchesExcel(sku: string, excelModel: string): boolean {
  const left = sku.trim().toUpperCase();
  const right = excelSkuKey(excelModel);
  return left === right || left.startsWith(`${right}-`);
}

async function fetchBuffer(
  url: string,
): Promise<{ body: Buffer; contentType: string; status: number } | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.dell.com/',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (response.status === 403 || response.status === 429 || response.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      return { body: Buffer.alloc(0), contentType: '', status: response.status };
    }
    const body = Buffer.from(await response.arrayBuffer());
    return {
      body,
      contentType: response.headers.get('content-type') ?? '',
      status: response.status,
    };
  }
  return { body: Buffer.alloc(0), contentType: '', status: 403 };
}

function looksLikeImage(contentType: string, body: Buffer): boolean {
  if (body.byteLength < 80) {
    return false;
  }
  if (contentType.toLowerCase().startsWith('image/')) {
    return true;
  }
  return (
    body[0] === 0xff ||
    body[0] === 0x89 ||
    body.toString('ascii', 0, 4) === 'RIFF'
  );
}

const probeCache = new Map<string, Promise<boolean>>();

function probeScene7Asset(assetPath: string): Promise<boolean> {
  const cached = probeCache.get(assetPath);
  if (cached !== undefined) {
    return cached;
  }
  const pending = (async () => {
    const result = await fetchBuffer(scene7ProbeImageUrl(assetPath));
    if (result === null || result.status !== 200) {
      return false;
    }
    return looksLikeImage(result.contentType, result.body);
  })();
  probeCache.set(assetPath, pending);
  return pending;
}

type SourceCandidate = { path?: string; url: string; label: string };

async function firstExistingScene7(
  candidates: SourceCandidate[],
): Promise<SourceCandidate | null> {
  const seen = new Set<string>();
  const uniqueCandidates: SourceCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.path ?? candidate.url;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueCandidates.push(candidate);
  }

  const chunkSize = 4;
  for (let index = 0; index < uniqueCandidates.length; index += chunkSize) {
    const chunk = uniqueCandidates.slice(index, index + chunkSize);
    const results = await Promise.all(
      chunk.map(async (candidate) => {
        if (candidate.path === undefined) {
          return { candidate, exists: false };
        }
        return { candidate, exists: await probeScene7Asset(candidate.path) };
      }),
    );
    const hit = results.find((entry) => entry.exists);
    if (hit !== undefined) {
      return hit.candidate;
    }
  }
  return null;
}

async function resolveOfficialSource(
  row: ExcelRow,
): Promise<{ url: string; label: string } | null> {
  const candidates: SourceCandidate[] = [];

  if (isDellScene7Url(row.imageUrl)) {
    for (const assetPath of buildDellGalleryAssetPaths(row.imageUrl)) {
      candidates.push({
        path: assetPath,
        url: scene7CardImageUrl(assetPath),
        label: `gallery:${assetPath.split('/').slice(-2).join('/')}`,
      });
    }
    const originalPath = dellScene7AssetPath(row.imageUrl);
    if (originalPath !== null) {
      candidates.push({
        path: originalPath,
        url: scene7CardImageUrl(originalPath),
        label: 'scene7-original',
      });
    }
  }

  for (const assetPath of buildDellModelGalleryGuesses(row.title)) {
    candidates.push({
      path: assetPath,
      url: scene7CardImageUrl(assetPath),
      label: `model-guess:${assetPath.split('/').slice(-1)[0]}`,
    });
  }

  const galleryHit = await firstExistingScene7(candidates);
  if (galleryHit !== null) {
    return { url: galleryHit.url, label: galleryHit.label };
  }

  if (isDellSnpUrl(row.imageUrl)) {
    return { url: row.imageUrl, label: 'snp-excel' };
  }

  const snpUrl = snpPartImageUrl(row.model);
  const snp = await fetchBuffer(snpUrl);
  if (
    snp !== null &&
    snp.status === 200 &&
    looksLikeImage(snp.contentType, snp.body)
  ) {
    return { url: snpUrl, label: 'snp-part' };
  }

  if (isDellScene7Url(row.imageUrl)) {
    const originalPath = dellScene7AssetPath(row.imageUrl);
    if (originalPath !== null) {
      return {
        url: scene7CardImageUrl(originalPath),
        label: 'scene7-original',
      };
    }
    return { url: row.imageUrl, label: 'excel-fallback' };
  }
  return null;
}

function frameForProductCard(body: Buffer): Buffer | null {
  const inputPath = path.join(tmpdir(), `dell-card-in-${randomUUID()}`);
  const outputPath = path.join(tmpdir(), `dell-card-out-${randomUUID()}.jpg`);
  writeFileSync(inputPath, body);
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
        `${PRODUCT_FIT}x${PRODUCT_FIT}`,
        '-background',
        CARD_BG,
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-gravity',
        'center',
        '-extent',
        `${CARD_SIZE}x${CARD_SIZE}`,
        '-fuzz',
        '3%',
        '-fill',
        CARD_BG,
        '-opaque',
        LEGACY_CARD_BG,
        '-strip',
        '-quality',
        '86',
        outputPath,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      process.stderr.write(
        `Card frame failed: ${result.stderr || result.error?.message || 'unknown'}\n`,
      );
      return null;
    }
    const framed = readFileSync(outputPath);
    if (framed.byteLength < 800) {
      return null;
    }
    return framed;
  } finally {
    try {
      unlinkSync(inputPath);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
  }
}

async function downloadOfficialCardImage(
  url: string,
): Promise<DownloadedImage | null> {
  const result = await fetchBuffer(url);
  if (result === null || result.status !== 200) {
    process.stderr.write(`Download failed (${result?.status ?? 'n/a'}): ${url}\n`);
    return null;
  }
  if (!looksLikeImage(result.contentType, result.body)) {
    process.stderr.write(`Not an image: ${url}\n`);
    return null;
  }
  if (result.body.byteLength > 15_000_000) {
    process.stderr.write(`Image too large: ${url}\n`);
    return null;
  }
  const framed = frameForProductCard(result.body);
  if (framed === null) {
    return null;
  }
  return { body: framed, mimeType: 'image/jpeg', source: url };
}

async function saveCatalogJpeg(
  body: Buffer,
): Promise<{ objectKey: string; byteSize: number }> {
  const objectKey = `/images/catalog/${randomUUID()}.jpg`;
  const fileName = path.basename(objectKey);
  const directories = [
    path.join(WORKSPACE_ROOT, 'apps/storefront/public/images/catalog'),
    path.join(WORKSPACE_ROOT, 'apps/backoffice/public/images/catalog'),
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
  }
  const primary = path.join(directories[0]!, fileName);
  await writeFile(primary, body);
  await copyFile(primary, path.join(directories[1]!, fileName));
  return { objectKey, byteSize: body.byteLength };
}

function catalogFilePath(objectKey: string): string {
  return path.join(
    WORKSPACE_ROOT,
    'apps/storefront/public/images/catalog',
    path.basename(objectKey),
  );
}

function isAlreadyCardFramed(objectKey: string): boolean {
  const filePath = catalogFilePath(objectKey);
  const result = spawnSync(
    'identify',
    ['-format', '%wx%h %m', filePath],
    { encoding: 'utf8' },
  );
  return result.status === 0 && result.stdout.trim() === '1200x1200 JPEG';
}

/** Replace baked-in gray canvas with white without changing crop or size. */
function whitenLegacyGrayInPlace(objectKey: string): boolean {
  const storefrontPath = catalogFilePath(objectKey);
  const backofficePath = path.join(
    WORKSPACE_ROOT,
    'apps/backoffice/public/images/catalog',
    path.basename(objectKey),
  );
  const outputPath = path.join(tmpdir(), `dell-white-${randomUUID()}.jpg`);
  const result = spawnSync(
    'convert',
    [
      storefrontPath,
      '-fuzz',
      '3%',
      '-fill',
      CARD_BG,
      '-opaque',
      LEGACY_CARD_BG,
      '-strip',
      '-quality',
      '86',
      outputPath,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    process.stderr.write(
      `Whiten failed ${objectKey}: ${result.stderr || result.error?.message || 'unknown'}\n`,
    );
    try {
      unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    const whitened = readFileSync(outputPath);
    if (whitened.byteLength < 800) {
      return false;
    }
    writeFileSync(storefrontPath, whitened);
    writeFileSync(backofficePath, whitened);
    return true;
  } finally {
    try {
      unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
  }
}

function frameLocalCatalogFile(objectKey: string): DownloadedImage | null {
  const filePath = catalogFilePath(objectKey);
  try {
    const body = readFileSync(filePath);
    const framed = frameForProductCard(body);
    if (framed === null) {
      return null;
    }
    return { body: framed, mimeType: 'image/jpeg', source: `local:${objectKey}` };
  } catch {
    return null;
  }
}

async function deleteCatalogFile(objectKey: string): Promise<void> {
  const fileName = path.basename(objectKey);
  const paths = [
    path.join(WORKSPACE_ROOT, 'apps/storefront/public/images/catalog', fileName),
    path.join(WORKSPACE_ROOT, 'apps/backoffice/public/images/catalog', fileName),
  ];
  await Promise.allSettled(paths.map((filePath) => unlink(filePath)));
}

async function updateDellCardImages(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = readExcelRows();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const products = await prisma.product.findMany({
      where: { brand: { slug: 'dell' } },
      select: {
        id: true,
        name: true,
        variants: { select: { sku: true } },
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { id: true, objectKey: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const sourceCache = new Map<string, DownloadedImage | null>();
    const resolvedCache = new Map<
      string,
      { url: string; label: string } | null
    >();

    for (const product of products) {
      const sku = product.variants[0]?.sku;
      if (sku === undefined) {
        process.stderr.write(`Skip ${product.name}: no SKU\n`);
        skipped += 1;
        continue;
      }

      const row = rows.find((entry) => skuMatchesExcel(sku, entry.model));
      if (row === undefined) {
        process.stderr.write(`Skip ${sku}: no Excel row\n`);
        skipped += 1;
        continue;
      }

      const existing = product.media[0];
      if (existing !== undefined && isAlreadyCardFramed(existing.objectKey)) {
        if (whitenLegacyGrayInPlace(existing.objectKey)) {
          updated += 1;
          process.stdout.write(
            `ok ${sku} | ${product.name} | whitened-legacy\n`,
          );
        } else {
          skipped += 1;
        }
        continue;
      }

      const resolveKey = `${row.imageUrl}|${row.title}`;
      let resolved = resolvedCache.get(resolveKey);
      if (resolved === undefined) {
        resolved = await resolveOfficialSource(row);
        resolvedCache.set(resolveKey, resolved);
      }
      if (resolved === null) {
        process.stderr.write(`Skip ${sku}: no official image\n`);
        skipped += 1;
        continue;
      }

      let downloaded = sourceCache.get(resolved.url);
      if (downloaded === undefined) {
        downloaded = await downloadOfficialCardImage(resolved.url);
        sourceCache.set(resolved.url, downloaded);
      }
      if (downloaded === null && existing !== undefined) {
        downloaded = frameLocalCatalogFile(existing.objectKey);
        if (downloaded !== null) {
          process.stderr.write(
            `Local frame ${sku} after official download miss\n`,
          );
        }
      }
      if (downloaded === null) {
        failed += 1;
        process.stderr.write(`Fail ${sku} (${resolved.label})\n`);
        continue;
      }

      const saved = await saveCatalogJpeg(downloaded.body);
      if (existing === undefined) {
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            objectKey: saved.objectKey,
            mimeType: downloaded.mimeType,
            byteSize: saved.byteSize,
            altText: product.name,
            sortOrder: 0,
          },
        });
      } else {
        const previousKey = existing.objectKey;
        await prisma.productMedia.update({
          where: { id: existing.id },
          data: {
            objectKey: saved.objectKey,
            mimeType: downloaded.mimeType,
            byteSize: saved.byteSize,
            altText: product.name,
          },
        });
        if (previousKey !== saved.objectKey) {
          await deleteCatalogFile(previousKey);
        }
      }

      updated += 1;
      process.stdout.write(
        `ok ${sku} | ${product.name} | ${resolved.label}\n`,
      );
    }

    process.stdout.write(
      `\nDone. updated=${updated} skipped=${skipped} failed=${failed} total=${products.length}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void updateDellCardImages().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
