/**
 * Shared catalog free-text search: tokenization, AZ↔EN color synonyms,
 * ASCII folding, and identifier matching (SKU / model codes).
 */

const COLOR_ATTRIBUTE_KEYS = [
  "Rəng",
  "rəng",
  "Color",
  "color",
  "Renk",
  "renk",
] as const;

export const CATALOG_MODEL_ATTRIBUTE_KEYS = [
  "Model",
  "model",
  "MODEL",
  "MPN",
  "mpn",
  "EAN",
  "ean",
  "Kod",
  "kod",
  "SKU",
  "sku",
  "Artikul",
  "artikul",
  "Part number",
  "Part Number",
  "part number",
  "Model No",
  "Model no",
  "Модель",
] as const;

/** How many requiredSpecs[i].value paths Prisma JSON filters should probe. */
export const CATALOG_REQUIRED_SPEC_SEARCH_LIMIT = 24;

/** Equivalent color labels (AZ catalog + English + ASCII folds). */
const COLOR_SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["Qara", "qara", "black", "kara"],
  ["Ağ", "ağ", "ag", "white"],
  ["Gümüşü", "gümüşü", "gumusu", "silver"],
  ["Mavi", "mavi", "blue"],
  ["Tünd mavi", "tünd mavi", "tund mavi", "navy", "dark blue", "darkblue"],
  ["Qırmızı", "qırmızı", "qirmizi", "red"],
  ["Yaşıl", "yaşıl", "yasil", "green"],
  ["Bənövşəyi", "bənövşəyi", "benovseyi", "purple", "violet"],
  ["Çəhrayı", "çəhrayı", "cehrayi", "pink"],
  ["Qızılı", "qızılı", "qizili", "gold"],
  ["Narıncı", "narıncı", "narinci", "orange"],
  ["Sarı", "sarı", "sari", "yellow"],
  ["Boz", "boz", "gray", "grey"],
  ["Bej", "bej", "beige"],
  ["Titan", "titan", "titanium"],
  ["Titan Ağ", "titan ağ", "titan ag", "titan white", "titanium white"],
  ["Titan Qara", "titan qara", "titan black", "titanium black"],
  ["Titan Mavi", "titan mavi", "titan blue", "titanium blue"],
  [
    "Titan Bənövşəyi",
    "titan bənövşəyi",
    "titan benovseyi",
    "titan purple",
    "titanium purple",
  ],
  [
    "Titan Gümüşü",
    "titan gümüşü",
    "titan gumusu",
    "titan silver",
    "titanium silver",
  ],
  ["Space Gray", "space gray", "space grey", "spacegray"],
  ["Ultramarin", "ultramarin", "ultramarine"],
  ["Ultramarin mavi", "ultramarin mavi", "ultramarine blue"],
  ["Kosmik narıncı", "kosmik narıncı", "kosmik narinci", "cosmic orange"],
  ["Dərin bənövşəyi", "dərin bənövşəyi", "derin benovseyi", "deep purple"],
];

export type ExpandedCatalogSearchUnit = {
  /** OR-matched text terms (original, folded, synonyms, identifier fragments). */
  terms: string[];
  /** Color labels for JSON attribute matching. */
  colorLabels: string[];
};

export type CatalogSearchableFields = {
  productName: string;
  brandName: string | null;
  variantName: string;
  sku: string;
  barcode: string | null;
  colorName: string | null;
  categoryName?: string | null;
  description?: string | null;
  slug?: string | null;
  extraText?: string | null;
};

export function foldCatalogSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("az")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("ə", "e")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c")
    .replace(/\s+/gu, " ");
}

/** Letters+digits only, so CD-361 / CD 361 / cd361 all match the same model. */
export function compactCatalogSearchToken(value: string): string {
  return foldCatalogSearchText(value).replace(/[^a-z0-9]/gu, "");
}

const colorGroupByFolded = new Map<string, readonly string[]>();

for (const group of COLOR_SYNONYM_GROUPS) {
  for (const label of group) {
    colorGroupByFolded.set(foldCatalogSearchText(label), group);
  }
}

export function tokenizeCatalogSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }

  const rawTokens = trimmed.split(/\s+/u).filter((part) => part.length > 0);
  const units: string[] = [];
  let index = 0;

  while (index < rawTokens.length) {
    let matchedPhrase: string | null = null;
    let matchedLength = 0;

    for (
      let length = Math.min(3, rawTokens.length - index);
      length >= 2;
      length -= 1
    ) {
      const candidate = rawTokens.slice(index, index + length).join(" ");
      const folded = foldCatalogSearchText(candidate);
      if (colorGroupByFolded.has(folded)) {
        matchedPhrase = candidate;
        matchedLength = length;
        break;
      }
    }

    if (matchedPhrase !== null) {
      units.push(matchedPhrase);
      index += matchedLength;
      continue;
    }

    units.push(rawTokens[index]!);
    index += 1;
  }

  return units.filter(isSignificantCatalogSearchUnit);
}

