/**
 * Storefront catalog free-text search: tokenization, AZ↔EN color synonyms,
 * ASCII folding, and identifier matching (SKU / model codes).
 *
 * Keep in sync with packages/contracts/src/catalog-search.ts — backoffice uses
 * that copy for in-memory catalog filtering.
 */

const COLOR_ATTRIBUTE_KEYS = [
  'Rəng',
  'rəng',
  'Color',
  'color',
  'Renk',
  'renk',
] as const;

export const CATALOG_MODEL_ATTRIBUTE_KEYS = [
  'Model',
  'model',
  'MODEL',
  'MPN',
  'mpn',
  'EAN',
  'ean',
  'Kod',
  'kod',
  'SKU',
  'sku',
  'Artikul',
  'artikul',
  'Part number',
  'Part Number',
  'part number',
  'Model No',
  'Model no',
  'Модель',
] as const;

/** How many requiredSpecs[i].value paths Prisma JSON filters should probe. */
export const CATALOG_REQUIRED_SPEC_SEARCH_LIMIT = 24;

/** Equivalent color labels (AZ catalog + English + ASCII folds). */
const COLOR_SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['Qara', 'qara', 'black', 'kara'],
  ['Ağ', 'ağ', 'ag', 'white'],
  ['Gümüşü', 'gümüşü', 'gumusu', 'silver'],
  ['Mavi', 'mavi', 'blue'],
  ['Tünd mavi', 'tünd mavi', 'tund mavi', 'navy', 'dark blue', 'darkblue'],
  ['Qırmızı', 'qırmızı', 'qirmizi', 'red'],
  ['Yaşıl', 'yaşıl', 'yasil', 'green'],
  ['Bənövşəyi', 'bənövşəyi', 'benovseyi', 'purple', 'violet'],
  ['Çəhrayı', 'çəhrayı', 'cehrayi', 'pink'],
  ['Qızılı', 'qızılı', 'qizili', 'gold'],
  ['Narıncı', 'narıncı', 'narinci', 'orange'],
  ['Sarı', 'sarı', 'sari', 'yellow'],
  ['Boz', 'boz', 'gray', 'grey'],
  ['Bej', 'bej', 'beige'],
  ['Titan', 'titan', 'titanium'],
  ['Titan Ağ', 'titan ağ', 'titan ag', 'titan white', 'titanium white'],
  ['Titan Qara', 'titan qara', 'titan black', 'titanium black'],
  ['Titan Mavi', 'titan mavi', 'titan blue', 'titanium blue'],
  [
    'Titan Bənövşəyi',
    'titan bənövşəyi',
    'titan benovseyi',
    'titan purple',
    'titanium purple',
  ],
  [
    'Titan Gümüşü',
    'titan gümüşü',
    'titan gumusu',
    'titan silver',
    'titanium silver',
  ],
  ['Space Gray', 'space gray', 'space grey', 'spacegray'],
  ['Ultramarin', 'ultramarin', 'ultramarine'],
  ['Ultramarin mavi', 'ultramarin mavi', 'ultramarine blue'],
  ['Kosmik narıncı', 'kosmik narıncı', 'kosmik narinci', 'cosmic orange'],
  ['Dərin bənövşəyi', 'dərin bənövşəyi', 'derin benovseyi', 'deep purple'],
];

/** Category / product-kind labels staff type in AZ or EN. */
const TYPE_SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['Noutbuk', 'noutbuk', 'noutbuklar', 'laptop', 'notebook', 'notebooks'],
  ['Printer', 'printer', 'printerler', 'printerlər', 'printers'],
  ['Server', 'server', 'serverler', 'serverlər', 'servers'],
  [
    'Smartfon',
    'smartfon',
    'smartfonlar',
    'telefon',
    'phone',
    'mobile',
    'cellphone',
  ],
  ['Planşet', 'planşet', 'planset', 'tablet', 'tablets'],
  ['Monitor', 'monitor', 'monitorlar', 'ekran', 'display'],
  ['UPS', 'ups'],
  ['Kamera', 'kamera', 'camera', 'foto'],
  ['Router', 'router', 'modem', 'sebeke', 'şəbəkə'],
];

const CATALOG_SEARCH_NOISE_WORDS = new Set([
  'mehsul',
  'məhsul',
  'product',
  'products',
  'qiymet',
  'qiymət',
  'price',
  'katalog',
  'catalog',
  'sku',
  'barkod',
  'barcode',
  'variant',
  'model',
  'ucun',
  'üçün',
  'the',
  'and',
  'with',
  'for',
  've',
  'və',
  'axtar',
  'axtaris',
  'axtarış',
  'search',
]);

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
  parentCategoryName?: string | null;
  description?: string | null;
  slug?: string | null;
  extraText?: string | null;
};

