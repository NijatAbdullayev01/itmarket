/**
 * Xerox catalog names: brand + series + model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 * G&G-106R02773 is a compatible cartridge — not a Xerox Genuine supply.
 */

const XEROX_SKU_ALIASES: Record<string, string> = {
  'G&G-106R02773': 'GG-106R02773',
  'GANDG-106R02773': 'GG-106R02773',
};

const XEROX_CATALOG_NAMES: Record<string, string> = {
  C325V_DNI: 'Xerox C325 DNI rəngli lazer MFP',
  C235V_DNI: 'Xerox C235 DNI rəngli lazer MFP',
  C415V_DN: 'Xerox VersaLink C415 DN rəngli lazer MFP',
  B225V_DNI: 'Xerox B225 DNI lazer MFP',
  B235V_DNI: 'Xerox B235 DNI lazer MFP',
  B305V_DNI: 'Xerox B305 DNI lazer MFP',
  B315V_DNI: 'Xerox B315 DNI lazer MFP',
  B415V_DN: 'Xerox VersaLink B415 DN lazer MFP',
  '3025V_BI': 'Xerox WorkCentre 3025BI lazer MFP',
  '3025V_NI': 'Xerox WorkCentre 3025NI lazer MFP',
  B230V_DNI: 'Xerox B230 DNI lazer printer',
  B310V_DNI: 'Xerox B310 DNI lazer printer',
  '3020V_BI': 'Xerox Phaser 3020BI lazer printer',
  'GG-106R02773': 'G&G 106R02773 uyğun qara toner (3020/3025)',
  '006R04404': 'Xerox 006R04404 qara Extra HC toner (B225/B230/B235)',
  '006R04379': 'Xerox 006R04379 qara toner (B305/B310/B315)',
  '006R04387': 'Xerox 006R04387 qara toner (C230/C235)',
  '006R04388': 'Xerox 006R04388 Cyan toner (C230/C235)',
  '006R04389': 'Xerox 006R04389 Magenta toner (C230/C235)',
  '006R04390': 'Xerox 006R04390 Yellow toner (C230/C235)',
  '006R04827': 'Xerox 006R04827 qara toner (C320/C325)',
  '006R04824': 'Xerox 006R04824 Cyan toner (C320/C325)',
  '006R04825': 'Xerox 006R04825 Magenta toner (C320/C325)',
  '006R04826': 'Xerox 006R04826 Yellow toner (C320/C325)',
  '006R04728': 'Xerox 006R04728 qara toner (VersaLink B415)',
  '006R04764': 'Xerox 006R04764 qara High Capacity toner (C415)',
  '006R04765': 'Xerox 006R04765 Cyan High Capacity toner (C415)',
  '006R04766': 'Xerox 006R04766 Magenta High Capacity toner (C415)',
  '006R04767': 'Xerox 006R04767 Yellow High Capacity toner (C415)',
};

export type XeroxNameSpec = {
  label: string;
  value: string;
};

export type XeroxImportBrand = {
  slug: string;
  name: string;
};

export function normalizeXeroxSku(model: string): string {
  const folded = model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, '')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return XEROX_SKU_ALIASES[folded] ?? folded;
}

export function listXeroxCatalogNameSkus(): string[] {
  return Object.keys(XEROX_CATALOG_NAMES);
}

export function isXeroxCompatibleSupply(sku: string): boolean {
  return normalizeXeroxSku(sku) === 'GG-106R02773';
}

export function resolveXeroxImportBrand(sku: string): XeroxImportBrand {
  if (isXeroxCompatibleSupply(sku)) {
    return { slug: 'gg', name: 'G&G' };
  }
  return { slug: 'xerox', name: 'Xerox' };
}

export function resolveXeroxCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = XEROX_CATALOG_NAMES[normalizeXeroxSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (isXeroxCompatibleSupply(sku)) {
    if (/^g\s*&\s*g\b/i.test(trimmed)) {
      return trimmed;
    }
    return `G&G ${trimmed}`.trim();
  }
  if (/^xerox\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Xerox ${trimmed}`.trim();
}

function specValue(
  specs: readonly XeroxNameSpec[],
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

export function isXeroxCatalogColorValue(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase('az');
  if (normalized === '') {
    return false;
  }
  if (
    /^(rəngli|rengli|ağ-qara|ag-qara|ağ qara|ag qara|mono|monochrome|color|colour)$/i.test(
      normalized,
    )
  ) {
    return false;
  }
  return /^(qara|black|cyan|magenta|yellow|sarı|sari)$/i.test(normalized);
}

export function buildXeroxVariantName(
  specs: readonly XeroxNameSpec[],
): string {
  const color = specValue(
    specs,
    (label) => label === 'rəng' || label === 'reng',
  );
  const yieldPages = specValue(specs, (label) => label === 'tutum');
  const parts = [
    color !== null && isXeroxCatalogColorValue(color) ? color : null,
    yieldPages,
  ].filter((part): part is string => part !== null && part !== '');
  if (parts.length === 0) {
    return 'Standart';
  }
  return parts.join(' / ').slice(0, 200);
}

export function buildXeroxVariantAttributes(
  specs: readonly XeroxNameSpec[],
  sku: string,
): Record<string, string> {
  const attributes: Record<string, string> = { Model: sku };
  const color = specValue(
    specs,
    (label) => label === 'rəng' || label === 'reng',
  );
  const yieldPages = specValue(specs, (label) => label === 'tutum');
  if (color !== null && isXeroxCatalogColorValue(color)) {
    attributes.Rəng = color;
  }
  if (yieldPages !== null) {
    attributes.Tutum = yieldPages;
  }
  return attributes;
}
