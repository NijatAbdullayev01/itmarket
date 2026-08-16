/**
 * Lenovo catalog names follow the product form: brand-line + model only.
 * Specs (CPU, RAM, storage, layout) stay in requiredSpecs / variant fields.
 */

export type LenovoCatalogSpec = {
  label: string;
  value: string;
};

export type LenovoCatalogIdentity = {
  productName: string;
  colorFromName: string | null;
};

const GENERIC_MODEL_LABELS = new Set([
  'adapter',
  'backpack',
  'cable',
  'case',
  'combo',
  'dock',
  'hub',
  'keyboard',
  'laptop stand',
  'mouse',
  'power bank',
  'topload',
]);

const NAME_BY_SKU: Record<string, string> = {
  '4X40T84061': 'Lenovo Casual Topload T210',
};

const COLOR_PHRASES = [
  'Eclipse Black',
  'Arctic Grey',
  'Luna Grey',
  'Storm Grey',
  'Gold Gray',
  'Gold Grey',
  'Black',
  'White',
  'Grey',
  'Gray',
  'Qara',
  'Ağ',
] as const;

const TRAILING_LAYOUT =
  /\s+(RUSS|Russian|US English|US Euro\d+P|Latin American Spanish(?:\s+\d+)?|English)$/i;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function specValue(
  specs: readonly LenovoCatalogSpec[],
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

/** Color-gamut / coverage strings must not be stored as variant Rəng. */
export function isLenovoCatalogColorValue(value: string): boolean {
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
  if (/\d+(?:[.,]\d+)?\s*%/.test(normalized)) {
    return false;
  }
  if (
    /klaviatura|keyboard|qwerty|numpad/.test(normalized) &&
    !/\b(grey|gray|black|white|qara|ağ)\b/.test(normalized)
  ) {
    return false;
  }
  return true;
}

export function normalizeLenovoSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

export function isGenericLenovoModelLabel(value: string): boolean {
  return GENERIC_MODEL_LABELS.has(
    collapseWhitespace(value).toLocaleLowerCase('en'),
  );
}

function normalizePunctuation(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+&\s+/g, ' and ');
}

