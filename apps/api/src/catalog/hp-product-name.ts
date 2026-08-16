/**
 * HP catalog names follow the product form: brand-line + model only.
 * Specs (CPU, RAM, storage, layout) stay in requiredSpecs / variant fields.
 */

export type HpCatalogSpec = {
  label: string;
  value: string;
};

export type HpCatalogIdentity = {
  productName: string;
  colorFromName: string | null;
};

const HP_GPU_NAMES: Record<string, string> = {
  '5Z7D9AA': 'HP NVIDIA RTX A2000 12GB',
  '8D6B8AA': 'HP NVIDIA RTX 2000 Ada 16GB',
  '20X24AA': 'HP NVIDIA RTX A4000 16GB',
  '8D6B7AA': 'HP NVIDIA RTX 4000 Ada 20GB',
};

const HP_PN_PARENS = /\s*\(([A-Z0-9]{5,12})\)\s*$/;

const TRAILING_LAYOUT =
  /\s+(RUSS|Russian|EURO|WW|Brac|US QWERTY|English)$/i;

const COLOR_PHRASES = [
  'Dark Ash Silver',
  'Turbo Silver',
  'Pike Silver',
  'Mica Silver',
  'Meteor Silver',
  'Performance Blue',
  'Shadow Black',
  'Stealth Black',
  'Ash Silver',
  'Natural Silver',
  'Ceramic White',
  'Black',
  'White',
  'Blue',
  'Silver',
  'Qara',
  'Ağ',
  'BLK',
  'WHT',
] as const;

function colorCanonical(value: string): string {
  if (/^blk$/i.test(value)) {
    return 'Black';
  }
  if (/^wht$/i.test(value)) {
    return 'White';
  }
  return value;
}

const ACCESSORY_TOKEN_MAP: Record<string, string> = {
  wl: 'Wireless',
  wls: 'Wireless',
  wrls: 'Wireless',
  wd: 'Wired',
  kbd: 'Keyboard',
  kb: 'Keyboard',
  mse: 'Mouse',
  sl: 'Slim',
  pav: 'Pavilion',
  esntldk: 'Essential Dock',
  tb4: 'Thunderbolt 4',
  sths: 'Stereo Headset',
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function specValue(
  specs: readonly HpCatalogSpec[],
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) =>
    matcher(entry.label.toLocaleLowerCase('az')),
  );
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

function isHpSuppliesName(value: string): boolean {
  return /\b(toner|cartridge|kartric|ink\s*bottle)\b/i.test(value);
}

function isHpPrintEngineName(value: string): boolean {
  return /\b(LaserJet|DeskJet|OfficeJet|Smart Tank|Color Laser|ScanJet)\b/i.test(
    value,
  );
}

function isHpPrinterMemoryValue(value: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*MB\b/i.test(collapseWhitespace(value));
}

function stripPrinterTypeSuffix(value: string): string {
  if (isHpSuppliesName(value) || !isHpPrintEngineName(value)) {
    return value;
  }
  return collapseWhitespace(
    value
      .replace(/\s+Printer\s*$/i, '')
      .replace(/\s+Scanner\s*$/i, '')
      .replace(/\s+(?:All-in-One|AIO)\s*$/i, ''),
  );
}

