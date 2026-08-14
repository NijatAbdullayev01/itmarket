export type CatalogSpecEntry = {
  label: string;
  value: string;
};

function foldLabel(label: string) {
  return label.trim().toLocaleLowerCase('az');
}

function looksLikeManufacturerPartNumber(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) {
    return false;
  }
  if (/\s/.test(trimmed)) {
    return false;
  }
  const compact = trimmed.replace(/[^A-Za-z0-9]/g, '');
  return /\d/.test(compact) && compact.length >= 3;
}

export function isMarketingCatalogTitle(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }
  if (trimmed.length > 48) {
    return true;
  }
  if (/,/.test(trimmed)) {
    return true;
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    return true;
  }
  return false;
}

export function specModelValue(specs: readonly CatalogSpecEntry[]): string | null {
  const found = specs.find((entry) => foldLabel(entry.label) === 'model');
  if (found === undefined) {
    return null;
  }
  const value = found.value.trim();
  return value === '' ? null : value;
}

export function manufacturerModelFromCatalogSlug(
  brandSlug: string,
  slug: string,
): string | null {
  const prefix = `${brandSlug.trim().toLowerCase()}-`;
  const normalized = slug.trim().toLowerCase();
  if (!normalized.startsWith(prefix)) {
    return null;
  }
  const rest = slug.trim().slice(prefix.length);
  if (rest === '') {
    return null;
  }
  const model = rest.toUpperCase();
  return looksLikeManufacturerPartNumber(model) ? model : null;
}

export function modelFromSeoTitle(
  brandName: string,
  seoTitle: string | null | undefined,
): string | null {
  const title = seoTitle?.trim() ?? '';
  if (title === '') {
    return null;
  }
  const withoutBrand = title.replace(
    new RegExp(`^${brandName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'),
    '',
  );
  const firstToken = withoutBrand.split(/\s+/)[0] ?? '';
  if (!looksLikeManufacturerPartNumber(firstToken)) {
    return null;
  }
  return firstToken;
}

/**
 * Storefront "Model" must be the manufacturer code, not the marketing title.
 * Prefer a compact Model spec (UGREEN HD104); otherwise the value currently
 * stored as SKU (APC BV1000I-GR).
 */
export function resolveManufacturerModel(input: {
  productName: string;
  sku: string;
  specs: readonly CatalogSpecEntry[];
  fallbackModel?: string | null;
  seoTitle?: string | null;
  brandName?: string;
  skuLooksSiteGenerated?: boolean;
}): string {
  const specModel = specModelValue(input.specs);
  if (specModel !== null && !isMarketingCatalogTitle(specModel)) {
    return specModel;
  }

  const seoModel = modelFromSeoTitle(input.brandName ?? '', input.seoTitle);
  const productName = input.productName.trim();
  if (
    seoModel !== null &&
    seoModel.includes('.') &&
    !productName.includes('.')
  ) {
    return seoModel;
  }

  if (looksLikeManufacturerPartNumber(productName)) {
    return productName;
  }

  const sku = input.sku.trim();
  if (
    looksLikeManufacturerPartNumber(sku) &&
    input.skuLooksSiteGenerated !== true
  ) {
    return sku;
  }

  const fallback = input.fallbackModel?.trim() ?? '';
  if (looksLikeManufacturerPartNumber(fallback)) {
    return fallback;
  }

  if (seoModel !== null) {
    return seoModel;
  }
  if (fallback !== '') {
    return fallback;
  }
  if (productName !== '') {
    return productName;
  }
  return sku;
}

export function replaceSpecModel(
  specs: readonly CatalogSpecEntry[],
  model: string,
): CatalogSpecEntry[] {
  let replaced = false;
  const next = specs.map((entry) => {
    if (foldLabel(entry.label) !== 'model') {
      return entry;
    }
    replaced = true;
    return { label: entry.label, value: model };
  });
  return replaced ? next : [...specs];
}
