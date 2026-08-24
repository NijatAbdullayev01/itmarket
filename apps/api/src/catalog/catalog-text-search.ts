import { Prisma } from '../generated/prisma/client';
import {
  compactCatalogSearchToken,
  expandCatalogSearchQuery,
  foldCatalogSearchText,
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

/** Cap synonym expansion so one token cannot explode into dozens of OR clauses. */
const MAX_UNIT_NEEDLES = 8;

function unitSearchNeedles(unit: ExpandedCatalogSearchUnit): string[] {
  const needles: string[] = [];
  for (const term of unit.terms) {
    needles.push(foldCatalogSearchText(term));
    const compact = compactCatalogSearchToken(term);
    if (compact.length >= 3) {
      needles.push(compact);
    }
  }
  return uniqueTerms(needles).slice(0, MAX_UNIT_NEEDLES);
}

function buildUnitWhere(
  unit: ExpandedCatalogSearchUnit,
): Prisma.ProductVariantWhereInput {
  const needles = unitSearchNeedles(unit);
  // search_document is folded and GIN-trigram indexed. LIKE on that column
  // uses the index; extra ILIKE ORs on sku/name/barcode cannot and blow up
  // the plan. Those fields are already concatenated into the document.
  const or: Prisma.ProductVariantWhereInput[] = needles.map((needle) => ({
    searchDocument: { contains: needle },
  }));

  if (or.length === 0) {
    return {};
  }
  if (or.length === 1) {
    return or[0]!;
  }
  return { OR: or };
}

function identifierEqualsWhere(raw: string): Prisma.ProductVariantWhereInput[] {
  if (
    !isCatalogIdentifierToken(raw) &&
    compactCatalogSearchToken(raw).length < 3
  ) {
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

function buildProductNameUnitWhere(
  unit: ExpandedCatalogSearchUnit,
): Prisma.ProductWhereInput {
  const needles = unitSearchNeedles(unit);
  const or: Prisma.ProductWhereInput[] = needles.map((needle) => ({
    name: { contains: needle, mode: TEXT_SEARCH_MODE },
  }));

  if (or.length === 0) {
    return {};
  }
  if (or.length === 1) {
    return or[0]!;
  }
  return { OR: or };
}

/**
 * Admin catalog product list search. Variant haystacks live in the GIN-trigram
 * `search_document` column (name, brand, category, SKU, barcode, specs).
 * Products without variants fall back to name-only ILIKE so we do not scan
 * description/SEO columns on every keystroke.
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
  const productName: Prisma.ProductWhereInput =
    units.length === 1
      ? buildProductNameUnitWhere(units[0]!)
      : { AND: units.map((unit) => buildProductNameUnitWhere(unit)) };

  return {
    OR: [
      { variants: { some: variantWhere } },
      { AND: [{ variants: { none: {} } }, productName] },
    ],
  };
}
