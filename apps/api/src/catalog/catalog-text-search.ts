import { Prisma } from '../generated/prisma/client';
import {
  CATALOG_REQUIRED_SPEC_SEARCH_LIMIT,
  catalogSearchColorAttributeKeys,
  catalogSearchJsonAttributeKeys,
  expandCatalogSearchQuery,
  isCatalogIdentifierToken,
  type ExpandedCatalogSearchUnit,
} from '../storefront/catalog-search.domain';

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

function requiredSpecValueWhere(term: string): Prisma.ProductWhereInput[] {
  const clauses: Prisma.ProductWhereInput[] = [];
  for (let index = 0; index < CATALOG_REQUIRED_SPEC_SEARCH_LIMIT; index += 1) {
    clauses.push({
      requiredSpecs: {
        path: [String(index), 'value'],
        string_contains: term,
      },
    });
  }
  return clauses;
}

function buildUnitWhere(
  unit: ExpandedCatalogSearchUnit,
): Prisma.ProductVariantWhereInput {
  const terms = uniqueTerms(unit.terms);
  const colorLabels = uniqueTerms(unit.colorLabels);
  const jsonKeys = catalogSearchJsonAttributeKeys();
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
          slug: { contains: term, mode: TEXT_SEARCH_MODE },
        },
      },
      {
        product: {
          description: { contains: term, mode: TEXT_SEARCH_MODE },
        },
      },
      {
        product: {
          seoTitle: { contains: term, mode: TEXT_SEARCH_MODE },
        },
      },
      {
        product: {
          seoDescription: { contains: term, mode: TEXT_SEARCH_MODE },
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
      ...requiredSpecValueWhere(term).map((productWhere) => ({
        product: productWhere,
      })),
    );

    for (const key of jsonKeys) {
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

function identifierEqualsWhere(raw: string): Prisma.ProductVariantWhereInput[] {
  if (!isCatalogIdentifierToken(raw)) {
    return [];
  }
  return [
    { sku: { equals: raw, mode: TEXT_SEARCH_MODE } },
    { barcode: { equals: raw, mode: TEXT_SEARCH_MODE } },
  ];
}

function identifierShortCircuitWhere(
  search: string,
  units: readonly ExpandedCatalogSearchUnit[],
): Prisma.ProductVariantWhereInput[] {
  const allIdentifierLike = units.every((unit) =>
    unit.terms.some((term) => isCatalogIdentifierToken(term)),
  );
  if (!allIdentifierLike) {
    return [];
  }

  const clauses: Prisma.ProductVariantWhereInput[] = [];
  const seen = new Set<string>();

  const addRaw = (raw: string) => {
    const key = raw.trim();
    if (key === '' || seen.has(key)) {
      return;
    }
    seen.add(key);
    clauses.push(...identifierEqualsWhere(key));
  };

  addRaw(search);
  for (const unit of units) {
    for (const term of unit.terms) {
      addRaw(term);
    }
  }

  return clauses;
}

function combineSearchWhere(
  units: readonly ExpandedCatalogSearchUnit[],
  search: string,
): Prisma.ProductVariantWhereInput {
  const tokenAnd: Prisma.ProductVariantWhereInput =
    units.length === 1
      ? buildUnitWhere(units[0]!)
      : { AND: units.map((unit) => buildUnitWhere(unit)) };

  const identifiers = identifierShortCircuitWhere(search, units);
  if (identifiers.length === 0) {
    return tokenAnd;
  }

  return { OR: [tokenAnd, ...identifiers] };
}

/**
 * Builds Prisma WHERE for catalog variant search (storefront, POS, inventory).
 * Multi-word queries use AND across units; SKU/barcode tokens also match exactly
 * so "CD361 35855" finds the product even when the model is not in the title.
 */
export function buildProductVariantCatalogSearchWhere(
  search: string | undefined,
): Prisma.ProductVariantWhereInput | undefined {
  if (search === undefined) {
    return undefined;
  }

  const units = expandCatalogSearchQuery(search);
  if (units.length === 0) {
    return undefined;
  }

  return combineSearchWhere(units, search);
}

function buildProductScalarUnitWhere(
  unit: ExpandedCatalogSearchUnit,
): Prisma.ProductWhereInput {
  const terms = uniqueTerms(unit.terms);
  const or: Prisma.ProductWhereInput[] = [];

  for (const term of terms) {
    or.push(
      { name: { contains: term, mode: TEXT_SEARCH_MODE } },
      { slug: { contains: term, mode: TEXT_SEARCH_MODE } },
      { description: { contains: term, mode: TEXT_SEARCH_MODE } },
      { seoTitle: { contains: term, mode: TEXT_SEARCH_MODE } },
      { seoDescription: { contains: term, mode: TEXT_SEARCH_MODE } },
      {
        brand: {
          name: { contains: term, mode: TEXT_SEARCH_MODE },
        },
      },
      {
        category: {
          name: { contains: term, mode: TEXT_SEARCH_MODE },
        },
      },
      ...requiredSpecValueWhere(term),
    );
  }

  return { OR: or };
}

/**
 * Admin catalog product list search. Looks through product fields, specs,
 * and nested variants (SKU / barcode / model attributes).
 */
export function buildCatalogProductSearchWhere(
  search: string | undefined,
): Prisma.ProductWhereInput | undefined {
  if (search === undefined) {
    return undefined;
  }

  const units = expandCatalogSearchQuery(search);
  if (units.length === 0) {
    return undefined;
  }

  const variantWhere = combineSearchWhere(units, search);
  const productScalar: Prisma.ProductWhereInput =
    units.length === 1
      ? buildProductScalarUnitWhere(units[0]!)
      : { AND: units.map((unit) => buildProductScalarUnitWhere(unit)) };

  return {
    OR: [{ variants: { some: variantWhere } }, productScalar],
  };
}