export type CatalogSearchMatchOptions = {
  /**
   * Admin lists: still find the product when extra words (category slang,
   * pasted titles) do not appear in the record, as long as a strong token hits.
   */
  lenient?: boolean;
};

export function foldCatalogSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ç', 'c')
    .replace(/\s+/gu, ' ');
}

/** Letters+digits only, so CD-361 / CD 361 / cd361 all match the same model. */
export function compactCatalogSearchToken(value: string): string {
  return foldCatalogSearchText(value).replace(/[^a-z0-9]/gu, '');
}

const colorGroupByFolded = new Map<string, readonly string[]>();

for (const group of COLOR_SYNONYM_GROUPS) {
  for (const label of group) {
    colorGroupByFolded.set(foldCatalogSearchText(label), group);
  }
}

const typeGroupByFolded = new Map<string, readonly string[]>();

for (const group of TYPE_SYNONYM_GROUPS) {
  for (const label of group) {
    typeGroupByFolded.set(foldCatalogSearchText(label), group);
  }
}

function isCatalogSearchNoiseUnit(unit: string): boolean {
  return CATALOG_SEARCH_NOISE_WORDS.has(foldCatalogSearchText(unit));
}

function uniqueFoldedUnits(units: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const unit of units) {
    const key = foldCatalogSearchText(unit);
    if (key === '' || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(unit);
  }
  return unique;
}