/** Color-gamut / coverage strings must not be stored as variant Rəng. */
export function isHpCatalogColorValue(value: string): boolean {
  const normalized = collapseWhitespace(value).toLocaleLowerCase('az');
  if (normalized === '') {
    return false;
  }
  if (
    /srgb|dci-p3|dci p3|adobe rgb|ntsc|delta\s*e|billion colors|rəng tutumu|color gamut/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (
    /^(rəngli|rengli|ağ-qara|ag-qara|ağ qara|ag qara|mono|monochrome|color|colour|black\s*&\s*white|black and white)$/i.test(
      normalized,
    )
  ) {
    return false;
  }
  if (/\d+(?:[.,]\d+)?\s*%/.test(normalized)) {
    return false;
  }
  return true;
}

export function normalizeHpSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

export function listHpGpuCatalogSkus(): string[] {
  return Object.keys(HP_GPU_NAMES);
}

function expandAccessoryTokens(value: string): string {
  let name = value;
  name = name.replace(/Mouse\s*\+\s*KB/gi, 'Mouse and Keyboard');
  name = name.replace(/Mouse\s*\/\s*KB/gi, 'Mouse and Keyboard');
  name = name.replace(/Mse\s*\/\s*KB/gi, 'Mouse and Keyboard');
  name = name.replace(/KB\s*\/\s*MSE/gi, 'Keyboard and Mouse');
  name = name.replace(/WiredCombo/gi, 'Wired Combo');
  name = name.replace(/\bTrue\s+4k\b/gi, 'True 4K');

  return name
    .split(' ')
    .map((token) => {
      const punct = token.match(/^(.+?)([.,;:]+)?$/);
      const core = punct?.[1] ?? token;
      const suffix = punct?.[2] ?? '';
      const mapped = ACCESSORY_TOKEN_MAP[core.toLocaleLowerCase('en')];
      if (mapped === undefined) {
        return token;
      }
      return `${mapped}${suffix}`;
    })
    .join(' ');
}

function ensureHpPrefix(value: string): string {
  if (/^HP\b/i.test(value)) {
    return value.replace(/^hp\b/i, 'HP');
  }
  return `HP ${value}`;
}

function normalizeHpSeriesSpelling(value: string): string {
  let name = value;
  name = name.replace(/\bZbook\b/g, 'ZBook');
  name = name.replace(/\bAll\s*-\s*in\s*-\s*one\b/gi, 'All-in-One');
  name = name.replace(/\bOmniStudio\b/gi, 'OmniStudio');
  name = name.replace(/\bLaserJet Ent\b/g, 'LaserJet Enterprise');
  name = name.replace(/(\d)G(\d+)/g, '$1 G$2');
  return name;
}

function isAllInOneName(value: string): boolean {
  return /all\s*-\s*in\s*-\s*one|omnistudio|\baio\b/i.test(value);
}

function preferCurrentHpLine(value: string): string {
  const parts = value
    .split(/\s+\/\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (parts.length < 2) {
    return value;
  }
  const omnibook = parts.find((part) => /omnibook/i.test(part));
  if (omnibook !== undefined) {
    return omnibook;
  }
  return value;
}

function stripSlashScreenSize(value: string): string {
  if (isAllInOneName(value) || /^HP Laptop\b/i.test(value)) {
    return value.replace(/\s*\/\s*/, ' ');
  }
  return value.replace(/\s*\/\s*\d+(?:[.,]\d+)?\s*"?\s*$/i, '');
}

function stripTrailingNotebookInches(value: string): string {
  if (
    isAllInOneName(value) ||
    /monitor/i.test(value) ||
    /^HP Laptop\b/i.test(value)
  ) {
    return value;
  }
  return value.replace(/\s+\d+(?:[.,]\d+)?\s*"\s*$/, '');
}

function collapseDuplicateHpPrefix(value: string): string {
  return collapseWhitespace(
    value.replace(/^(HP)\s+(.*?)\s+\1\s+/i, '$1 $2 '),
  );
}

function extractColorsFromName(value: string): {
  name: string;
  colorFromName: string | null;
} {
  let name = value;
  let colorFromName: string | null = null;
  for (const phrase of COLOR_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (!pattern.test(name)) {
      continue;
    }
    colorFromName = colorFromName ?? colorCanonical(phrase);
    name = collapseWhitespace(name.replace(pattern, ' '));
  }
  return { name, colorFromName };
}

export function parseHpModelName(value: string): HpCatalogIdentity {
  let name = collapseWhitespace(value);
  let colorFromName: string | null = null;

  name = name.replace(HP_PN_PARENS, '').trim();
  name = name.replace(/\s*\(RTL\s*BOX\)/gi, '').trim();
  name = preferCurrentHpLine(name);
  name = expandAccessoryTokens(name);
  name = normalizeHpSeriesSpelling(name);
  name = stripSlashScreenSize(name);
  name = ensureHpPrefix(name);
  name = collapseDuplicateHpPrefix(name);
  name = stripTrailingNotebookInches(name);
  name = collapseWhitespace(name);

  if (!isHpSuppliesName(name)) {
    const extracted = extractColorsFromName(name);
    name = extracted.name;
    colorFromName = extracted.colorFromName;
  }

  while (true) {
    const layout = name.match(TRAILING_LAYOUT);
    if (layout?.index !== undefined) {
      name = name.slice(0, layout.index).trim();
      continue;
    }
    break;
  }

  name = stripPrinterTypeSuffix(name);

  return {
    productName: collapseWhitespace(name).slice(0, 200),
    colorFromName,
  };
}

export function cleanHpModelName(value: string): string {
  return parseHpModelName(value).productName;
}

export function resolveHpGpuCatalogName(sku: string): string | null {
  return HP_GPU_NAMES[normalizeHpSku(sku)] ?? null;
}

export function resolveHpCatalogIdentity(
  title: string,
  specs: readonly HpCatalogSpec[],
  sku?: string,
): HpCatalogIdentity {
  if (sku !== undefined) {
    const gpuName = resolveHpGpuCatalogName(sku);
    if (gpuName !== null) {
      return { productName: gpuName, colorFromName: null };
    }
  }

  const model = specValue(specs, (label) => label === 'model');
  if (model !== null) {
    return parseHpModelName(model);
  }

  return parseHpModelName(title);
}

const HP_GPU_SPECS: Record<string, readonly HpCatalogSpec[]> = {
  '5Z7D9AA': [
    { label: 'Model', value: 'HP NVIDIA RTX A2000 12GB' },
    { label: 'Yaddaş', value: '12 GB GDDR6' },
    { label: 'Çıxış', value: '4× Mini DisplayPort' },
    { label: 'Tip', value: 'workstation PCIe qrafik kartı (HP Z seriyası üçün)' },
  ],
  '8D6B8AA': [
    { label: 'Model', value: 'HP NVIDIA RTX 2000 Ada 16GB' },
    { label: 'Yaddaş', value: '16 GB GDDR6' },
    { label: 'Çıxış', value: '4× Mini DisplayPort' },
    { label: 'Tip', value: 'workstation PCIe qrafik kartı (HP Z seriyası üçün)' },
  ],
  '20X24AA': [
    { label: 'Model', value: 'HP NVIDIA RTX A4000 16GB' },
    { label: 'Yaddaş', value: '16 GB GDDR6' },
    { label: 'Çıxış', value: '4× DisplayPort' },
    { label: 'Tip', value: 'workstation PCIe qrafik kartı (HP Z seriyası üçün)' },
  ],
  '8D6B7AA': [
    { label: 'Model', value: 'HP NVIDIA RTX 4000 Ada 20GB' },
    { label: 'Yaddaş', value: '20 GB GDDR6' },
    { label: 'Çıxış', value: '4× DisplayPort' },
    { label: 'Tip', value: 'workstation PCIe qrafik kartı (HP Z seriyası üçün)' },
  ],
};

export function sanitizeHpRequiredSpecs(
  specs: readonly HpCatalogSpec[],
  sku?: string,
): HpCatalogSpec[] {
  const gpuName = sku !== undefined ? resolveHpGpuCatalogName(sku) : null;
  return specs.map((entry) => {
    if (entry.label.toLocaleLowerCase('az') !== 'model') {
      return entry;
    }
    if (gpuName !== null) {
      return { label: entry.label, value: gpuName };
    }
    return {
      label: entry.label,
      value: parseHpModelName(entry.value).productName,
    };
  });
}

export function enrichHpRequiredSpecs(
  specs: readonly HpCatalogSpec[],
  sku: string,
): HpCatalogSpec[] {
  const gpuSpecs = HP_GPU_SPECS[normalizeHpSku(sku)];
  const sanitized = sanitizeHpRequiredSpecs(specs, sku);
  if (gpuSpecs === undefined) {
    return sanitized;
  }
  const labels = new Set(
    gpuSpecs.map((entry) => entry.label.toLocaleLowerCase('az')),
  );
  const rest = sanitized.filter(
    (entry) => !labels.has(entry.label.toLocaleLowerCase('az')),
  );
  return [...gpuSpecs, ...rest];
}

export function buildHpCatalogProductName(
  title: string,
  specs: readonly HpCatalogSpec[],
  sku?: string,
): string {
  return resolveHpCatalogIdentity(title, specs, sku).productName;
}

export function buildHpVariantName(
  specs: readonly HpCatalogSpec[],
): string {
  const ram = specValue(
    specs,
    (label) =>
      label === 'ram' ||
      label.includes('müvəqqəti') ||
      label.includes('operativ'),
  );
  const storage = specValue(
    specs,
    (label) => label === 'yaddaş' || label === 'yaddas',
  );
  const parts = [storage, ram].filter(
    (part): part is string =>
      part !== null && part !== '' && !isHpPrinterMemoryValue(part),
  );
  if (parts.length === 0) {
    const specColor = specValue(
      specs,
      (label) => label === 'rəng' || label === 'reng',
    );
    const yieldPages = specValue(specs, (label) => label === 'tutum');
    const color =
      specColor !== null && isHpCatalogColorValue(specColor) ? specColor : null;
    const supplyParts = [color, yieldPages].filter(
      (part): part is string => part !== null && part !== '',
    );
    if (supplyParts.length > 0) {
      return supplyParts.join(' / ').slice(0, 200);
    }
    return 'Standart';
  }
  return parts.join(' / ').slice(0, 200);
}

export function buildHpVariantAttributes(
  specs: readonly HpCatalogSpec[],
  colorFromName?: string | null,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const storage = specValue(
    specs,
    (label) => label === 'yaddaş' || label === 'yaddas',
  );
  const ram = specValue(
    specs,
    (label) =>
      label === 'ram' ||
      label.includes('müvəqqəti') ||
      label.includes('operativ'),
  );
  const specColor = specValue(
    specs,
    (label) => label === 'rəng' || label === 'reng',
  );

  if (storage !== null && !isHpPrinterMemoryValue(storage)) {
    attributes.Yaddaş = storage;
  }
  if (ram !== null && !isHpPrinterMemoryValue(ram)) {
    attributes.RAM = ram;
  }

  const yieldPages = specValue(specs, (label) => label === 'tutum');
  if (yieldPages !== null) {
    attributes.Tutum = yieldPages;
  }

  const color =
    specColor !== null && isHpCatalogColorValue(specColor)
      ? specColor
      : (colorFromName ?? null);
  if (color !== null && isHpCatalogColorValue(color)) {
    attributes.Rəng = color;
  }
  return attributes;
}