function isSignificantCatalogSearchUnit(unit: string): boolean {
  const folded = foldCatalogSearchText(unit);
  if (folded === "") {
    return false;
  }
  if (/\d/u.test(folded)) {
    return true;
  }
  return folded.length >= 2;
}

/**
 * Compact codes such as CD361, 35855, BX750MI-GR.
 * Used to short-circuit AND matching when the customer pastes model + SKU.
 */
export function isCatalogIdentifierToken(value: string): boolean {
  const folded = foldCatalogSearchText(value);
  if (folded.length < 3 || /\s/u.test(folded)) {
    return false;
  }
  return /\d/u.test(folded);
}

function identifierFragments(unit: string): string[] {
  return unit
    .split(/[-_/.,;+|]+/u)
    .map((part) => part.trim())
    .filter((part) => {
      if (part.length === 0 || part === unit) {
        return false;
      }
      // Skip generic suffixes like "GR" / "EU" so BX750MI-GR does not match BE650G2-GR.
      if (isCatalogIdentifierToken(part)) {
        return true;
      }
      return foldCatalogSearchText(part).length >= 4;
    });
}

export function expandCatalogSearchUnit(
  unit: string,
): ExpandedCatalogSearchUnit {
  const trimmed = unit.trim();
  const terms = new Set<string>();
  const colorLabels = new Set<string>();

  const addTerm = (value: string) => {
    const next = value.trim();
    if (next !== "") {
      terms.add(next);
    }
  };

  const addTermCases = (value: string) => {
    addTerm(value);
    addTerm(value.toLocaleLowerCase("az"));
    addTerm(value.toUpperCase());
    addTerm(foldCatalogSearchText(value));
  };

  addTermCases(trimmed);
  const compact = compactCatalogSearchToken(trimmed);
  if (compact.length >= 3) {
    addTerm(compact);
  }
  for (const fragment of identifierFragments(trimmed)) {
    if (fragment !== trimmed) {
      addTermCases(fragment);
      const compactFragment = compactCatalogSearchToken(fragment);
      if (compactFragment.length >= 3) {
        addTerm(compactFragment);
      }
    }
  }

  const group = colorGroupByFolded.get(foldCatalogSearchText(trimmed));
  if (group !== undefined) {
    for (const label of group) {
      addTermCases(label);
      colorLabels.add(label);
    }
  }

  return {
    terms: [...terms],
    colorLabels: [...colorLabels],
  };
}

export function expandCatalogSearchQuery(
  query: string,
): ExpandedCatalogSearchUnit[] {
  return tokenizeCatalogSearchQuery(query).map(expandCatalogSearchUnit);
}

function haystackIncludesTerm(haystack: string, term: string): boolean {
  const normalizedHaystack = foldCatalogSearchText(haystack);
  const normalizedTerm = foldCatalogSearchText(term);
  if (normalizedTerm === "") {
    return false;
  }
  if (normalizedHaystack.includes(normalizedTerm)) {
    return true;
  }
  const compactTerm = compactCatalogSearchToken(term);
  if (compactTerm.length < 3) {
    return false;
  }
  return compactCatalogSearchToken(haystack).includes(compactTerm);
}

function colorMatchesUnit(
  colorName: string | null,
  unit: ExpandedCatalogSearchUnit,
): boolean {
  if (colorName === null || colorName.trim() === "") {
    return false;
  }

  const foldedColor = foldCatalogSearchText(colorName);
  if (unit.colorLabels.length > 0) {
    return unit.colorLabels.some((label) => {
      const foldedLabel = foldCatalogSearchText(label);
      return (
        foldedColor === foldedLabel ||
        foldedColor.includes(foldedLabel) ||
        foldedLabel.includes(foldedColor)
      );
    });
  }

  return unit.terms.some((term) => haystackIncludesTerm(colorName, term));
}