export function tokenizeCatalogSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed === '') {
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
      const candidate = rawTokens.slice(index, index + length).join(' ');
      const folded = foldCatalogSearchText(candidate);
      if (colorGroupByFolded.has(folded) || typeGroupByFolded.has(folded)) {
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

  const expanded = uniqueFoldedUnits(
    units.filter((unit) => !isCatalogSearchNoiseUnit(unit)),
  );
  const significant = expanded.filter((unit) =>
    isSignificantCatalogSearchUnit(unit, false),
  );
  if (significant.length > 0) {
    return significant;
  }
  return expanded.filter((unit) => isSignificantCatalogSearchUnit(unit, true));
}

function isSignificantCatalogSearchUnit(
  unit: string,
  allowSingleChar: boolean,
): boolean {
  const folded = foldCatalogSearchText(unit);
  if (folded === '') {
    return false;
  }
  if (/\d/u.test(folded)) {
    return true;
  }
  if (folded.length >= 2) {
    return true;
  }
  return allowSingleChar && /^[a-z]$/u.test(folded);
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
      // Skip generic suffixes like 'GR' / 'EU' so BX750MI-GR does not match BE650G2-GR.
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
    if (next !== '') {
      terms.add(next);
    }
  };

  const addTermCases = (value: string) => {
    addTerm(value);
    addTerm(value.toLocaleLowerCase('az'));
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

  const folded = foldCatalogSearchText(trimmed);
  const colorGroup = colorGroupByFolded.get(folded);
  if (colorGroup !== undefined) {
    for (const label of colorGroup) {
      addTermCases(label);
      colorLabels.add(label);
    }
  }

  const typeGroup = typeGroupByFolded.get(folded);
  if (typeGroup !== undefined) {
    for (const label of typeGroup) {
      addTermCases(label);
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

function boundedLevenshtein(
  left: string,
  right: string,
  maxDistance: number,
): number {
  if (left === right) {
    return 0;
  }
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  const previous = new Array<number>(right.length + 1);
  const current = new Array<number>(right.length + 1);
  for (let column = 0; column <= right.length; column += 1) {
    previous[column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;
    let rowMin = current[0]!;
    const leftChar = left[row - 1];
    for (let column = 1; column <= right.length; column += 1) {
      const cost = leftChar === right[column - 1] ? 0 : 1;
      const next = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + cost,
      );
      current[column] = next;
      if (next < rowMin) {
        rowMin = next;
      }
    }
    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }
    for (let column = 0; column <= right.length; column += 1) {
      previous[column] = current[column]!;
    }
  }

  return previous[right.length]!;
}

function haystackWordTokens(haystack: string): string[] {
  return foldCatalogSearchText(haystack)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function fuzzyHaystackHasTerm(haystack: string, term: string): boolean {
  const foldedTerm = foldCatalogSearchText(term);
  if (foldedTerm.length < 4) {
    return false;
  }
  if (
    isCatalogIdentifierToken(term) ||
    /^\d+$/u.test(compactCatalogSearchToken(term))
  ) {
    return false;
  }
  const maxDistance = foldedTerm.length >= 8 ? 2 : 1;
  for (const token of haystackWordTokens(haystack)) {
    if (token[0] !== foldedTerm[0]) {
      continue;
    }
    if (boundedLevenshtein(token, foldedTerm, maxDistance) <= maxDistance) {
      return true;
    }
  }
  return false;
}

function haystackIncludesTerm(haystack: string, term: string): boolean {
  const normalizedHaystack = foldCatalogSearchText(haystack);
  const normalizedTerm = foldCatalogSearchText(term);
  if (normalizedTerm === '') {
    return false;
  }
  if (normalizedTerm.length === 1) {
    return haystackWordTokens(haystack).some((token) =>
      token.startsWith(normalizedTerm),
    );
  }
  if (normalizedHaystack.includes(normalizedTerm)) {
    return true;
  }
  const compactHaystack = compactCatalogSearchToken(haystack);
  const compactTerm = compactCatalogSearchToken(term);
  if (compactTerm.length >= 3 && compactHaystack.includes(compactTerm)) {
    return true;
  }
  if (haystackContainsCompactChunks(compactHaystack, compactTerm)) {
    return true;
  }
  return fuzzyHaystackHasTerm(haystack, term);
}

/** 'dell5540' hits combined 'Dell Latitude 5540' even when the letters are not contiguous. */
function haystackContainsCompactChunks(
  compactHaystack: string,
  compactTerm: string,
): boolean {
  const chunks = compactTerm.match(/[a-z]+|\d+/gu) ?? [];
  const useful = chunks.filter((chunk) => chunk.length >= 2);
  if (useful.length < 2 || compactHaystack.length === 0) {
    return false;
  }
  return useful.every((chunk) => compactHaystack.includes(chunk));
}

function colorMatchesUnit(
  colorName: string | null,
  unit: ExpandedCatalogSearchUnit,
): boolean {
  if (colorName === null || colorName.trim() === '') {
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
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (trimmed !== '') {
        parts.push(trimmed);
      }
      return;
    }
    if (typeof entry === 'number' || typeof entry === 'boolean') {
      parts.push(String(entry));
      return;
    }
    if (Array.isArray(entry)) {
      for (const item of entry) {
        visit(item);
      }
      return;
    }
    if (entry !== null && typeof entry === 'object') {
      for (const nested of Object.values(entry)) {
        visit(nested);
      }
    }
  };

  visit(value);
  return parts.join(' ');
}

function textHaystacksForRow(row: CatalogSearchableFields): string[] {
  const fields = [
    row.sku,
    row.variantName,
    row.barcode ?? '',
    row.productName,
    row.brandName ?? '',
    row.categoryName ?? '',
    row.parentCategoryName ?? '',
    row.description ?? '',
    row.slug ?? '',
    row.extraText ?? '',
  ];
  return [...fields, fields.filter((field) => field.trim() !== '').join(' ')];
}

function unitMatchesRowText(
  unit: ExpandedCatalogSearchUnit,
  textHaystacks: readonly string[],
  row: CatalogSearchableFields,
): boolean {
  const textHit = unit.terms.some((term) =>
    textHaystacks.some((haystack) => haystackIncludesTerm(haystack, term)),
  );
  if (textHit) {
    return true;
  }
  return colorMatchesUnit(row.colorName, unit);
}

function identifierFieldEqualsTerm(value: string, term: string): boolean {
  if (!isCatalogIdentifierToken(term) || value.trim() === '') {
    return false;
  }
  const foldedTerm = foldCatalogSearchText(term);
  const compactTerm = compactCatalogSearchToken(term);
  if (foldCatalogSearchText(value) === foldedTerm) {
    return true;
  }
  if (
    compactTerm.length >= 3 &&
    compactCatalogSearchToken(value) === compactTerm
  ) {
    return true;
  }
  return haystackWordTokens(value).some(
    (token) =>
      compactTerm.length >= 4 && compactCatalogSearchToken(token) === compactTerm,
  );
}

function rowMatchesIdentifier(
  row: CatalogSearchableFields,
  units: readonly ExpandedCatalogSearchUnit[],
): boolean {
  const identifiers = [row.sku, row.barcode ?? ''].filter(
    (value) => value.trim() !== '',
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
    unit.terms.some((term) =>
      identifiers.some((identifier) => identifierFieldEqualsTerm(identifier, term)),
    ),
  );
}

function rowHasExactIdentifierHit(
  row: CatalogSearchableFields,
  units: readonly ExpandedCatalogSearchUnit[],
): boolean {
  const fields = [row.sku, row.barcode ?? ''].filter(
    (value) => value.trim() !== '',
  );
  if (fields.length === 0) {
    return false;
  }
  return units.some((unit) =>
    unit.terms.some((term) =>
      fields.some((field) => identifierFieldEqualsTerm(field, term)),
    ),
  );
}

function unitIsWeakUnmatched(unit: ExpandedCatalogSearchUnit): boolean {
  if (unit.colorLabels.length > 0) {
    return false;
  }
  if (unit.terms.some((term) => isCatalogIdentifierToken(term))) {
    return false;
  }
  const folded = foldCatalogSearchText(unit.terms[0] ?? '');
  return folded.length > 0 && folded.length < 6;
}

function unitIsStrongHit(unit: ExpandedCatalogSearchUnit): boolean {
  if (unit.terms.some((term) => isCatalogIdentifierToken(term))) {
    return true;
  }
  return unit.terms.some(
    (term) => compactCatalogSearchToken(term).length >= 4,
  );
}

/**
 * Pure matcher used by tests and any in-memory filtering.
 * Semantics: every search unit must match at least one field (AND across units),
 * except a unique SKU/barcode token always surfaces that product.
 * `lenient` keeps that product visible when extra title/category words miss.
 */
export function catalogSearchMatches(
  query: string,
  row: CatalogSearchableFields,
  options?: CatalogSearchMatchOptions,
): boolean {
  const units = expandCatalogSearchQuery(query);
  if (units.length === 0) {
    return query.trim() === '';
  }

  if (rowMatchesIdentifier(row, units)) {
    return true;
  }

  const textHaystacks = textHaystacksForRow(row);
  const matched: ExpandedCatalogSearchUnit[] = [];
  const unmatched: ExpandedCatalogSearchUnit[] = [];
  for (const unit of units) {
    if (unitMatchesRowText(unit, textHaystacks, row)) {
      matched.push(unit);
    } else {
      unmatched.push(unit);
    }
  }

  if (unmatched.length === 0) {
    return true;
  }

  if (options?.lenient !== true) {
    return false;
  }

  if (matched.length === 0) {
    return false;
  }

  if (rowHasExactIdentifierHit(row, matched)) {
    return true;
  }

  const unmatchedAllWeak = unmatched.every((unit) => unitIsWeakUnmatched(unit));
  if (unmatchedAllWeak && matched.some((unit) => unitIsStrongHit(unit))) {
    return true;
  }

  const majority = Math.ceil(units.length * 0.6);
  return matched.length >= 2 && matched.length >= majority;
}

function compactFieldEquals(value: string, compactQuery: string): boolean {
  return (
    compactQuery.length >= 3 &&
    compactCatalogSearchToken(value) === compactQuery
  );
}

function compactFieldStartsWith(value: string, compactQuery: string): boolean {
  return (
    compactQuery.length >= 2 &&
    compactCatalogSearchToken(value).startsWith(compactQuery)
  );
}

/**
 * Higher is better. Exact SKU / model codes outrank loose contains matches
 * so typeahead and admin lists show the product the staff typed.
 */
export function scoreCatalogSearchHit(
  query: string,
  row: CatalogSearchableFields,
  options?: CatalogSearchMatchOptions,
): number {
  if (!catalogSearchMatches(query, row, options)) {
    return 0;
  }

  const compactQuery = compactCatalogSearchToken(query);
  const foldedQuery = foldCatalogSearchText(query);
  let score = 1;

  if (compactFieldEquals(row.sku, compactQuery)) {
    score += 10000;
  } else if (compactFieldStartsWith(row.sku, compactQuery)) {
    score += 4200;
  } else if (
    compactQuery.length >= 3 &&
    compactCatalogSearchToken(row.sku).includes(compactQuery)
  ) {
    score += 1800;
  }

  if (compactFieldEquals(row.barcode ?? '', compactQuery)) {
    score += 9000;
  }
  if (compactFieldEquals(row.productName, compactQuery)) {
    score += 8000;
  }
  if (
    compactQuery.length >= 3 &&
    compactCatalogSearchToken(row.extraText ?? '').includes(compactQuery)
  ) {
    score += 2400;
  }

  const foldedName = foldCatalogSearchText(row.productName);
  if (foldedName === foldedQuery) {
    score += 7000;
  } else if (foldedName.startsWith(foldedQuery)) {
    score += 3200;
  } else if (foldedName.includes(foldedQuery) && foldedQuery.length >= 3) {
    score += 900;
  }

  if (foldCatalogSearchText(row.brandName ?? '') === foldedQuery) {
    score += 1600;
  }

  const units = expandCatalogSearchQuery(query);
  for (const unit of units) {
    const terms = unit.terms;
    if (terms.some((term) => haystackIncludesTerm(row.sku, term))) {
      score += 700;
    } else if (terms.some((term) => haystackIncludesTerm(row.productName, term))) {
      score += 420;
    } else if (
      terms.some((term) => haystackIncludesTerm(row.brandName ?? '', term))
    ) {
      score += 220;
    } else if (
      terms.some((term) =>
        haystackIncludesTerm(
          `${row.categoryName ?? ''} ${row.parentCategoryName ?? ''}`,
          term,
        ),
      )
    ) {
      score += 140;
    } else {
      score += 40;
    }
  }

  score += Math.max(0, 90 - foldedName.length);
  return score;
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
