/**
 * Internal HDD catalog names from qnaphdds.xlsx: brand + series + part + capacity + type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type QnaphddsBrandRef = {
  name: string;
  slug: string;
};

const QNAPHDD_CATALOG_NAMES: Record<string, string> = {
  ST1000VX013: 'Seagate SkyHawk ST1000VX013 1TB nəzarət HDD',
  ST4000VN006: 'Seagate IronWolf ST4000VN006 4TB NAS HDD',
  ST4000NM024B: 'Seagate Exos 7E10 ST4000NM024B 4TB server HDD',
  ST6000VX009: 'Seagate SkyHawk ST6000VX009 6TB nəzarət HDD',
  ST8000VX010: 'Seagate SkyHawk ST8000VX010 8TB nəzarət HDD',
  ST8000NM017B: 'Seagate Exos 7E10 ST8000NM017B 8TB server HDD',
  ST8000VN004: 'Seagate IronWolf ST8000VN004 8TB NAS HDD',
  ST10000NM017B: 'Seagate Exos 7E10 ST10000NM017B 10TB server HDD',
  ST10000VE001: 'Seagate SkyHawk AI ST10000VE001 10TB nəzarət HDD',
  ST12000NM000J: 'Seagate Exos X18 ST12000NM000J 12TB server HDD',
  ST16000NM002H: 'Seagate Exos X24 ST16000NM002H 16TB server HDD',
  ST16000NT001: 'Seagate IronWolf Pro ST16000NT001 16TB NAS HDD',
  WUH722016CLE6: 'WD Ultrastar DC HC555 WUH722016CLE6 16TB server HDD',
  MG09ACA18TE: 'Toshiba MG09ACA18TE 18TB server HDD',
  ST20000NT001: 'Seagate IronWolf Pro ST20000NT001 20TB NAS HDD',
  MG10ACA20TE: 'Toshiba MG10ACA20TE 20TB server HDD',
  ST20000NM007D: 'Seagate Exos X20 ST20000NM007D 20TB server HDD',
  ST20000NM002H: 'Seagate Exos X24 ST20000NM002H 20TB server HDD',
  ST24000NM002H: 'Seagate Exos X24 ST24000NM002H 24TB server HDD',
  ST28000NM003K: 'Seagate Exos M ST28000NM003K 28TB server HDD',
  ST30000NM004K: 'Seagate Exos M ST30000NM004K 30TB server HDD',
  ST32000NM004K: 'Seagate Exos M ST32000NM004K 32TB server HDD',
};

export function normalizeQnaphddsSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveQnaphddsBrand(sku: string): QnaphddsBrandRef {
  const normalized = normalizeQnaphddsSku(sku);
  if (normalized.startsWith('WUH') || normalized.startsWith('WD')) {
    return { name: 'WD', slug: 'wd' };
  }
  if (normalized.startsWith('MG')) {
    return { name: 'Toshiba', slug: 'toshiba' };
  }
  if (normalized.startsWith('ST')) {
    return { name: 'Seagate', slug: 'seagate' };
  }
  throw new Error(`Unknown HDD brand for SKU: ${sku}`);
}

export function listQnaphddsCatalogNameSkus(): string[] {
  return Object.keys(QNAPHDD_CATALOG_NAMES);
}

export function resolveQnaphddsCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = QNAPHDD_CATALOG_NAMES[normalizeQnaphddsSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  const brand = resolveQnaphddsBrand(sku).name;
  const brandPrefix = new RegExp(`^${brand}\\b`, 'i');
  if (brandPrefix.test(trimmed)) {
    return trimmed;
  }
  return `${brand} ${trimmed}`.trim();
}
