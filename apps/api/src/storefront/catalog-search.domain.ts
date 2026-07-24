/**
 * Storefront catalog free-text search: tokenization, AZ↔EN color synonyms,
 * and ASCII folding so customers find products regardless of language.
 */

const COLOR_ATTRIBUTE_KEYS = [
  'Rəng',
  'rəng',
  'Color',
  'color',
  'Renk',
  'renk',
] as const;

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

export type ExpandedCatalogSearchUnit = {
  /** OR-matched text terms (original, folded, synonyms). */
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

const colorGroupByFolded = new Map<string, readonly string[]>();

for (const group of COLOR_SYNONYM_GROUPS) {
  for (const label of group) {
    colorGroupByFolded.set(foldCatalogSearchText(label), group);
  }
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
  if (folded === '') {
    return false;
  }
  if (/\d/u.test(folded)) {
    return true;
  }
  return folded.length >= 2;
}

export function expandCatalogSearchUnit(unit: string): ExpandedCatalogSearchUnit {
  const trimmed = unit.trim();
  const terms = new Set<string>();
  const colorLabels = new Set<string>();

  const addTerm = (value: string) => {
    const next = value.trim();
    if (next !== '') {
      terms.add(next);
    }
  };

  addTerm(trimmed);
  addTerm(trimmed.toLocaleLowerCase('az'));
  addTerm(foldCatalogSearchText(trimmed));

  const group = colorGroupByFolded.get(foldCatalogSearchText(trimmed));
  if (group !== undefined) {
    for (const label of group) {
      addTerm(label);
      addTerm(label.toLocaleLowerCase('az'));
      addTerm(foldCatalogSearchText(label));
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
  if (normalizedTerm === '') {
    return false;
  }
  return normalizedHaystack.includes(normalizedTerm);
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

/**
 * Pure matcher used by tests and any in-memory filtering.
 * Semantics: every search unit must match at least one field (AND across units).
 */
export function catalogSearchMatches(
  query: string,
  row: CatalogSearchableFields,
): boolean {
  const units = expandCatalogSearchQuery(query);
  if (units.length === 0) {
    return true;
  }

  const textHaystacks = [
    row.sku,
    row.variantName,
    row.barcode ?? '',
    row.productName,
    row.brandName ?? '',
    row.categoryName ?? '',
  ];

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

export function catalogSearchColorAttributeKeys(): readonly string[] {
  return COLOR_ATTRIBUTE_KEYS;
}
