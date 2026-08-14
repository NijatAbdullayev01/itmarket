/**
 * Grandstream catalog names: brand + model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type GrandstreamNameSpec = {
  label: string;
  value: string;
};

const DISPLAY_MODEL_BY_SKU: Record<string, string> = {
  'POE-INJECTOR': 'PoE injector',
  'EU-5V-0.6A': '5V 0.6A PSU',
  '12V-5A-RPS-60W-B-PSU': 'RPS-60W-B',
  'GWN7802P-PRO': 'GWN7802P Pro',
  'GWN7803PL-PRO': 'GWN7803PL Pro',
  'GWN7806PL-PRO': 'GWN7806PL Pro',
};

export function normalizeGrandstreamSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\(WORLD\)/g, '')
    .replace(/\(EU PSU\)/g, '')
    .replace(/,/g, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function grandstreamDisplayModel(sku: string): string {
  const normalized = normalizeGrandstreamSku(sku);
  return DISPLAY_MODEL_BY_SKU[normalized] ?? normalized;
}

function specValue(
  specs: readonly GrandstreamNameSpec[],
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

function firstPortCount(specs: readonly GrandstreamNameSpec[]): string | null {
  const ports = specValue(specs, (label) => label.startsWith('port'));
  if (ports === null) {
    return null;
  }
  const match = ports.match(/(\d+)\s*[×x]/i);
  return match?.[1] ?? null;
}

function isPoeSwitchSku(sku: string): boolean {
  return /(?:P|PA|PL-PRO|P-PRO)$/.test(sku);
}

function accessPointPhrase(sku: string): string {
  const outdoor = /(?:ELR|LR)$/.test(sku);
  const inWall = sku === 'GWN7661';
  let wifi = 'Wi-Fi';
  if (sku.includes('7665')) {
    wifi = 'Wi-Fi 6E';
  } else if (sku.includes('7670')) {
    wifi = 'Wi-Fi 7';
  } else if (sku.startsWith('GWN766')) {
    wifi = 'Wi-Fi 6';
  } else if (sku.startsWith('GWN76')) {
    wifi = 'Wi-Fi 5';
  }
  if (inWall) {
    return `in-wall ${wifi} Access Point`;
  }
  if (outdoor) {
    return `outdoor ${wifi} Access Point`;
  }
  return `${wifi} Access Point`;
}

function accessoryPhrase(sku: string): string | null {
  if (sku === 'GUV3000') {
    return 'USB qulaqlıq';
  }
  if (sku === 'GBX20' || sku === 'GXP2200EXT') {
    return 'expansion modul';
  }
  if (sku === 'EU-5V-0.6A') {
    return 'enerji adapteri';
  }
  if (sku === 'POE-INJECTOR') {
    return 'PoE injector';
  }
  if (sku === '12V-5A-RPS-60W-B-PSU') {
    return 'ehtiyat PSU';
  }
  if (isGrandstreamSfpModuleSku(sku)) {
    return sku.includes('10G') ? 'SFP+ modul' : 'SFP modul';
  }
  return null;
}

export function isGrandstreamSfpModuleSku(sku: string): boolean {
  const normalized = normalizeGrandstreamSku(sku);
  return normalized.startsWith('F-MM') || normalized.startsWith('F-SM');
}

export function inferGrandstreamSubcategorySlug(sku: string): string {
  const normalized = normalizeGrandstreamSku(sku);
  if (isGrandstreamSfpModuleSku(normalized)) {
    return 'sfp-modullar';
  }
  const accessory = accessoryPhrase(normalized);
  if (accessory !== null) {
    if (
      normalized === 'POE-INJECTOR' ||
      normalized === '12V-5A-RPS-60W-B-PSU'
    ) {
      return 'sebeke-aksesuarlari';
    }
    return 'ip-telefon-aksesuarlari';
  }
  if (normalized.startsWith('GCC') || normalized.startsWith('GWN70')) {
    return 'router';
  }
  if (normalized.startsWith('GWN76')) {
    return 'access-point';
  }
  if (normalized.startsWith('GWN77') || normalized.startsWith('GWN78')) {
    return 'kommutator';
  }
  if (normalized.startsWith('UCM')) {
    return 'ip-pbx';
  }
  if (normalized.startsWith('GXV')) {
    return 'ip-video-telefon';
  }
  if (normalized.startsWith('GAC')) {
    return 'ip-konfrans-telefonu';
  }
  if (normalized.startsWith('WP')) {
    return 'ip-wi-fi-telefon';
  }
  if (normalized.startsWith('DP')) {
    return 'ip-dect-telefon';
  }
  if (
    normalized.startsWith('GHP') ||
    normalized.startsWith('GRP') ||
    /^GXP\d/.test(normalized)
  ) {
    return 'ip-telefon';
  }
  return 'sebeke-aksesuarlari';
}

function typePhrase(
  sku: string,
  subcategorySlug: string,
  specs: readonly GrandstreamNameSpec[],
): string {
  const accessory = accessoryPhrase(sku);
  if (accessory !== null) {
    return accessory;
  }
  if (sku === 'DP755') {
    return 'IP DECT baza stansiyası';
  }
  if (sku.startsWith('GCC')) {
    return sku.endsWith('W')
      ? 'Wi-Fi 6 konvergens router'
      : 'konvergens router';
  }
  if (sku === 'GWN7062E') {
    return 'Wi-Fi 6 router';
  }
  if (subcategorySlug === 'access-point') {
    return accessPointPhrase(sku);
  }
  if (subcategorySlug === 'kommutator') {
    const ports = firstPortCount(specs);
    const parts: string[] = [];
    if (ports !== null) {
      parts.push(`${ports}-port`);
    }
    if (isPoeSwitchSku(sku)) {
      parts.push('PoE');
    }
    parts.push('kommutator');
    return parts.join(' ');
  }
  if (sku.startsWith('GHP')) {
    const color = specValue(specs, (label) => label.startsWith('rəng'));
    const colorWord =
      color !== null && /qara|black/i.test(color)
        ? 'qara'
        : color !== null && /ağ|white/i.test(color)
          ? 'ağ'
          : null;
    return colorWord === null
      ? 'hotel IP telefon'
      : `${colorWord} hotel IP telefon`;
  }
  if (
    sku.startsWith('DP') &&
    /rugged/i.test(specValue(specs, (label) => label === 'tip') ?? '')
  ) {
    return 'rugged IP DECT telefon';
  }

  const bySlug: Record<string, string> = {
    router: 'router',
    'ip-telefon': 'IP telefon',
    'ip-video-telefon': 'IP Video telefon',
    'ip-dect-telefon': 'IP DECT telefon',
    'ip-wi-fi-telefon': 'IP Wi-Fi telefon',
    'ip-konfrans-telefonu': 'IP Konfrans telefonu',
    'ip-pbx': 'IP PBX',
    'ip-telefon-aksesuarlari': 'IP telefon aksesuarı',
    'sfp-modullar': 'SFP modul',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'şəbəkə avadanlığı';
}

export function resolveGrandstreamCatalogName(
  sku: string,
  fallbackTitle: string,
  options?: {
    subcategorySlug?: string;
    specs?: readonly GrandstreamNameSpec[];
  },
): string {
  const normalized = normalizeGrandstreamSku(sku);
  const subcategorySlug =
    options?.subcategorySlug ?? inferGrandstreamSubcategorySlug(normalized);
  const model = grandstreamDisplayModel(normalized);
  const phrase = typePhrase(normalized, subcategorySlug, options?.specs ?? []);
  const generated = `Grandstream ${model} ${phrase}`
    .replace(/\s+/g, ' ')
    .trim();
  if (generated.length > 12) {
    return generated;
  }

  const trimmed = fallbackTitle.trim();
  if (/^grandstream\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Grandstream ${trimmed}`.trim();
}
