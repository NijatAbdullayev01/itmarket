/**
 * Dell catalog names follow the product form: brand-line + model only.
 * Specs (CPU, RAM, storage, gamut, layout) stay in requiredSpecs / variant fields.
 */

export type DellCatalogSpec = {
  label: string;
  value: string;
};

export type DellCatalogIdentity = {
  productName: string;
  colorFromName: string | null;
};

const GENERIC_MODEL_LABELS = new Set([
  'adapter',
  'cable',
  'fan',
  'heatsink',
  'optic',
  'standard fan',
  'standard heatsink',
  'high-tdp heatsink',
]);

const COLORWAY_PARENS = ['Dark Side of the Moon', 'Lunar Light'] as const;

const TRAILING_LAYOUT = /\s+(US QWERTY|Russian|English)$/i;
const TRAILING_COLOR =
  /\s+(Ash Pink|Heather Grey|Lunar Light|Silver|Black|White|Qara|Ağ)$/i;

const TRAILING_PART_NUMBER =
  /\s*\(([A-Z0-9][A-Z0-9._-]*\d[A-Z0-9._-]*)\)\s*$/i;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function specValue(
  specs: readonly DellCatalogSpec[],
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

function isRamSpecLabel(label: string): boolean {
  return (
    label === 'ram' ||
    label.startsWith('ram (') ||
    label.includes('müvəqqəti')
  );
}

function isStorageSpecLabel(label: string): boolean {
  return (
    label === 'yaddaş' ||
    label === 'yaddas' ||
    label.startsWith('yaddaş (') ||
    label.startsWith('yaddas (')
  );
}

function hasMemoryModuleHint(specs: readonly DellCatalogSpec[]): boolean {
  return specs.some((entry) => {
    const label = entry.label.toLocaleLowerCase('az');
    const value = entry.value.toLocaleLowerCase('az');
    return (
      label.includes('rank') ||
      label.startsWith('tezlik') ||
      /\brdimm\b|\budimm\b/.test(value) ||
      /\brdimm\b|\budimm\b/.test(label)
    );
  });
}

/** Color-gamut / coverage strings must not be stored as variant Rəng. */
export function isDellCatalogColorValue(value: string): boolean {
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
  return true;
}

export function normalizeDellSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

function isIncompleteDellModel(value: string): boolean {
  const name = collapseWhitespace(value);
  if (name === '') {
    return true;
  }
  const lower = name.toLocaleLowerCase('en');
  if (GENERIC_MODEL_LABELS.has(lower)) {
    return true;
  }
  if (/^[A-Z]?\d{3,5}[A-Z]?$/i.test(name)) {
    return true;
  }
  if (/^(broadcom|intel)\s+[A-Z0-9-]+$/i.test(name)) {
    return true;
  }
  if (/^dell\s+\d+(?:\.\d+)?\s*(?:gb|tb)\s+ri ssd$/i.test(name)) {
    return true;
  }
  if (/^(sfp\+|sfp28)\s+(sr|dac)\b/i.test(name) && name.length < 24) {
    return true;
  }
  return false;
}

function ensureDellPrefix(value: string): string {
  if (/^Alienware\b/i.test(value)) {
    return value.replace(/^alienware\b/i, 'Alienware');
  }
  if (/^Dell\b/i.test(value)) {
    return value.replace(/^dell\b/i, 'Dell');
  }
  return `Dell ${value}`;
}

function pickSourceTitle(title: string, model: string | null): string {
  const modelName = collapseWhitespace(model ?? '');
  const titleName = collapseWhitespace(title).replace(
    TRAILING_PART_NUMBER,
    '',
  );

  if (/poweredge/i.test(modelName)) {
    return modelName;
  }
  if (/xeon/i.test(modelName)) {
    return modelName;
  }
  if (titleName !== '' && isIncompleteDellModel(modelName)) {
    return titleName;
  }
  if (modelName !== '' && !isIncompleteDellModel(modelName)) {
    return modelName;
  }
  return titleName !== '' ? titleName : modelName;
}

export function parseDellModelName(value: string): DellCatalogIdentity {
  let name = collapseWhitespace(value);
  let colorFromName: string | null = null;

  name = name.replace(/\s*\(SKU\b[^)]*\)/gi, '').trim();
  name = name.replace(/\s*\(RTL\s*BOX\)/gi, '').trim();
  name = name.replace(TRAILING_PART_NUMBER, '').trim();

  for (const colorway of COLORWAY_PARENS) {
    const wrapped = new RegExp(`\\s*\\(${colorway}\\)`, 'i');
    if (wrapped.test(name)) {
      colorFromName = colorway;
      name = name.replace(wrapped, '').trim();
    }
  }

  if (/^Dell Pro\s*\/\s*P\d+/i.test(name)) {
    name = name.replace(/\s*\/\s*/, ' ');
  }
  if (/^Dell Premier\s*\/\s*Pro Plus/i.test(name)) {
    name = name.replace(/^Dell Premier\s*\/\s*Pro Plus/i, 'Dell Premier');
  }
  if (/headset/i.test(name) && name.includes(' / ')) {
    name = name.split(' / ')[0]!.trim();
  }

  while (true) {
    const layout = name.match(TRAILING_LAYOUT);
    if (layout?.index !== undefined) {
      name = name.slice(0, layout.index).trim();
      continue;
    }
    const trailingColor = name.match(TRAILING_COLOR);
    if (trailingColor?.index !== undefined && trailingColor[1] !== undefined) {
      colorFromName = colorFromName ?? trailingColor[1];
      name = name.slice(0, trailingColor.index).trim();
      continue;
    }
    break;
  }

  return {
    productName: ensureDellPrefix(name).slice(0, 200),
    colorFromName,
  };
}

