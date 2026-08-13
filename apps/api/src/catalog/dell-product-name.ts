/**
 * Dell catalog names follow the product form: Model field is brand-line + model
 * only. Specs (CPU, RAM, storage, gamut, layout) stay in requiredSpecs / variant fields.
 */

export type DellCatalogSpec = {
  label: string;
  value: string;
};

export type DellCatalogIdentity = {
  productName: string;
  colorFromName: string | null;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function specValue(
  specs: readonly DellCatalogSpec[],
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) =>
    matcher(entry.label.toLocaleLowerCase('az')),
  );
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

/** Color-gamut / coverage strings must not be stored as variant Rəng. */
export function isDellCatalogColorValue(value: string): boolean {
  const normalized = collapseWhitespace(value).toLocaleLowerCase('az');
  if (normalized === '') {
    return false;
  }
  if (
    /srgb|dci-p3|dci p3|adobe rgb|ntsc|delta\s*e|billion colors|rəng tutumu|color gamut/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (/\d+(?:[.,]\d+)?\s*%/.test(normalized)) {
    return false;
  }
  return true;
}

const COLORWAY_PARENS = ['Dark Side of the Moon', 'Lunar Light'] as const;

const TRAILING_LAYOUT = /\s+(US QWERTY|Russian|English)$/i;
const TRAILING_COLOR =
  /\s+(Ash Pink|Heather Grey|Lunar Light|Silver|Black|White|Qara|Ağ)$/i;

export function parseDellModelName(value: string): DellCatalogIdentity {
  let name = collapseWhitespace(value);
  let colorFromName: string | null = null;

  name = name.replace(/\s*\(SKU\b[^)]*\)/gi, '').trim();
  name = name.replace(/\s*\(RTL\s*BOX\)/gi, '').trim();

  for (const colorway of COLORWAY_PARENS) {
    const wrapped = new RegExp(`\\s*\\(${colorway}\\)`, 'i');
    if (wrapped.test(name)) {
      colorFromName = colorway;
      name = name.replace(wrapped, '').trim();
    }
  }

  if (/^Dell Pro\s*\/\s*P\d+/i.test(name)) {
    name = name.replace(/\s*\/\s*/, ' ');
  }
  if (/^Dell Premier\s*\/\s*Pro Plus/i.test(name)) {
    name = name.replace(/^Dell Premier\s*\/\s*Pro Plus/i, 'Dell Premier');
  }
  if (/headset/i.test(name) && name.includes(' / ')) {
    name = name.split(' / ')[0]!.trim();
  }

  while (true) {
    const layout = name.match(TRAILING_LAYOUT);
    if (layout?.index !== undefined) {
      name = name.slice(0, layout.index).trim();
      continue;
    }
    const trailingColor = name.match(TRAILING_COLOR);
    if (trailingColor?.index !== undefined && trailingColor[1] !== undefined) {
      colorFromName = colorFromName ?? trailingColor[1];
      name = name.slice(0, trailingColor.index).trim();
      continue;
    }
    break;
  }

  return {
    productName: name.slice(0, 200),
    colorFromName,
  };
}

export function cleanDellModelName(value: string): string {
  return parseDellModelName(value).productName;
}

export function resolveDellCatalogIdentity(
  title: string,
  specs: readonly DellCatalogSpec[],
): DellCatalogIdentity {
  const model = specValue(specs, (label) => label === 'model');
  if (model !== null) {
    return parseDellModelName(model);
  }
  const fallback = collapseWhitespace(title).split('/')[0] ?? title;
  return parseDellModelName(fallback);
}

export function sanitizeDellRequiredSpecs(
  specs: readonly DellCatalogSpec[],
): DellCatalogSpec[] {
  return specs.map((entry) => {
    if (entry.label.toLocaleLowerCase('az') !== 'model') {
      return entry;
    }
    return {
      label: entry.label,
      value: parseDellModelName(entry.value).productName,
    };
  });
}

export function buildDellCatalogProductName(
  title: string,
  specs: readonly DellCatalogSpec[],
): string {
  return resolveDellCatalogIdentity(title, specs).productName;
}

export function buildDellVariantName(
  specs: readonly DellCatalogSpec[],
): string {
  const ram = specValue(
    specs,
    (label) => label === 'ram' || label.includes('müvəqqəti'),
  );
  const storage = specValue(
    specs,
    (label) => label === 'yaddaş' || label === 'yaddas',
  );
  const parts = [storage, ram].filter(
    (part): part is string => part !== null && part !== '',
  );
  if (parts.length === 0) {
    return 'Standart';
  }
  return parts.join(' / ').slice(0, 200);
}

export function buildDellVariantAttributes(
  specs: readonly DellCatalogSpec[],
  colorFromName?: string | null,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const storage = specValue(
    specs,
    (label) => label === 'yaddaş' || label === 'yaddas',
  );
  const ram = specValue(
    specs,
    (label) => label === 'ram' || label.includes('müvəqqəti'),
  );
  const specColor = specValue(
    specs,
    (label) => label === 'rəng' || label === 'reng',
  );

  if (storage !== null) {
    attributes.Yaddaş = storage;
  }
  if (ram !== null) {
    attributes.RAM = ram;
  }

  const color =
    specColor !== null && isDellCatalogColorValue(specColor)
      ? specColor
      : (colorFromName ?? null);
  if (color !== null && isDellCatalogColorValue(color)) {
    attributes.Rəng = color;
  }
  return attributes;
}
