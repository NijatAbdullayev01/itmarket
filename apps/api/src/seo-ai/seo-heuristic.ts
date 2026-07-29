import type {
  CatalogSeoEntityType,
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
  CatalogSeoSuggestSpec,
} from '@itmarket/contracts';

/** Soft SERP targets (layout already appends " | IT Market" via title template). */
export const SEO_TITLE_SOFT_MAX = 58;
export const SEO_DESCRIPTION_SOFT_MAX = 155;
/**
 * Soft length for landing / product body copy shown on storefront.
 * Longer than SERP meta so staff get usable page copy from "AI ilə SEO yaz".
 */
export const PAGE_DESCRIPTION_SOFT_MAX = 900;
/** Match backoffice form hard caps (category/brand/subcategory description). */
export const SEO_TITLE_HARD_MAX = 160;
export const SEO_DESCRIPTION_HARD_MAX = 300;
export const PAGE_DESCRIPTION_HARD_MAX = 5000;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function clampSeoText(value: string, maxLength: number): string {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  const sliced = normalized.slice(0, maxLength - 1).trimEnd();
  return `${sliced}…`;
}

function nameAlreadyIncludesBrand(name: string, brandName: string): boolean {
  const hay = name.toLocaleLowerCase('az');
  const needle = brandName.toLocaleLowerCase('az');
  return needle.length > 0 && hay.includes(needle);
}

function formatSpecsSnippet(
  specs: CatalogSeoSuggestSpec[] | undefined,
  maxParts = 8,
): string {
  if (specs === undefined || specs.length === 0) {
    return '';
  }
  const parts: string[] = [];
  for (const spec of specs) {
    const label = collapseWhitespace(spec.label);
    const value = collapseWhitespace(spec.value);
    if (label.length === 0 || value.length === 0) {
      continue;
    }
    parts.push(`${label}: ${value}`);
    if (parts.length >= maxParts) {
      break;
    }
  }
  return parts.join(', ');
}

/** Prefer storage / RAM / color values that are not already in the model name. */
function pickTitleSpecValues(
  specs: CatalogSeoSuggestSpec[] | undefined,
  modelName: string,
): string[] {
  if (specs === undefined || specs.length === 0) {
    return [];
  }
  const modelLower = modelName.toLocaleLowerCase('az');
  const preferred = [
    'daimi yaddaş',
    'yaddaş',
    'storage',
    'ram',
    'müvəqqəti yaddaş',
  ];
  const values: string[] = [];
  for (const needle of preferred) {
    for (const spec of specs) {
      const label = collapseWhitespace(spec.label).toLocaleLowerCase('az');
      const value = collapseWhitespace(spec.value);
      if (label.length === 0 || value.length === 0) {
        continue;
      }
      if (!label.includes(needle)) {
        continue;
      }
      if (modelLower.includes(value.toLocaleLowerCase('az'))) {
        continue;
      }
      if (!values.some((entry) => entry.toLocaleLowerCase('az') === value.toLocaleLowerCase('az'))) {
        values.push(value);
      }
    }
  }
  return values.slice(0, 2);
}

function buildProductTitle(input: CatalogSeoSuggestRequestContract): string {
  const name = collapseWhitespace(input.name);
  const brand = collapseWhitespace(input.brandName ?? '');
  const base =
    brand.length > 0 && !nameAlreadyIncludesBrand(name, brand)
      ? `${brand} ${name}`
      : name;
  const extras = pickTitleSpecValues(input.specs, base);
  const withSpecs =
    extras.length > 0 ? `${base} ${extras.join(' ')}` : base;
  return clampSeoText(withSpecs, SEO_TITLE_SOFT_MAX);
}

function buildProductPageDescription(
  input: CatalogSeoSuggestRequestContract,
): string {
  const existing = collapseWhitespace(input.description ?? '');
  if (existing.length >= 80) {
    return clampSeoText(existing, PAGE_DESCRIPTION_SOFT_MAX);
  }

  const name = collapseWhitespace(input.name);
  const brand = collapseWhitespace(input.brandName ?? '');
  const category = collapseWhitespace(
    input.categoryName ?? input.parentCategoryName ?? '',
  );
  const specs = formatSpecsSnippet(input.specs);
  const displayName =
    brand.length > 0 && !nameAlreadyIncludesBrand(name, brand)
      ? `${brand} ${name}`
      : name;

  let text = `${displayName} — IT Market vitrinində orijinal məhsul.`;
  if (category.length > 0) {
    text += ` ${category} kateqoriyasında bu modeli digər variantlarla müqayisə edib uyğun konfiqurasiyanı seçə bilərsiniz.`;
  } else {
    text +=
      ' Modelin mövcud variantlarını müqayisə edib uyğun konfiqurasiyanı seçə bilərsiniz.';
  }
  if (specs.length > 0) {
    text += ` Əsas xüsusiyyətlər: ${specs}.`;
  }
  text +=
    ' Alış-veriş zamanı rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil seçimləri təqdim olunur.';
  text +=
    ' Səhifədə qiymət, stok və taksit şərtlərini yoxlayıb sifarişi onlayn tamamlaya bilərsiniz.';
  return clampSeoText(text, PAGE_DESCRIPTION_SOFT_MAX);
}

