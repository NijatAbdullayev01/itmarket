import { Prisma } from '../generated/prisma/client';
import {
  catalogSearchColorAttributeKeys,
  expandCatalogSearchQuery,
  type ExpandedCatalogSearchUnit,
} from './catalog-search.domain';

const TEXT_SEARCH_MODE = 'insensitive' as const;

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const term of terms) {
    const trimmed = term.trim();
    if (trimmed === '' || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

function buildUnitWhere(
  unit: ExpandedCatalogSearchUnit,
): Prisma.ProductVariantWhereInput {
  const terms = uniqueTerms(unit.terms);
  const colorLabels = uniqueTerms(unit.colorLabels);
  const colorKeys = catalogSearchColorAttributeKeys();
  const or: Prisma.ProductVariantWhereInput[] = [];

  for (const term of terms) {
    or.push(
      { sku: { contains: term, mode: TEXT_SEARCH_MODE } },
      { barcode: { contains: term, mode: TEXT_SEARCH_MODE } },
      { name: { contains: term, mode: TEXT_SEARCH_MODE } },
      {
        product: {
          name: { contains: term, mode: TEXT_SEARCH_MODE },
        },
      },
      {
        product: {
          brand: {
            name: { contains: term, mode: TEXT_SEARCH_MODE },
          },
        },
      },
      {
        product: {
          category: {
            name: { contains: term, mode: TEXT_SEARCH_MODE },
          },
        },
      },
    );

    for (const key of colorKeys) {
      or.push({
        attributes: {
          path: [key],
          string_contains: term,
        },
      });
    }
  }

  for (const label of colorLabels) {
    for (const key of colorKeys) {
      or.push({
        attributes: {
          path: [key],
          equals: label,
        },
      });
    }
  }

  return { OR: or };
}

/**
 * Builds Prisma WHERE for storefront catalog search.
 * Multi-word queries use AND across units; each unit expands AZ/EN color synonyms.
 */
export function buildStorefrontCatalogSearchWhere(
  search: string | undefined,
): Prisma.ProductVariantWhereInput | undefined {
  if (search === undefined) {
    return undefined;
  }

  const units = expandCatalogSearchQuery(search);
  if (units.length === 0) {
    return undefined;
  }

  if (units.length === 1) {
    return buildUnitWhere(units[0]!);
  }

  return {
    AND: units.map((unit) => buildUnitWhere(unit)),
  };
}
