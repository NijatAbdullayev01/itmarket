/**
 * Delta UPS catalog names: brand + series + capacity (or accessory type).
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const DELTA_CATALOG_NAMES: Record<string, string> = {
  UPA302R2RX0B035: 'Delta Amplon RT Gen3 3kVA 230V',
  UPS203R6RT2N035: 'Delta Amplon RT 20kVA 400V',
  UPS303HH330N035: 'Delta Ultron HPH Gen.2 30kVA 400V',
  UPS403HH330N035: 'Delta Ultron HPH Gen.2 40kVA 400V',
  UPS502R2RT2N035: 'Delta Amplon RT 5kVA 230V',
  BBU161B107035: 'Delta Amplon RT 2U EBC 16×7Ah',
  BBU201B109035: 'Delta Amplon RT 3U EBC 20×9Ah',
  SCMS100035: 'Delta Mini SNMP IPv6 kartı',
};

export function listDeltaCatalogNameSkus(): string[] {
  return Object.keys(DELTA_CATALOG_NAMES);
}

export function resolveDeltaCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = DELTA_CATALOG_NAMES[sku.trim().toUpperCase()];
  if (catalogName !== undefined) {
    return catalogName;
  }
  return fallbackTitle.replace(/^Delta Electronics\s+/i, 'Delta ').trim();
}
