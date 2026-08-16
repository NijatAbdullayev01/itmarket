/**
 * Aruba / Instant On catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type ArubaNameSpec = {
  label: string;
  value: string;
};

export function normalizeArubaSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function specValue(
  specs: readonly ArubaNameSpec[],
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
  specs: readonly ArubaNameSpec[],
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

export function stripArubaVendorPrefix(title: string): string {
  return collapseWhitespace(
    title
      .replace(/^(HPE\s+Networking\s+)/i, '')
      .replace(/^(HPE\s+)/i, '')
      .replace(/^(Aruba\s+Networking\s+)/i, '')
      .replace(/^(Aruba\s+)/i, '')
      .replace(/\s*\(RW\)/gi, ''),
  );
}

function compactSwitchConfig(rest: string): string {
  const refresh = /\(\s*B\s*\)/i.test(rest);
  const tokens = collapseWhitespace(
    rest
      .replace(/\(\s*B\s*\)/gi, ' ')
      .replace(/\b(Switch|kommutator)\b/gi, ' ')
      .replace(/\bClass4\b/gi, ' ')
      .replace(/\bCL4\b/gi, ' ')
      .replace(/\bCL6\b/gi, ' ')
      .replace(/\b\d+p\b/gi, ' ')
      .replace(/\bPoE\+/gi, 'PoE'),
  )
    .split(' ')
    .filter((token) => token !== '');
  const compact = tokens.join(' ');
  if (refresh) {
    return collapseWhitespace(`${compact} (B)`);
  }
  return compact;
}

function switchFamily(stripped: string): { family: string; rest: string } | null {
  const instant = stripped.match(/^(Instant On (?:1430|1830|1930|1960))\b/i);
  if (instant?.[1] !== undefined) {
    return {
      family: instant[1].replace(/\s+/g, ' '),
      rest: stripped.slice(instant[0].length),
    };
  }
  const cx = stripped.match(/^(CX (?:6200F|6100|6000))\b/i);
  if (cx?.[1] !== undefined) {
    return { family: cx[1], rest: stripped.slice(cx[0].length) };
  }
  const classic = stripped.match(/^(2930F)\b/i);
  if (classic?.[1] !== undefined) {
    return { family: classic[1], rest: stripped.slice(classic[0].length) };
  }
  return null;
}

function wifiGeneration(hay: string): string {
  if (/wi-fi 6e|wifi 6e|6e\b/.test(hay)) {
    return 'Wi-Fi 6E';
  }
  if (/802\.11ax|wi-fi 6|wifi 6/.test(hay)) {
    return 'Wi-Fi 6';
  }
  if (/802\.11ac|wi-fi 5|wifi 5/.test(hay)) {
    return 'Wi-Fi 5';
  }
  return 'Wi-Fi';
}

function accessPointModel(stripped: string, sku: string): string {
  const instant = stripped.match(/^Instant On\s+(AP\d+[A-Z]?)\b/i);
  if (instant?.[1] !== undefined) {
    return `Instant On ${instant[1].toUpperCase()}`;
  }
  const enterprise = stripped.match(/^(AP-\d+)\b/i);
  if (enterprise?.[1] !== undefined) {
    return enterprise[1].toUpperCase();
  }
  return normalizeArubaSku(sku);
}

function sfpModel(stripped: string, hay: string): string {
  const instant = /^Instant On\b/i.test(stripped) ? 'Instant On ' : '';
  let speed = '1G';
  if (/\b25g\b/.test(hay) || /sfp28/.test(hay)) {
    speed = '25G';
  } else if (/\b10g\b/.test(hay) || /sfp\+/.test(hay) || /10gbase/.test(hay)) {
    speed = '10G';
  }
  let form = 'SFP';
  if (/sfp28/.test(hay) || speed === '25G') {
    form = 'SFP28';
  } else if (/sfp\+/.test(hay) && speed === '10G') {
    form = 'SFP+';
  } else if (/10gbase-t|rj45/.test(hay) && speed === '10G' && !/sfp/.test(hay)) {
    form = 'RJ45';
  }
  const opticMatch = stripped.match(/\b(SX|LX|SR|LR)\b/i);
  const copper = /rj45|base-t|\bt\b/.test(hay) && opticMatch === null;
  const optic =
    opticMatch?.[1]?.toUpperCase() ?? (copper ? 'RJ45' : null);
  if (form === 'RJ45') {
    return collapseWhitespace(`${instant}${speed} RJ45`);
  }
  if (optic === 'RJ45') {
    return collapseWhitespace(`${instant}${speed} ${form} RJ45`);
  }
  if (optic !== null) {
    return collapseWhitespace(`${instant}${speed} ${form} ${optic}`);
  }
  return collapseWhitespace(`${instant}${speed} ${form}`);
}

function accessoryModel(stripped: string, hay: string, sku: string): string {
  if (/dac|direct attach/.test(hay)) {
    return '';
  }
  if (/ap-mnt-d|tavan montaj|ceiling mount/.test(hay)) {
    return 'AP-MNT-D';
  }
  const sleeve = stripped.match(/Instant On\s+(AP\d+[A-Z]?)\s+Flush/i);
  if (sleeve?.[1] !== undefined) {
    return `Instant On ${sleeve[1].toUpperCase()}`;
  }
  if (/802\.3at|30w poe/.test(hay)) {
    return 'Instant On 802.3at 30W';
  }
  if (/802\.3af|midspan/.test(hay)) {
    return 'Instant On 802.3af';
  }
  if (/48v|power adapter|enerji/.test(hay)) {
    const watts = stripped.match(/(\d+)\s*W/i)?.[1];
    return watts === undefined
      ? 'Instant On 48V'
      : `Instant On 48V ${watts}W`;
  }
  if (/pc-ac-ec|power cord|qida kabel/.test(hay)) {
    return 'PC-AC-EC';
  }
  const instant = stripped.match(/^(Instant On\b.+)$/i);
  if (instant?.[1] !== undefined) {
    return collapseWhitespace(
      instant[1]
        .replace(
          /\b(Power Adapter|PoE Midspan Injector|PoE Injector|Flush Mount Sleeve|Transceiver)\b/gi,
          '',
        )
        .replace(/\bAC Power Cord\b/gi, ''),
    );
  }
  return normalizeArubaSku(sku);
}

function dacPhrase(title: string, specs: readonly ArubaNameSpec[]): string {
  const length =
    specValue(specs, (label) => label.startsWith('uzunluq')) ??
    title.match(/(\d+(?:\.\d+)?)\s*m\b/i)?.[0] ??
    null;
  const speed = /25g/i.test(title)
    ? '25G'
    : /10g/i.test(title)
      ? '10G'
      : '1G';
  const measure =
    length === null ? null : length.replace(/\s+/g, '').replace(/metr/i, 'm');
  return collapseWhitespace(`${speed} DAC kabel ${measure ?? ''}`.trim());
}

function hasPoeCapability(
  title: string,
  specs: readonly ArubaNameSpec[],
): boolean {
  if (/\bpoe\b/i.test(title)) {
    return true;
  }
  const poe = specValue(
    specs,
    (label) => label === 'poe' || label.startsWith('poe'),
  );
  if (poe === null) {
    return false;
  }
  const folded = poe
    .toLocaleLowerCase('az')
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .trim();
  return !/^(yoxdur|yox|none|no|-|—)$/.test(folded);
}

function typePhrase(
  sku: string,
  title: string,
  subcategorySlug: string,
  specs: readonly ArubaNameSpec[],
): string {
  const hay = haystack(sku, title, specs);
  const titleHay = haystack('', title, []);
  if (subcategorySlug === 'router') {
    return hasPoeCapability(title, specs)
      ? 'PoE Secure Gateway'
      : 'Secure Gateway';
  }
  if (subcategorySlug === 'access-point') {
    const wifi = wifiGeneration(hay);
    if (/ap11d|desktop|hospitality/.test(hay)) {
      return `desktop ${wifi} Access Point`;
    }
    if (/outdoor/.test(hay)) {
      return `outdoor ${wifi} Access Point`;
    }
    return `${wifi} Access Point`;
  }
  if (subcategorySlug === 'kommutator') {
    return 'kommutator';
  }
  if (subcategorySlug === 'sfp-modullar') {
    return 'modul';
  }
  if (/dac|direct attach/.test(titleHay)) {
    return dacPhrase(title, specs);
  }
  if (/flush mount|flush montaj/.test(titleHay)) {
    return 'flush montaj';
  }
  if (/ap-mnt-d|ceiling mount/.test(titleHay)) {
    return 'tavan montajı';
  }
  if (/power cord|qida kabel|pc-ac-ec/.test(titleHay)) {
    return 'qida kabeli';
  }
  if (/injector|injektor|midspan/.test(titleHay)) {
    return 'PoE injektor';
  }
  if (/adapter|48v/.test(titleHay)) {
    return 'adapter';
  }
  return 'şəbəkə aksesuarı';
}

export function arubaDisplayModel(
  sku: string,
  title: string,
  specs: readonly ArubaNameSpec[] = [],
  subcategorySlug = 'sebeke-aksesuarlari',
): string {
  const stripped = stripArubaVendorPrefix(title);
  const hay = haystack(sku, title, specs);

  if (subcategorySlug === 'kommutator') {
    const parsed = switchFamily(stripped);
    if (parsed !== null) {
      const config = compactSwitchConfig(parsed.rest);
      return config === '' ? parsed.family : `${parsed.family} ${config}`;
    }
    return compactSwitchConfig(stripped) || normalizeArubaSku(sku);
  }

  if (subcategorySlug === 'access-point') {
    return accessPointModel(stripped, sku);
  }

  if (subcategorySlug === 'sfp-modullar') {
    return sfpModel(stripped, hay);
  }

  if (subcategorySlug === 'router') {
    const gateway = stripped.match(/^(Instant On\s+SG\d+[A-Z]*)/i);
    if (gateway?.[1] !== undefined) {
      return collapseWhitespace(gateway[1]);
    }
    return normalizeArubaSku(sku);
  }

  if (/dac|direct attach/.test(hay)) {
    return '';
  }
  return accessoryModel(stripped, hay, sku);
}

export function resolveArubaCatalogName(
  sku: string,
  fallbackTitle: string,
  options?: {
    subcategorySlug?: string;
    specs?: readonly ArubaNameSpec[];
  },
): string {
  const normalized = normalizeArubaSku(sku);
  const specs = options?.specs ?? [];
  const subcategorySlug = options?.subcategorySlug ?? 'sebeke-aksesuarlari';
  const model = arubaDisplayModel(
    normalized,
    fallbackTitle,
    specs,
    subcategorySlug,
  );
  const phrase = typePhrase(
    normalized,
    fallbackTitle,
    subcategorySlug,
    specs,
  );
  const generated = collapseWhitespace(`Aruba ${model} ${phrase}`);
  if (generated.length > 12) {
    return generated;
  }

  const stripped = stripArubaVendorPrefix(fallbackTitle);
  if (stripped !== '') {
    return collapseWhitespace(`Aruba ${stripped}`);
  }
  return `Aruba ${normalized}`;
}