function isProperLenovoCatalogName(value: string): boolean {
  const name = collapseWhitespace(value);
  if (name === '' || isGenericLenovoModelLabel(name)) {
    return false;
  }
  if (/\(Type\s/i.test(name)) {
    return false;
  }
  return /^(Lenovo|ThinkPad|ThinkBook|ThinkCentre|ThinkVision)\b/i.test(name);
}

function pickSourceTitle(
  model: string,
  officialName: string,
  sku: string,
): string {
  const override = NAME_BY_SKU[normalizeLenovoSku(sku)];
  if (override !== undefined) {
    return override;
  }
  const official = collapseWhitespace(normalizePunctuation(officialName));
  const modelName = collapseWhitespace(normalizePunctuation(model));
  if (isProperLenovoCatalogName(official)) {
    return official;
  }
  if (modelName !== '' && !isGenericLenovoModelLabel(modelName)) {
    return modelName;
  }
  if (official !== '') {
    return official;
  }
  return modelName;
}

function stripSupportAndPackaging(value: string): string {
  let name = value;
  name = name.replace(/\s*\(Type\b[^)]*\)/gi, '');
  name = name.replace(/\s*\(RTL\s*BOX\)/gi, '');
  name = name.replace(/\s*\(w\/\s*adapter\)/gi, '');
  name = name.replace(/\s*\(with\s+\d+\s*W\s+Adapter\)/gi, '');
  name = name.replace(/\s+with\s+MC60\b/gi, '');
  name = name.replace(/\s*\(American Standard Plug Type [A-Z]\)/gi, '');
  name = name.replace(/\s*-\s*US Pin\b/gi, '');
  name = name.replace(/\s*-\s*US Euro\d+P\b/gi, '');
  name = name.replace(/\s*-\s*US English\b/gi, '');
  name = name.replace(/\s*\(Latin American Spanish(?:\s+\d+)?\)/gi, '');
  name = name.replace(/\s*-\s*EU(?:\/[A-Z]{2,4})+$/i, '');
  name = name.replace(/\s+Laptops?\s*$/i, '');
  name = name.replace(/\s+Monitor\s*$/i, '');
  name = name.replace(/\s+Desktop\s*\(ThinkCentre\)\s*$/i, '');
  name = name.replace(/\s+\d+(?:\.\d+)?\s*"\s*FHD\s*$/i, '');
  name = name.replace(/\s+27\s*$/i, '');
  return collapseWhitespace(name);
}

function stripThinkBookPlatformCode(value: string): string {
  if (!/ThinkBook/i.test(value)) {
    return value;
  }
  return collapseWhitespace(value.replace(/\s+I[A-Z]{2}$/i, ''));
}

function normalizeThinkPadGeneration(value: string): string {
  if (/ThinkBook/i.test(value) || /ThinkVision/i.test(value)) {
    return value;
  }
  return value.replace(/\bG(\d+)\b/g, 'Gen $1');
}

function ensureLenovoPrefix(value: string): string {
  if (/^Lenovo\b/i.test(value)) {
    return value.replace(/^lenovo\b/i, 'Lenovo');
  }
  return `Lenovo ${value}`;
}

function collapseDuplicateLenovoPrefix(value: string): string {
  return collapseWhitespace(
    value.replace(/^(Lenovo)\s+(.*?)\s+\1\s+/i, '$1 $2 '),
  );
}

function extractColorsFromName(value: string): {
  name: string;
  colorFromName: string | null;
} {
  let name = value;
  let colorFromName: string | null = null;
  name = name.replace(/\s*Black\s*\(\s*ECO\s*\)/gi, ' Eco');
  name = name.replace(/\s*\(\s*ECO\s*\)/gi, ' Eco');
  for (const phrase of COLOR_PHRASES) {
    const pattern = new RegExp(
      `(?:\\s+|\\()${phrase.replace(/\s+/g, '\\s+')}\\)?(?:\\s*\\(\\s*ECO\\s*\\))?\\s*$`,
      'i',
    );
    if (!pattern.test(name)) {
      continue;
    }
    colorFromName = colorFromName ?? phrase.replace(/Gray/i, 'Grey');
    name = collapseWhitespace(name.replace(pattern, ' '));
  }
  return { name: collapseWhitespace(name), colorFromName };
}

export function parseLenovoColorKeyboard(value: string): {
  color: string | null;
  keyboard: string | null;
} {
  const raw = collapseWhitespace(normalizePunctuation(value));
  if (raw === '') {
    return { color: null, keyboard: null };
  }

  const parts = raw.split(',').map((part) => collapseWhitespace(part));
  let keyboard: string | null = null;
  const colorParts: string[] = [];
  for (const part of parts) {
    const keyboardMatch = part.match(
      /^(RU|US|UK|DE|FR|IT|ES|TR)\s+klaviatura$/i,
    );
    if (keyboardMatch !== null) {
      keyboard = keyboardMatch[1]!.toUpperCase();
      continue;
    }
    if (/^klaviatura$/i.test(part)) {
      continue;
    }
    colorParts.push(part.replace(/\s*\(numpad\)/gi, '').trim());
  }

  const colorCandidate = collapseWhitespace(colorParts.join(', '));
  if (colorCandidate === '' || !isLenovoCatalogColorValue(colorCandidate)) {
    return { color: null, keyboard };
  }
  return { color: colorCandidate, keyboard };
}

export function parseLenovoModelName(value: string): LenovoCatalogIdentity {
  let name = collapseWhitespace(normalizePunctuation(value));
  name = stripSupportAndPackaging(name);
  name = stripThinkBookPlatformCode(name);
  name = normalizeThinkPadGeneration(name);
  name = ensureLenovoPrefix(name);
  name = collapseDuplicateLenovoPrefix(name);

  const extracted = extractColorsFromName(name);
  name = extracted.name;
  const colorFromName = extracted.colorFromName;

  while (true) {
    const layout = name.match(TRAILING_LAYOUT);
    if (layout?.index !== undefined) {
      name = name.slice(0, layout.index).trim();
      continue;
    }
    break;
  }

  return {
    productName: collapseWhitespace(name).slice(0, 200),
    colorFromName,
  };
}

export function cleanLenovoModelName(value: string): string {
  return parseLenovoModelName(value).productName;
}

export function resolveLenovoCatalogIdentity(
  model: string,
  officialName: string,
  sku?: string,
): LenovoCatalogIdentity {
  const partNumber = sku === undefined ? '' : normalizeLenovoSku(sku);
  const source = pickSourceTitle(model, officialName, partNumber);
  return parseLenovoModelName(source);
}

export function sanitizeLenovoRequiredSpecs(
  specs: readonly LenovoCatalogSpec[],
): LenovoCatalogSpec[] {
  return specs.map((entry) => {
    if (entry.label.toLocaleLowerCase('az') !== 'model') {
      return entry;
    }
    return {
      label: entry.label,
      value: parseLenovoModelName(entry.value).productName,
    };
  });
}

export function buildLenovoCatalogProductName(
  model: string,
  officialName: string,
  sku?: string,
): string {
  return resolveLenovoCatalogIdentity(model, officialName, sku).productName;
}

export function buildLenovoVariantName(
  specs: readonly LenovoCatalogSpec[],
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
    (part): part is string => part !== null && part !== '',
  );
  if (parts.length === 0) {
    return 'Standart';
  }
  return parts.join(' / ').slice(0, 200);
}

export function buildLenovoVariantAttributes(
  specs: readonly LenovoCatalogSpec[],
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

  if (storage !== null) {
    attributes.Yaddaş = storage;
  }
  if (ram !== null) {
    attributes.RAM = ram;
  }

  const color =
    specColor !== null && isLenovoCatalogColorValue(specColor)
      ? specColor
      : (colorFromName ?? null);
  if (color !== null && isLenovoCatalogColorValue(color)) {
    attributes.Rəng = color;
  }
  return attributes;
}
