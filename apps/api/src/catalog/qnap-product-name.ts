/**
 * QNAP catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const QNAP_CATALOG_NAMES: Record<string, string> = {
  'TS-435XEU-4G': 'QNAP TS-435XeU-4G 4-bay rack NAS',
  'TS-873AEU-4G': 'QNAP TS-873AeU-4G 8-bay rack NAS',
  'TS-832PXU-4G-EU': 'QNAP TS-832PXU-4G 8-bay rack NAS',
  'TS-233': 'QNAP TS-233 2-bay NAS',
  'QXG-10G2SF-X710': 'QNAP QXG-10G2SF-X710 10GbE adapter',
  'KOIBOX-100W': 'QNAP KoiBox-100W konfrans kamerası',
  'QSW-M1204-4C': 'QNAP QSW-M1204-4C 12-port 10GbE kommutator',
  'QSW-M408-4C': 'QNAP QSW-M408-4C 12-port kommutator',
  'RAIL-B02': 'QNAP RAIL-B02 rack rels',
  '7212324T-7050000-000-RS': 'QNAP IronWolf 24TB NAS HDD',
  '72123400-6000000-000-RS': 'QNAP IronWolf 4TB NAS HDD',
  '72123800-6051100-000-RS': 'QNAP IronWolf 8TB NAS HDD',
};

export function normalizeQnapSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function listQnapCatalogNameSkus(): string[] {
  return Object.keys(QNAP_CATALOG_NAMES);
}

export function resolveQnapCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = QNAP_CATALOG_NAMES[normalizeQnapSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^qnap\b/i.test(trimmed)) {
    return trimmed;
  }
  return `QNAP ${trimmed}`.trim();
}
