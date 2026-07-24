export const CATALOG_PRICE_MONEY =
  /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

export type CatalogPriceImportMatchStatus =
  | 'matched'
  | 'not_found'
  | 'ambiguous'
  | 'invalid'
  | 'no_variants'
  | 'unchanged';

export type CatalogPriceImportCandidate = {
  productId: string;
  brandName: string;
  modelName: string;
  variants: Array<{
    id: string;
    price: string;
    previousPrice: string | null;
  }>;
};

export type CatalogPriceImportInputRow = {
  rowNumber: number;
  brand: string;
  model: string;
  price: string;
  previousPrice?: string;
};

export type CatalogPriceImportResolvedRow = {
  rowNumber: number;
  brand: string;
  model: string;
  price: string;
  previousPrice: string | null;
  status: CatalogPriceImportMatchStatus;
  message: string | null;
  productId: string | null;
  variantIds: string[];
};

export function normalizeCatalogPriceImportKey(value: string): string {
  return value.trim().toLocaleLowerCase('az');
}

export function catalogPriceImportLookupKey(
  brand: string,
  model: string,
): string {
  return `${normalizeCatalogPriceImportKey(brand)}\u0000${normalizeCatalogPriceImportKey(model)}`;
}

export function isValidCatalogPriceMoney(value: string): boolean {
  return CATALOG_PRICE_MONEY.test(value.trim());
}

function pricesEqual(
  left: string,
  right: string | null | undefined,
): boolean {
  if (right === undefined || right === null) {
    return false;
  }
  return Number(left) === Number(right);
}

/**
 * Resolve one Excel/API row against an in-memory index of brand+model → products.
 * Multi-product matches are ambiguous; multi-variant matches update every variant.
 */
export function resolveCatalogPriceImportRow(
  row: CatalogPriceImportInputRow,
  index: Map<string, CatalogPriceImportCandidate[]>,
): CatalogPriceImportResolvedRow {
  const brand = row.brand.trim();
  const model = row.model.trim();
  const price = row.price.trim();
  const previousPrice =
    row.previousPrice === undefined || row.previousPrice.trim() === ''
      ? null
      : row.previousPrice.trim();

  if (brand === '' || model === '') {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'invalid',
      message: 'Brend və model tələb olunur',
      productId: null,
      variantIds: [],
    };
  }

  if (!isValidCatalogPriceMoney(price)) {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'invalid',
      message: 'Qiymət formatı yanlışdır (məs. 1299.99)',
      productId: null,
      variantIds: [],
    };
  }

  if (previousPrice !== null && !isValidCatalogPriceMoney(previousPrice)) {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'invalid',
      message: 'Əvvəlki qiymət formatı yanlışdır',
      productId: null,
      variantIds: [],
    };
  }

  const matches =
    index.get(catalogPriceImportLookupKey(brand, model)) ?? [];

  if (matches.length === 0) {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'not_found',
      message: 'Brend və modelə uyğun məhsul tapılmadı',
      productId: null,
      variantIds: [],
    };
  }

  if (matches.length > 1) {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'ambiguous',
      message: `Eyni brend/model üçün ${matches.length} məhsul tapıldı`,
      productId: null,
      variantIds: [],
    };
  }

  const product = matches[0]!;
  if (product.variants.length === 0) {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'no_variants',
      message: 'Məhsulun yenilənə bilən SKU variantı yoxdur',
      productId: product.productId,
      variantIds: [],
    };
  }

  const needsUpdate = product.variants.some((variant) => {
    if (!pricesEqual(price, variant.price)) {
      return true;
    }
    if (previousPrice === null) {
      return false;
    }
    return !pricesEqual(previousPrice, variant.previousPrice);
  });

  if (!needsUpdate) {
    return {
      rowNumber: row.rowNumber,
      brand,
      model,
      price,
      previousPrice,
      status: 'unchanged',
      message: 'Qiymət artıq eynidir',
      productId: product.productId,
      variantIds: product.variants.map((variant) => variant.id),
    };
  }

  return {
    rowNumber: row.rowNumber,
    brand,
    model,
    price,
    previousPrice,
    status: 'matched',
    message: null,
    productId: product.productId,
    variantIds: product.variants.map((variant) => variant.id),
  };
}

export function buildCatalogPriceImportIndex(
  products: CatalogPriceImportCandidate[],
): Map<string, CatalogPriceImportCandidate[]> {
  const index = new Map<string, CatalogPriceImportCandidate[]>();
  for (const product of products) {
    const key = catalogPriceImportLookupKey(
      product.brandName,
      product.modelName,
    );
    const bucket = index.get(key);
    if (bucket === undefined) {
      index.set(key, [product]);
    } else {
      bucket.push(product);
    }
  }
  return index;
}
