import { Prisma } from '../generated/prisma/client';
import {
  catalogSearchColorAttributeKeys,
  expandCatalogSearchUnit,
} from './catalog-search.domain';

export const CATALOG_STORAGE_ATTRIBUTE_KEYS = [
  'Daimi yaddaş',
  'daimi yaddaş',
  'Yaddaş',
  'yaddaş',
  'Storage',
  'storage',
  'ROM',
  'rom',
] as const;

export const CATALOG_RAM_ATTRIBUTE_KEYS = [
  'Müvəqqəti yaddaş',
  'müvəqqəti yaddaş',
  'Muveqqeti yaddas',
  'RAM',
  'ram',
] as const;

export type StorefrontCatalogFacetFilters = {
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  color?: string;
  ram?: string;
  storage?: string;
};

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed === '' || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

/** Expand capacity labels like `8GB` / `1TB` into common catalog spellings. */
export function expandCapacityFilterValue(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === '') {
    return [];
  }

  const match = trimmed.match(/^(\d+)\s*(GB|TB)$/iu);
  if (match === null) {
    return [trimmed];
  }

  const amount = match[1]!;
  const unit = match[2]!.toUpperCase();
  const unitLower = unit.toLowerCase();
  const compact = `${amount}${unit}`;
  const spaced = `${amount} ${unit}`;
  const compactLower = `${amount}${unitLower}`;
  const spacedLower = `${amount} ${unitLower}`;

  return uniqueStrings([
    compact,
    spaced,
    compactLower,
    spacedLower,
    `${compact} SSD`,
    `${spaced} SSD`,
    `${compactLower} SSD`,
    `${spacedLower} SSD`,
    `${compact}ssd`,
    `${spaced} ssd`,
  ]);
}

function buildJsonAttributeWhere(
  keys: readonly string[],
  candidates: string[],
): Prisma.ProductVariantWhereInput | undefined {
  const values = uniqueStrings(candidates);
  if (keys.length === 0 || values.length === 0) {
    return undefined;
  }

  return {
    OR: keys.flatMap((key) =>
      values.map((candidate) => ({
        attributes: {
          path: [key],
          equals: candidate,
        },
      })),
    ),
  };
}

export function buildColorFacetWhere(
  color: string | undefined,
): Prisma.ProductVariantWhereInput | undefined {
  if (color === undefined) {
    return undefined;
  }

  const trimmed = color.trim();
  if (trimmed === '') {
    return undefined;
  }

  const expanded = expandCatalogSearchUnit(trimmed);
  return buildJsonAttributeWhere(catalogSearchColorAttributeKeys(), [
    trimmed,
    ...expanded.colorLabels,
  ]);
}

export function buildCapacityFacetWhere(
  keys: readonly string[],
  value: string | undefined,
): Prisma.ProductVariantWhereInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  return buildJsonAttributeWhere(keys, expandCapacityFilterValue(value));
}

export function buildStorefrontCatalogFacetWhere(
  filters: StorefrontCatalogFacetFilters,
): Prisma.ProductVariantWhereInput | undefined {
  const clauses: Prisma.ProductVariantWhereInput[] = [];

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    clauses.push({
      price: {
        ...(filters.minPrice === undefined
          ? {}
          : { gte: new Prisma.Decimal(filters.minPrice) }),
        ...(filters.maxPrice === undefined
          ? {}
          : { lte: new Prisma.Decimal(filters.maxPrice) }),
      },
    });
  }

  if (filters.onSale === true) {
    clauses.push({ previousPrice: { not: null } });
  }

  if (filters.inStock === true) {
    clauses.push({
      balances: {
        some: {
          onHand: { gt: 0 },
          location: { active: true },
        },
      },
    });
  }

  const colorWhere = buildColorFacetWhere(filters.color);
  if (colorWhere !== undefined) {
    clauses.push(colorWhere);
  }

  const ramWhere = buildCapacityFacetWhere(
    CATALOG_RAM_ATTRIBUTE_KEYS,
    filters.ram,
  );
  if (ramWhere !== undefined) {
    clauses.push(ramWhere);
  }

  const storageWhere = buildCapacityFacetWhere(
    CATALOG_STORAGE_ATTRIBUTE_KEYS,
    filters.storage,
  );
  if (storageWhere !== undefined) {
    clauses.push(storageWhere);
  }

  if (clauses.length === 0) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { AND: clauses };
}