function buildProductSeoDescription(
  input: CatalogSeoSuggestRequestContract,
  pageDescription: string,
): string {
  const existing = collapseWhitespace(input.description ?? '');
  if (existing.length >= 40) {
    return clampSeoText(existing, SEO_DESCRIPTION_SOFT_MAX);
  }
  return clampSeoText(pageDescription, SEO_DESCRIPTION_SOFT_MAX);
}

function buildBrandTitle(input: CatalogSeoSuggestRequestContract): string {
  return clampSeoText(collapseWhitespace(input.name), SEO_TITLE_SOFT_MAX);
}

function buildBrandPageDescription(
  input: CatalogSeoSuggestRequestContract,
): string {
  const existing = collapseWhitespace(input.description ?? '');
  if (existing.length >= 80) {
    return clampSeoText(existing, PAGE_DESCRIPTION_SOFT_MAX);
  }
  const name = collapseWhitespace(input.name);
  return clampSeoText(
    `${name} brendinin rəsmi məhsullarını IT Market vitrinində kəşf edin. Kataloqda smartfon, noutbuk və digər texnika modellərini müqayisə edin, uyğun konfiqurasiyanı seçin. Orijinal məhsul, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil seçimləri ilə alış-veriş edin.`,
    PAGE_DESCRIPTION_SOFT_MAX,
  );
}

function buildBrandSeoDescription(
  input: CatalogSeoSuggestRequestContract,
  pageDescription: string,
): string {
  const existing = collapseWhitespace(input.description ?? '');
  if (existing.length >= 40) {
    return clampSeoText(existing, SEO_DESCRIPTION_SOFT_MAX);
  }
  return clampSeoText(pageDescription, SEO_DESCRIPTION_SOFT_MAX);
}

function buildCategoryTitle(input: CatalogSeoSuggestRequestContract): string {
  const name = collapseWhitespace(input.name);
  return clampSeoText(`${name} kataloqu`, SEO_TITLE_SOFT_MAX);
}

function buildCategoryPageDescription(
  input: CatalogSeoSuggestRequestContract,
): string {
  const existing = collapseWhitespace(input.description ?? '');
  if (existing.length >= 80) {
    return clampSeoText(existing, PAGE_DESCRIPTION_SOFT_MAX);
  }
  const name = collapseWhitespace(input.name);
  const parent = collapseWhitespace(input.parentCategoryName ?? '');
  if (input.entityType === 'subcategory' && parent.length > 0) {
    return clampSeoText(
      `${parent} kateqoriyasında ${name} seçimləri — IT Market-də brend, model və əsas xüsusiyyətlərə görə müqayisə edin. Orijinal texnika, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil ilə alış-veriş edin. Kataloqda filtr və çeşidləmə ilə uyğun məhsulu tez tapın.`,
      PAGE_DESCRIPTION_SOFT_MAX,
    );
  }
  return clampSeoText(
    `${name} kateqoriyası üzrə məhsulları IT Market-də tapın. Brendləri və modelləri müqayisə edin, ehtiyacınıza uyğun konfiqurasiyanı seçin. Orijinal texnika, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil seçimləri təqdim olunur.`,
    PAGE_DESCRIPTION_SOFT_MAX,
  );
}

function buildCategorySeoDescription(
  input: CatalogSeoSuggestRequestContract,
  pageDescription: string,
): string {
  const existing = collapseWhitespace(input.description ?? '');
  if (existing.length >= 40) {
    return clampSeoText(existing, SEO_DESCRIPTION_SOFT_MAX);
  }
  return clampSeoText(pageDescription, SEO_DESCRIPTION_SOFT_MAX);
}

export function buildHeuristicSeoSuggestion(
  input: CatalogSeoSuggestRequestContract,
): CatalogSeoSuggestResponseContract {
  const entityType: CatalogSeoEntityType = input.entityType;
  let seoTitle: string;
  let seoDescription: string;
  let description: string;

  switch (entityType) {
    case 'product':
      seoTitle = buildProductTitle(input);
      description = buildProductPageDescription(input);
      seoDescription = buildProductSeoDescription(input, description);
      break;
    case 'brand':
      seoTitle = buildBrandTitle(input);
      description = buildBrandPageDescription(input);
      seoDescription = buildBrandSeoDescription(input, description);
      break;
    case 'category':
    case 'subcategory':
      seoTitle = buildCategoryTitle(input);
      description = buildCategoryPageDescription(input);
      seoDescription = buildCategorySeoDescription(input, description);
      break;
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unsupported SEO entity type: ${String(_exhaustive)}`);
    }
  }

  const warnings: string[] = [];
  if (seoTitle.length >= SEO_TITLE_SOFT_MAX) {
    warnings.push('SEO başlıq SERP üçün qısaldıldı (tövsiyə ~50–58 simvol).');
  }
  if (seoDescription.length >= SEO_DESCRIPTION_SOFT_MAX) {
    warnings.push(
      'SEO təsvir SERP üçün qısaldıldı (tövsiyə ~140–155 simvol).',
    );
  }
  if (description.length >= PAGE_DESCRIPTION_SOFT_MAX) {
    warnings.push('Səhifə mətni qısaldıldı.');
  }

  return {
    seoTitle: clampSeoText(seoTitle, SEO_TITLE_HARD_MAX),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_HARD_MAX),
    description: clampSeoText(description, PAGE_DESCRIPTION_HARD_MAX),
    source: 'heuristic',
    warnings,
  };
}
