/**
 * Official Dell product imagery for catalog cards.
 * Prefers Dell Scene7 media-gallery packshots, then SNP part photos.
 */

const SCENE7_PREFIX =
  'https://i.dell.com/is/image/DellContent/';

/** Square render that preserves transparency around the product. */
export const DELL_CARD_SCENE7_QUERY =
  'fmt=png-alpha&pscan=auto&scl=1&hei=1200&wid=1200&qlt=100,1&resMode=sharp2&size=1200,1200&chrss=full';

const TINY_PROBE_QUERY =
  'fmt=png-alpha&pscan=auto&scl=1&hei=48&wid=48&qlt=40,1&resMode=sharp2&size=48,48&chrss=full';

export function isDellSnpUrl(url: string): boolean {
  return url.includes('snpi.dell.com');
}

export function isDellScene7Url(url: string): boolean {
  return url.includes('i.dell.com/is/image') && !isDellSnpUrl(url);
}

export function dellScene7AssetPath(url: string): string | null {
  const match = url.match(/\/DellContent\/([^?]+)/i);
  if (match?.[1] === undefined) {
    return null;
  }
  return match[1];
}

export function scene7ImageUrl(assetPath: string, query: string): string {
  const trimmed = assetPath.replace(/^\/+/, '');
  return `${SCENE7_PREFIX}${trimmed}?${query}`;
}

export function scene7CardImageUrl(assetPath: string): string {
  return scene7ImageUrl(assetPath, DELL_CARD_SCENE7_QUERY);
}

export function scene7ProbeImageUrl(assetPath: string): string {
  return scene7ImageUrl(assetPath, TINY_PROBE_QUERY);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stripAssetExtension(filename: string): string {
  return filename.replace(/\.(psd|png|jpe?g|webp)$/i, '');
}

function galleryStems(filename: string): string[] {
  const raw = stripAssetExtension(filename);
  const stem = raw
    .replace(/-relsize-\d+-ng$/i, '')
    .replace(/-relsize-\d+$/i, '');
  const touchCollapsed = stem.replace(/-t-/, 't-').replace(/-nt-/, 'nt-');
  return unique([touchCollapsed, stem]);
}

function galleryFileNames(stems: string[]): string[] {
  const names: string[] = [];
  for (const stem of stems) {
    names.push(
      `${stem}-gallery-1.psd`,
      `${stem}-gallery-1.png`,
      `${stem}-fpr-gallery-1.psd`,
    );
  }
  return unique(names);
}

/**
 * Dell DAM packshots live next to the landscape `spi/...relsize` assets.
 * Gallery-1 is the front-facing studio shot used on Dell.com product cards.
 */
export function buildDellGalleryAssetPaths(sourceUrl: string): string[] {
  const assetPath = dellScene7AssetPath(sourceUrl);
  if (assetPath === null) {
    return [];
  }

  const segments = assetPath.split('/');
  const filename = segments.at(-1);
  if (filename === undefined) {
    return [];
  }

  const spiIndex = segments.indexOf('spi');
  const productBase =
    spiIndex > 0
      ? segments.slice(0, spiIndex).join('/')
      : segments.slice(0, -1).join('/');

  if (assetPath.includes('/media-gallery/')) {
    const current = assetPath.replace(/\?.*$/, '');
    const asGallery1 = current.replace(
      /gallery-\d+(\.(?:psd|png))$/i,
      'gallery-1$1',
    );
    return unique([current, asGallery1]);
  }

  const stems = galleryStems(filename);
  const files = galleryFileNames(stems);
  const folders = [
    `${productBase}/media-gallery/non-fpr`,
    `${productBase}/media-gallery/fpr`,
    `${productBase}/media-gallery`,
    `${productBase}/media-gallery/ng`,
  ];

  const paths: string[] = [];
  for (const folder of folders) {
    for (const file of files) {
      paths.push(`${folder}/${file}`);
    }
  }
  return unique(paths);
}

export function snpPartImageUrl(partNumber: string): string {
  const part = partNumber.trim().toUpperCase();
  return `https://snpi.dell.com/snp/images/products/large/en-us~${part}/${part}.jpg`;
}

const MODEL_TOKEN =
  /\b((?:AW|DA|WD|SD|MS|KM|KB|WH|WM|EB|CP|CC|DB|PB|PC|PA|PV|MC|QCM|ECT)\d{3,5}[A-Z]{0,4}|[A-Z]\d{4}[A-Z]{0,3}|U\d{4}[A-Z]{2}|P\d{4}[A-Z]{0,3}|S\d{4}[A-Z]{0,3}|SE\d{4}[A-Z]{0,2})\b/i;

export function extractDellModelToken(productName: string): string | null {
  const match = productName.match(MODEL_TOKEN);
  if (match?.[1] === undefined) {
    return null;
  }
  return match[1].toUpperCase();
}

export function buildDellModelGalleryGuesses(productName: string): string[] {
  const model = extractDellModelToken(productName);
  if (model === null) {
    return [];
  }
  const lower = model.toLowerCase();
  const guesses: string[] = [];

  if (lower.startsWith('aw')) {
    guesses.push(
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/alienware/${lower}/media-gallery/monitor-${lower}-black-gallery-1.psd`,
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/alienware/${lower}/media-gallery/monitor-alienware-${lower}-black-gallery-1.psd`,
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/aw-series/${lower}/media-gallery/monitor-alienware-${lower}-white-gallery-1.psd`,
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/alienware/${lower}/spi/monitor-${lower}-black-relsize-500-ng.psd`,
    );
  } else if (/^(p|s|u|se)\d/i.test(lower)) {
    const series = lower.startsWith('se')
      ? 'se-series'
      : `${lower[0]}-series`;
    guesses.push(
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/${series}/${lower}/media-gallery/monitor-${lower}-gray-gallery-1.psd`,
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/${series}/${lower}/media-gallery/monitor-${lower}-black-gallery-1.psd`,
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/${series}/${lower}/spi/monitor-${lower}-gray-relsize-500-ng.psd`,
      `content/dam/ss2/product-images/dell-client-products/peripherals/monitors/${series}/${lower}/spi/monitor-${lower}-black-relsize-500-ng.psd`,
    );
  }

  return unique(guesses);
}