export function catalogSearchableTextFromJson(value: unknown): string {
  const parts: string[] = [];

  const visit = (entry: unknown) => {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed !== "") {
        parts.push(trimmed);
      }
      return;
    }
    if (typeof entry === "number" || typeof entry === "boolean") {
      parts.push(String(entry));
      return;
    }
    if (Array.isArray(entry)) {
      for (const item of entry) {
        visit(item);
      }
      return;
    }
    if (entry !== null && typeof entry === "object") {
      for (const nested of Object.values(entry)) {
        visit(nested);
      }
    }
  };

  visit(value);
  return parts.join(" ");
}

function textHaystacksForRow(row: CatalogSearchableFields): string[] {
  return [
    row.sku,
    row.variantName,
    row.barcode ?? "",
    row.productName,
    row.brandName ?? "",
    row.categoryName ?? "",
    row.description ?? "",
    row.slug ?? "",
    row.extraText ?? "",
  ];
}

function rowMatchesIdentifier(
  row: CatalogSearchableFields,
  units: readonly ExpandedCatalogSearchUnit[],
): boolean {
  const identifiers = [row.sku, row.barcode ?? ""].filter(
    (value) => value.trim() !== "",
  );
  if (identifiers.length === 0) {
    return false;
  }

  const identifierUnits = units.filter((unit) =>
    unit.terms.some((term) => isCatalogIdentifierToken(term)),
  );
  if (identifierUnits.length === 0 || identifierUnits.length !== units.length) {
    return false;
  }

  return identifierUnits.some((unit) =>
    unit.terms.some((term) => {
      if (!isCatalogIdentifierToken(term)) {
        return false;
      }
      const foldedTerm = foldCatalogSearchText(term);
      const compactTerm = compactCatalogSearchToken(term);
      return identifiers.some((identifier) => {
        if (foldCatalogSearchText(identifier) === foldedTerm) {
          return true;
        }
        return (
          compactTerm.length >= 3 &&
          compactCatalogSearchToken(identifier) === compactTerm
        );
      });
    }),
  );
}

/**
 * Pure matcher used by tests and any in-memory filtering.
 * Semantics: every search unit must match at least one field (AND across units),
 * except a unique SKU/barcode token always surfaces that product.
 */
export function catalogSearchMatches(
  query: string,
  row: CatalogSearchableFields,
): boolean {
  const units = expandCatalogSearchQuery(query);
  if (units.length === 0) {
    return true;
  }

  if (rowMatchesIdentifier(row, units)) {
    return true;
  }

  const textHaystacks = textHaystacksForRow(row);

  return units.every((unit) => {
    const textHit = unit.terms.some((term) =>
      textHaystacks.some((haystack) => haystackIncludesTerm(haystack, term)),
    );
    if (textHit) {
      return true;
    }
    return colorMatchesUnit(row.colorName, unit);
  });
}

function compactFieldEquals(value: string, compactQuery: string): boolean {
  return (
    compactQuery.length >= 3 &&
    compactCatalogSearchToken(value) === compactQuery
  );
}

/**
 * Higher is better. Exact SKU / model codes outrank loose contains matches
 * so typeahead shows the product the customer typed.
 */
export function scoreCatalogSearchHit(
  query: string,
  row: CatalogSearchableFields,
): number {
  if (!catalogSearchMatches(query, row)) {
    return 0;
  }

  const compactQuery = compactCatalogSearchToken(query);
  if (compactFieldEquals(row.sku, compactQuery)) {
    return 1000;
  }
  if (compactFieldEquals(row.barcode ?? "", compactQuery)) {
    return 950;
  }
  if (compactFieldEquals(row.productName, compactQuery)) {
    return 900;
  }
  if (
    compactQuery.length >= 3 &&
    compactCatalogSearchToken(row.extraText ?? "").includes(compactQuery)
  ) {
    return 850;
  }
  if (
    compactQuery.length >= 3 &&
    (compactCatalogSearchToken(row.sku).startsWith(compactQuery) ||
      compactCatalogSearchToken(row.productName).startsWith(compactQuery))
  ) {
    return 700;
  }

  const foldedQuery = foldCatalogSearchText(query);
  if (foldCatalogSearchText(row.productName).startsWith(foldedQuery)) {
    return 500;
  }
  if (foldCatalogSearchText(row.brandName ?? "").includes(foldedQuery)) {
    return 200;
  }
  return 100;
}

export function catalogSearchColorAttributeKeys(): readonly string[] {
  return COLOR_ATTRIBUTE_KEYS;
}

export function catalogSearchJsonAttributeKeys(): readonly string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const key of [
    ...COLOR_ATTRIBUTE_KEYS,
    ...CATALOG_MODEL_ATTRIBUTE_KEYS,
  ]) {
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return keys;
}
