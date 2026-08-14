/**
 * H3C catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type H3cNameSpec = {
  label: string;
  value: string;
};

export function normalizeH3cSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function specValue(
  specs: readonly H3cNameSpec[],
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

function firstPortCount(specs: readonly H3cNameSpec[]): string | null {
  const ports = specValue(specs, (label) => label.startsWith('port'));
  if (ports === null) {
    return null;
  }
  const match = ports.match(/(\d+)\s*[×x]/i);
  return match?.[1] ?? null;
}

function haystack(
  sku: string,
  title: string,
  specs: readonly H3cNameSpec[],
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

function modelFromTitle(title: string): string | null {
  const match = title.trim().match(/^H3C\s+([A-Z0-9][A-Z0-9.+_-]*)/i);
  if (match === null) {
    return null;
  }
  const token = match[1] ?? '';
  if (!/\d/.test(token)) {
    return null;
  }
  return token;
}

export function h3cDisplayModel(
  sku: string,
  title: string,
  specs: readonly H3cNameSpec[] = [],
): string {
  const fromSpec = specValue(specs, (label) => label === 'model');
  if (fromSpec !== null && /\d/.test(fromSpec)) {
    return fromSpec;
  }
  const fromTitle = modelFromTitle(title);
  if (fromTitle !== null) {
    return fromTitle;
  }
  return normalizeH3cSku(sku);
}

function compactMeasure(value: string): string {
  return value.replace(/\s+/g, '').replace(/metr/i, 'm');
}

function speedLabel(
  title: string,
  specs: readonly H3cNameSpec[],
): string | null {
  const speed = specValue(
    specs,
    (label) => label.startsWith('sürət') || label.startsWith('suret'),
  );
  if (speed !== null) {
    const match = speed.match(/(\d+)\s*gbps/i);
    if (match !== null) {
      return `${match[1]}G`;
    }
  }
  const hay = haystack('', title, specs);
  if (/\b100g\b/.test(hay)) {
    return '100G';
  }
  if (/\b40g\b/.test(hay)) {
    return '40G';
  }
  if (/\b25g\b/.test(hay)) {
    return '25G';
  }
  if (/\b10g\b|sfp\+/.test(hay)) {
    return '10G';
  }
  if (/\b1g\b|1000base/.test(hay)) {
    return '1G';
  }
  return null;
}

function sfpModulePhrase(
  sku: string,
  title: string,
  specs: readonly H3cNameSpec[],
): string {
  const hay = haystack(sku, title, specs);
  if (/sfp28/.test(hay) || /\b25g\b/.test(hay)) {
    return 'SFP28 modul';
  }
  if (/sfp\+/.test(hay) || /\b10g\b/.test(hay)) {
    return 'SFP+ modul';
  }
  return 'SFP modul';
}

function accessoryPhrase(
  sku: string,
  title: string,
  specs: readonly H3cNameSpec[],
): string {
  const hay = haystack(sku, title, specs);
  if (/dac|kabel|cable/.test(hay)) {
    const speed = speedLabel(title, specs);
    const length = specValue(specs, (label) => label.startsWith('uzunluq'));
    const parts = [
      speed,
      'DAC kabel',
      length === null ? null : compactMeasure(length),
    ].filter((part): part is string => part !== null);
    return parts.join(' ');
  }
  if (/enerji techizati|power supply|psu/.test(hay)) {
    const watts = specValue(
      specs,
      (label) => label === 'güc' || label === 'guc',
    );
    return watts === null ? 'PSU' : `${compactMeasure(watts)} PSU`;
  }
  if (/fan|ventilyator/.test(hay)) {
    return 'fan modulu';
  }
  return 'şəbəkə aksesuarı';
}

function typePhrase(
  sku: string,
  title: string,
  subcategorySlug: string,
  specs: readonly H3cNameSpec[],
): string {
  const hay = haystack(sku, title, specs);
  if (subcategorySlug === 'router') {
    return /4g|lte/.test(hay) ? '4G LTE router' : 'router';
  }
  if (subcategorySlug === 'access-point') {
    if (/802\.11ax|wi-fi 6|wifi 6/.test(hay)) {
      return 'Wi-Fi 6 Access Point';
    }
    return 'Access Point';
  }
  if (subcategorySlug === 'kommutator') {
    const ports = firstPortCount(specs);
    const parts: string[] = [];
    if (ports !== null) {
      parts.push(`${ports}-port`);
    }
    if (/poe/.test(hay)) {
      parts.push('PoE+');
    } else if (/fiber/.test(hay)) {
      parts.push('fiber');
    }
    parts.push('kommutator');
    return parts.join(' ');
  }
  if (subcategorySlug === 'sfp-modullar') {
    return sfpModulePhrase(sku, title, specs);
  }
  return accessoryPhrase(sku, title, specs);
}

export function resolveH3cCatalogName(
  sku: string,
  fallbackTitle: string,
  options?: {
    subcategorySlug?: string;
    specs?: readonly H3cNameSpec[];
  },
): string {
  const normalized = normalizeH3cSku(sku);
  const specs = options?.specs ?? [];
  const subcategorySlug = options?.subcategorySlug ?? 'sebeke-aksesuarlari';
  const model = h3cDisplayModel(normalized, fallbackTitle, specs);
  const phrase = typePhrase(normalized, fallbackTitle, subcategorySlug, specs);
  const generated = `H3C ${model} ${phrase}`.replace(/\s+/g, ' ').trim();
  if (generated.length > 12) {
    return generated;
  }

  const trimmed = fallbackTitle.trim();
  if (/^h3c\b/i.test(trimmed)) {
    return trimmed;
  }
  return `H3C ${trimmed}`.trim();
}
