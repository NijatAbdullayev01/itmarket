/**
 * Ruckus catalog names: brand + marketing model + Wi-Fi generation.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type RuckusNameSpec = {
  label: string;
  value: string;
};

export function normalizeRuckusSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function specValue(
  specs: readonly RuckusNameSpec[],
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

function haystack(
  sku: string,
  title: string,
  specs: readonly RuckusNameSpec[],
): string {
  return `${sku} ${title} ${specs.map((entry) => `${entry.label} ${entry.value}`).join(' ')}`
    .toLocaleLowerCase('az')
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ç', 'c');
}

export function ruckusDisplayModel(
  sku: string,
  title: string,
  specs: readonly RuckusNameSpec[] = [],
): string {
  const fromSpec = specValue(specs, (label) => label === 'model');
  if (fromSpec !== null && /^R\d{3,4}/i.test(fromSpec)) {
    return fromSpec.replace(/\s+/g, '').toUpperCase();
  }
  const fromSku = sku.match(/(?:^|-)(R\d{3,4}[A-Z]*)(?:-|$)/i);
  if (fromSku?.[1] !== undefined) {
    return fromSku[1].toUpperCase();
  }
  const fromTitle = title.trim().match(/\b(R\d{3,4}[A-Z]*)\b/i);
  if (fromTitle?.[1] !== undefined) {
    return fromTitle[1].toUpperCase();
  }
  return normalizeRuckusSku(sku);
}

function wifiGeneration(hay: string): string {
  if (/802\.11be|wi-fi 7|wifi 7|\b11be\b/.test(hay)) {
    return 'Wi-Fi 7';
  }
  if (
    /wi-fi 6e|wifi 6e/.test(hay) ||
    (/6 ghz|6ghz/.test(hay) &&
      /802\.11ax|wi-fi 6|wifi 6/.test(hay) &&
      !/802\.11be|wi-fi 7/.test(hay))
  ) {
    return 'Wi-Fi 6E';
  }
  if (/802\.11ax|wi-fi 6|wifi 6|\b11ax\b/.test(hay)) {
    return 'Wi-Fi 6';
  }
  if (/802\.11ac|wi-fi 5|wifi 5|\b11ac\b/.test(hay)) {
    return 'Wi-Fi 5';
  }
  return 'Wi-Fi';
}

function typePhrase(
  sku: string,
  title: string,
  subcategorySlug: string,
  specs: readonly RuckusNameSpec[],
): string {
  const hay = haystack(sku, title, specs);
  if (subcategorySlug === 'access-point') {
    const wifi = wifiGeneration(hay);
    if (/outdoor/.test(hay)) {
      return `outdoor ${wifi} Access Point`;
    }
    return `${wifi} Access Point`;
  }
  return 'şəbəkə avadanlığı';
}

export function resolveRuckusCatalogName(
  sku: string,
  fallbackTitle: string,
  options?: {
    subcategorySlug?: string;
    specs?: readonly RuckusNameSpec[];
  },
): string {
  const normalized = normalizeRuckusSku(sku);
  const specs = options?.specs ?? [];
  const subcategorySlug = options?.subcategorySlug ?? 'access-point';
  const model = ruckusDisplayModel(normalized, fallbackTitle, specs);
  const phrase = typePhrase(normalized, fallbackTitle, subcategorySlug, specs);
  const generated = `Ruckus ${model} ${phrase}`.replace(/\s+/g, ' ').trim();
  if (generated.length > 12) {
    return generated;
  }

  const trimmed = fallbackTitle.trim();
  if (/^ruckus\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Ruckus ${trimmed}`.trim();
}