export function cleanDellModelName(value: string): string {
  return parseDellModelName(value).productName;
}

export function resolveDellCatalogIdentity(
  title: string,
  specs: readonly DellCatalogSpec[],
): DellCatalogIdentity {
  const model = specValue(specs, (label) => label === 'model');
  const source = pickSourceTitle(title, model);
  if (source === '') {
    return parseDellModelName(title);
  }
  return parseDellModelName(source);
}

export function sanitizeDellRequiredSpecs(
  specs: readonly DellCatalogSpec[],
): DellCatalogSpec[] {
  return specs.map((entry) => {
    if (entry.label.toLocaleLowerCase('az') !== 'model') {
      return entry;
    }
    return {
      label: entry.label,
      value: parseDellModelName(entry.value).productName,
    };
  });
}

export function buildDellCatalogProductName(
  title: string,
  specs: readonly DellCatalogSpec[],
): string {
  return resolveDellCatalogIdentity(title, specs).productName;
}

export function buildDellVariantName(
  specs: readonly DellCatalogSpec[],
): string {
  const ram = specValue(specs, isRamSpecLabel);
  const storage = specValue(specs, isStorageSpecLabel);
  const capacity = specValue(specs, (label) => label === 'tutum');
  const length = specValue(specs, (label) => label === 'uzunluq');
  const parts = [storage ?? capacity, ram, length].filter(
    (part): part is string => part !== null && part !== '',
  );
  if (parts.length === 0) {
    return 'Standart';
  }
  return parts.join(' / ').slice(0, 200);
}

function isDellColorSpecLabel(label: string): boolean {
  return (
    label === 'rəng' ||
    label === 'reng' ||
    label.startsWith('rəng (') ||
    label.startsWith('reng (')
  );
}

function pickDellCatalogColor(
  specs: readonly DellCatalogSpec[],
  colorFromName?: string | null,
): string | null {
  for (const entry of specs) {
    if (!isDellColorSpecLabel(entry.label.toLocaleLowerCase('az'))) {
      continue;
    }
    const value = entry.value.trim();
    if (isDellCatalogColorValue(value)) {
      return value;
    }
  }
  if (
    colorFromName !== null &&
    colorFromName !== undefined &&
    isDellCatalogColorValue(colorFromName)
  ) {
    return colorFromName;
  }
  return null;
}

export function buildDellVariantAttributes(
  specs: readonly DellCatalogSpec[],
  colorFromName?: string | null,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const storage = specValue(specs, isStorageSpecLabel);
  const ram = specValue(specs, isRamSpecLabel);
  const capacity = specValue(specs, (label) => label === 'tutum');
  const color = pickDellCatalogColor(specs, colorFromName);

  if (storage !== null) {
    attributes.Yaddaş = storage;
  }
  if (ram !== null) {
    attributes.RAM = ram;
  }
  if (capacity !== null && storage === null && ram === null) {
    if (hasMemoryModuleHint(specs)) {
      attributes.RAM = capacity;
    } else {
      attributes.Yaddaş = capacity;
    }
  }

  if (color !== null) {
    attributes.Rəng = color;
  }
  return attributes;
}
