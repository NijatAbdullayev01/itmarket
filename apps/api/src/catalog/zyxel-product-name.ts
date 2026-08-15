/**
 * Zyxel catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const ZYXEL_CATALOG_NAMES: Record<string, string> = {
  GS1008HP: 'Zyxel GS1008HP 8-port PoE+ kommutator',
  'GS1100-10HP': 'Zyxel GS1100-10HP 8-port PoE+ kommutator',
  'GS1100-16': 'Zyxel GS1100-16 16-port kommutator',
  'GS1100-24E': 'Zyxel GS1100-24E 24-port kommutator',
  'GS1900-48': 'Zyxel GS1900-48 48-port kommutator',
  'GS1900-48HPV2': 'Zyxel GS1900-48HPv2 48-port PoE+ kommutator',
  'GS1920-24HPV2': 'Zyxel GS1920-24HPv2 24-port PoE+ kommutator',
  'GS1920-48HPV2': 'Zyxel GS1920-48HPv2 48-port PoE+ kommutator',
  'XGS1935-28': 'Zyxel XGS1935-28 24-port kommutator',
  'XGS1935-52': 'Zyxel XGS1935-52 48-port kommutator',
  'GS2220-10': 'Zyxel GS2220-10 8-port kommutator',
  'GS2220-28HP': 'Zyxel GS2220-28HP 24-port PoE+ kommutator',
  NWA50AX: 'Zyxel NWA50AX Wi-Fi 6 Access Point',
  NWA55AXE: 'Zyxel NWA55AXE outdoor Wi-Fi 6 Access Point',
  WAX300H: 'Zyxel WAX300H wall-plate Wi-Fi 6 Access Point',
};

export function normalizeZyxelSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function listZyxelCatalogNameSkus(): string[] {
  return Object.keys(ZYXEL_CATALOG_NAMES);
}

export function resolveZyxelCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = ZYXEL_CATALOG_NAMES[normalizeZyxelSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^zyxel\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Zyxel ${trimmed}`.trim();
}
