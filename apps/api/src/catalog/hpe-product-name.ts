/**
 * HPE catalog names follow the product form: brand-line + model only.
 * Specs (CPU, RAM, storage, chassis kits) stay in requiredSpecs / variant fields.
 */

export type HpeCatalogSpec = {
  label: string;
  value: string;
};

export type HpeCatalogIdentity = {
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

const TRAILING_PART_NUMBER = /\s*\(([A-Z0-9][A-Z0-9._-]*\d[A-Z0-9._-]*)\)\s*$/i;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function specValue(
  specs: readonly HpeCatalogSpec[],
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

function foldLabel(label: string): string {
  return label.toLocaleLowerCase('az');
}

/** English DIMM tokens: az-AZ lowercases I → ı, which breaks `rdimm` checks. */
function foldTechnical(value: string): string {
  return foldLabel(value).replaceAll('ı', 'i');
}

function isRamSpecLabel(label: string): boolean {
  const folded = foldLabel(label);
  return (
    folded === 'ram' ||
    folded.startsWith('ram (') ||
    folded.includes('müvəqqəti')
  );
}

function hasMemoryModuleHint(specs: readonly HpeCatalogSpec[]): boolean {
  return specs.some((entry) => {
    const label = foldTechnical(entry.label);
    const value = foldTechnical(entry.value);
    return (
      label.includes('rank') ||
      label.includes('yaddas tezliyi') ||
      label.includes('yaddas tipi') ||
      label.startsWith('buffer') ||
      /\brdimm\b|\budimm\b/.test(label) ||
      /\brdimm\b|\budimm\b|\bdimm\b/.test(value) ||
      /\bregistered\b|\bunbuffered\b|\bunregistered\b/.test(value)
    );
  });
}

function yaddasLooksLikeRam(value: string): boolean {
  const folded = foldTechnical(value);
  if (/\brdimm\b|\budimm\b|\bdimm\b/.test(folded)) {
    return true;
  }
  return /\bddr[45]\b/.test(folded) && /\d+\s*gb\b/.test(folded);
}

function isCapacitySpecLabel(label: string): boolean {
  const folded = foldLabel(label);
  return folded === 'tutum' || folded.endsWith(' tutumu');
}

export function normalizeHpeSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

function isIncompleteHpeModel(value: string): boolean {
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
  if (/^hpe\s+\d+(?:\.\d+)?\s*(?:gb|tb)\s+ri ssd$/i.test(name)) {
    return true;
  }
  if (/^(sfp\+|sfp28)\s+(sr|dac)\b/i.test(name) && name.length < 24) {
    return true;
  }
  return false;
}

function ensureHpePrefix(value: string): string {
  const name = value.replace(/\s+for\s+HPE\b/gi, '').trim();
  if (/^HPE\b/i.test(name)) {
    return name.replace(/^hpe\b/i, 'HPE');
  }
  if (/^HP\b/i.test(name)) {
    return name.replace(/^hp\b/i, 'HPE');
  }
  return `HPE ${name}`;
}

function remainderLooksLikeAccessory(afterMatch: string): boolean {
  const after = collapseWhitespace(afterMatch).replace(
    TRAILING_PART_NUMBER,
    '',
  );
  if (after === '') {
    return false;
  }
  return /\b(kit|fan|heatsink|heat\s*sink|baffle|riser|cable|battery|holder|cage|backplane|converter|controller|module)\b/i.test(
    after,
  );
}

function compactProLiantName(value: string): string | null {
  const match = value.match(
    /\bProLiant\s+(DL|ML|RL|XL)\s*(\d+)\s+(Gen\s*\d+(?:\s*\+|\s+Plus)?)/i,
  );
  if (
    match?.[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined ||
    match.index === undefined
  ) {
    return null;
  }
  const after = value.slice(match.index + match[0].length);
  if (remainderLooksLikeAccessory(after)) {
    return null;
  }
  const family = match[1].toUpperCase();
  const number = match[2];
  const generation = collapseWhitespace(
    match[3].replace(/Gen\s+/i, 'Gen').replace(/\+$/, ' Plus'),
  );
  return `HPE ProLiant ${family}${number} ${generation}`;
}

function compactXeonName(value: string): string | null {
  const match = value.match(
    /\bXeon\s+(Bronze|Silver|Gold|Platinum)\s+(\d{4}[A-Z]?)\b/i,
  );
  if (match?.[1] === undefined || match[2] === undefined) {
    return null;
  }
  const tier = `${match[1].slice(0, 1).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
  return `HPE Intel Xeon ${tier} ${match[2].toUpperCase()}`;
}

function pickSourceTitle(title: string, model: string | null): string {
  const modelName = collapseWhitespace(model ?? '');
  const titleName = collapseWhitespace(title).replace(TRAILING_PART_NUMBER, '');

  if (/proliant/i.test(modelName) || /xeon/i.test(modelName)) {
    return modelName;
  }
  if (titleName !== '' && isIncompleteHpeModel(modelName)) {
    return titleName;
  }
  if (modelName !== '' && !isIncompleteHpeModel(modelName)) {
    return modelName;
  }
  return titleName !== '' ? titleName : modelName;
}

function catalogSkuFromSpecs(specs: readonly HpeCatalogSpec[]): string | null {
  return specValue(specs, (label) => {
    const folded = foldLabel(label);
    return folded === 'part number' || folded === 'part nömrəsi';
  });
}

function stripSkuFromName(value: string, sku: string | null): string {
  if (sku === null || sku === '') {
    return value;
  }
  const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return collapseWhitespace(
    value.replace(new RegExp(`\\(?${escaped}\\)?`, 'gi'), ' '),
  );
}

export function parseHpeModelName(
  value: string,
  sku: string | null = null,
): HpeCatalogIdentity {
  let name = collapseWhitespace(value);
  name = stripSkuFromName(name, sku);
  name = name.replace(/\s*\(SKU\b[^)]*\)/gi, '').trim();
  name = name.replace(TRAILING_PART_NUMBER, '').trim();
  name = ensureHpePrefix(name);

  const xeon = compactXeonName(name);
  if (xeon !== null) {
    return { productName: xeon.slice(0, 200), colorFromName: null };
  }
  const proliant = compactProLiantName(name);
  if (proliant !== null) {
    return { productName: proliant.slice(0, 200), colorFromName: null };
  }

  return {
    productName: collapseWhitespace(name).slice(0, 200),
    colorFromName: null,
  };
}

export function cleanHpeModelName(value: string): string {
  return parseHpeModelName(value).productName;
}

export function resolveHpeCatalogIdentity(
  title: string,
  specs: readonly HpeCatalogSpec[],
): HpeCatalogIdentity {
  const sku = catalogSkuFromSpecs(specs);
  const model =
    specValue(specs, (label) => foldLabel(label) === 'model') ??
    specValue(specs, (label) => foldLabel(label) === 'tam ad');
  const source = pickSourceTitle(title, model);
  if (source === '') {
    return parseHpeModelName(title, sku);
  }
  return parseHpeModelName(source, sku);
}

export function sanitizeHpeRequiredSpecs(
  specs: readonly HpeCatalogSpec[],
): HpeCatalogSpec[] {
  const sku = catalogSkuFromSpecs(specs);
  return specs.map((entry) => {
    const label = foldLabel(entry.label);
    if (label !== 'model' && label !== 'tam ad') {
      return entry;
    }
    return {
      label: entry.label,
      value: parseHpeModelName(entry.value, sku).productName,
    };
  });
}

export function buildHpeCatalogProductName(
  title: string,
  specs: readonly HpeCatalogSpec[],
): string {
  return resolveHpeCatalogIdentity(title, specs).productName;
}

function ramFromSpecs(specs: readonly HpeCatalogSpec[]): string | null {
  const explicit = specValue(specs, isRamSpecLabel);
  if (explicit !== null) {
    return explicit;
  }
  const yaddas = specValue(
    specs,
    (label) => foldLabel(label) === 'yaddaş' || foldLabel(label) === 'yaddas',
  );
  if (
    yaddas !== null &&
    (yaddasLooksLikeRam(yaddas) || hasMemoryModuleHint(specs))
  ) {
    return yaddas;
  }
  return null;
}

function storageFromSpecs(specs: readonly HpeCatalogSpec[]): string | null {
  const saxlama = specValue(specs, (label) => foldLabel(label) === 'saxlama');
  if (saxlama !== null) {
    return saxlama;
  }
  const yaddas = specValue(
    specs,
    (label) =>
      foldLabel(label) === 'yaddaş' ||
      foldLabel(label) === 'yaddas' ||
      foldLabel(label).startsWith('yaddaş (') ||
      foldLabel(label).startsWith('yaddas ('),
  );
  if (
    yaddas !== null &&
    !yaddasLooksLikeRam(yaddas) &&
    !hasMemoryModuleHint(specs) &&
    !/\bddr[45]\b/i.test(foldTechnical(yaddas))
  ) {
    return yaddas;
  }
  return null;
}

export function buildHpeVariantName(specs: readonly HpeCatalogSpec[]): string {
  const ram = ramFromSpecs(specs);
  const storage = storageFromSpecs(specs);
  const capacity = specValue(specs, isCapacitySpecLabel);
  const length = specValue(specs, (label) => foldLabel(label) === 'uzunluq');
  const parts = [storage ?? capacity, ram, length].filter(
    (part): part is string => part !== null && part !== '',
  );
  if (parts.length === 0) {
    return 'Standart';
  }
  return parts.join(' / ').slice(0, 200);
}

export function buildHpeVariantAttributes(
  specs: readonly HpeCatalogSpec[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const storage = storageFromSpecs(specs);
  const ram = ramFromSpecs(specs);
  const capacity = specValue(specs, isCapacitySpecLabel);

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

  return attributes;
}
