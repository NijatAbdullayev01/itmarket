/**
 * UGREEN catalog names: brand + marketing series + key spec + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 * Cable length is taken from the Excel title when present (Icecat specs are often copied).
 */

export type UgreenNameSpec = {
  label: string;
  value: string;
};

export function normalizeUgreenSku(sku: string): string {
  return sku
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function specValue(
  specs: readonly UgreenNameSpec[],
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

function fold(value: string): string {
  return value
    .toLocaleLowerCase('az')
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ğ', 'g')
    .replaceAll('ş', 's')
    .replaceAll('ç', 'c');
}

function haystack(title: string, specs: readonly UgreenNameSpec[]): string {
  return fold(
    `${title} ${specs.map((entry) => `${entry.label} ${entry.value}`).join(' ')}`,
  );
}

function stripLeadingBrand(title: string): string {
  return title.replace(/^UGREEN\s+/i, '').trim();
}

function joinParts(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => part !== null && part !== undefined)
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TITLE_COLOR_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bpink\s*blue\b|\bpink-blue\b/i, label: 'çəhrayı-göy' },
  { pattern: /\bspace\s*gr[ae]y\b/i, label: 'kosmik boz' },
  { pattern: /\bmidnight\s*blue\b/i, label: 'tünd göy' },
  { pattern: /\bpurple\b/i, label: 'bənövşəyi' },
  { pattern: /\bpink\b/i, label: 'çəhrayı' },
  { pattern: /\bbeige\b/i, label: 'bej' },
  { pattern: /\bwhite\b/i, label: 'ağ' },
  { pattern: /\bblack\b/i, label: 'qara' },
  { pattern: /\bblue\b/i, label: 'göy' },
  { pattern: /\bgr[ae]y\b/i, label: 'boz' },
];

export function colorFromTitle(title: string): string | null {
  for (const entry of TITLE_COLOR_PATTERNS) {
    if (entry.pattern.test(title)) {
      return entry.label;
    }
  }
  return null;
}

export function lengthFromTitle(title: string): string | null {
  const match = stripLeadingBrand(title).match(
    /(\d+(?:[.,]\d+)?)\s*(cm|sm|m)\b/i,
  );
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }
  const amount = match[1].replace(',', '.');
  const unit = match[2].toLowerCase();
  if (unit === 'cm' || unit === 'sm') {
    return `${amount} sm`;
  }
  return `${amount} m`;
}

function lengthFromSpecs(specs: readonly UgreenNameSpec[]): string | null {
  const raw = specValue(specs, (label) => label.startsWith('uzunluq'));
  if (raw === null) {
    return null;
  }
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(cm|sm|m)\b/i);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return raw.replace(/\s+/g, ' ').trim();
  }
  const amount = match[1].replace(',', '.');
  const unit = match[2].toLowerCase();
  if (unit === 'cm' || unit === 'sm') {
    return `${amount} sm`;
  }
  return `${amount} m`;
}

export function resolveUgreenLength(
  title: string,
  specs: readonly UgreenNameSpec[] = [],
): string | null {
  return lengthFromTitle(title) ?? lengthFromSpecs(specs);
}

/** Overlay title length onto requiredSpecs for cable-like products. */
export function applyTitleLengthToSpecs(
  title: string,
  specs: readonly UgreenNameSpec[],
): UgreenNameSpec[] {
  const length = lengthFromTitle(title);
  if (length === null) {
    return specs.map((entry) => ({ ...entry }));
  }
  let replaced = false;
  const next = specs.map((entry) => {
    if (fold(entry.label).startsWith('uzunluq')) {
      replaced = true;
      return { label: entry.label, value: length };
    }
    return { ...entry };
  });
  if (!replaced) {
    next.push({ label: 'Uzunluq', value: length });
  }
  return next;
}

function wattageToken(
  title: string,
  specs: readonly UgreenNameSpec[],
): string | null {
  const titleMatch = stripLeadingBrand(title).match(/(\d+)\s*W\b/i);
  if (titleMatch !== null) {
    return `${titleMatch[1]}W`;
  }
  const fromSpec =
    specValue(
      specs,
      (label) => label === 'ümumi güc' || label === 'umumi guc',
    ) ??
    specValue(
      specs,
      (label) => label === 'maks. güc' || label === 'maks. guc',
    ) ??
    specValue(specs, (label) => label === 'güc' || label === 'guc');
  if (fromSpec === null) {
    return null;
  }
  const specMatch = fromSpec.match(/(\d+)/);
  return specMatch === null ? null : `${specMatch[1]}W`;
}

function capacityToken(
  title: string,
  specs: readonly UgreenNameSpec[],
): string | null {
  const titleMatch = stripLeadingBrand(title).match(/(\d[\d.]*)\s*mAh/i);
  if (titleMatch !== null && titleMatch[1] !== undefined) {
    return `${titleMatch[1].replace(/[.]/g, '')}mAh`;
  }
  const fromSpec =
    specValue(specs, (label) => label === 'tutum') ??
    specValue(specs, (label) => fold(label).includes('batareya tutumu'));
  if (fromSpec === null) {
    return null;
  }
  const specMatch = fromSpec.replace(/\s/g, '').match(/(\d+)/);
  return specMatch === null ? null : `${specMatch[1]}mAh`;
}

function seriesToken(title: string): string | null {
  const raw = stripLeadingBrand(title);
  if (/Nexode\s+Pro/i.test(raw)) {
    return 'Nexode Pro';
  }
  if (/Nexode\s+S\b/i.test(raw)) {
    return 'Nexode S';
  }
  if (/Nexode\s+mini/i.test(raw)) {
    return 'Nexode mini';
  }
  if (/Nexode/i.test(raw)) {
    return 'Nexode';
  }
  if (/Uno\s+RG/i.test(raw)) {
    return 'Uno RG';
  }
  if (/\bUno\b/i.test(raw)) {
    return 'Uno';
  }
  if (/HiTune\s+Max5c/i.test(raw)) {
    return 'HiTune Max5c';
  }
  if (/HiTune\s+H5/i.test(raw)) {
    return 'HiTune H5';
  }
  if (/HiTune\s+P3/i.test(raw)) {
    return 'HiTune P3';
  }
  if (/FUN\+/i.test(raw)) {
    return 'FUN+';
  }
  return null;
}

function hasGan(title: string, specs: readonly UgreenNameSpec[]): boolean {
  return /gan/i.test(haystack(title, specs));
}

function inOneToken(title: string): string | null {
  const match = stripLeadingBrand(title).match(/(\d+)\s*-?\s*in-1/i);
  return match === null ? null : `${match[1]}-in-1`;
}

function manufacturerModel(specs: readonly UgreenNameSpec[]): string | null {
  const model = specValue(specs, (label) => label === 'model');
  if (model === null) {
    return null;
  }
  const compact = model.trim().toUpperCase();
  if (!/^[A-Z]{1,5}\d{2,4}[A-Z0-9-]*$/.test(compact)) {
    return null;
  }
  return compact;
}

function portsToken(title: string): string | null {
  const raw = stripLeadingBrand(title);
  if (/\b4-port\b/i.test(raw) || /\b4\s*port\b/i.test(raw)) {
    return '4-port';
  }
  if (/\b3c1a\b/i.test(raw)) {
    return '3C1A';
  }
  if (/\b2c1a\b/i.test(raw)) {
    return '2C1A';
  }
  if (/\b3-port\b/i.test(raw) || /\b3\s*port\b/i.test(raw)) {
    return '3-port';
  }
  if (/dual usb-c/i.test(raw)) {
    return 'Dual USB-C';
  }
  if (/a\+c|dual-port/i.test(raw)) {
    return 'A+C';
  }
  if (/\b2-port\b/i.test(raw) || /\b2\s*port\b/i.test(raw)) {
    return '2-port';
  }
  if (/dual usb\b/i.test(raw)) {
    return 'Dual USB';
  }
  return null;
}

function usbConnectorPhrase(title: string): string | null {
  const hay = fold(stripLeadingBrand(title));
  if (/usb-c to usb-c|usb-c ↔ usb-c|type c male to type c/.test(hay)) {
    return 'USB-C - USB-C';
  }
  if (
    /usb 3\.0 a male to type c|usb-a to usb-c|type c to usb 3\.0 a/.test(hay)
  ) {
    return 'USB-A - USB-C';
  }
  if (/usb 2\.0 am to bm|print cable/.test(hay)) {
    return 'USB-A - USB-B';
  }
  if (/usb-c to 3\.5|usb-c → 3\.5/.test(hay)) {
    return 'USB-C - 3.5 mm';
  }
  if (/6\.5mm male to 3\.5mm/.test(hay)) {
    return '6.5 mm - 3.5 mm';
  }
  if (/3\.5mm male to 2rca|3\.5 mm male to 2rca/.test(hay)) {
    return '3.5 mm - 2RCA';
  }
  if (/3\.5mm male to 3\.5mm/.test(hay)) {
    return '3.5 mm - 3.5 mm';
  }
  if (/usb-c to hdmi/.test(hay)) {
    return 'USB-C - HDMI';
  }
  if (/displayport to hdmi/.test(hay)) {
    return 'DisplayPort - HDMI';
  }
  if (/dp male to vga|displayport to vga/.test(hay)) {
    return 'DisplayPort - VGA';
  }
  if (/hdmi to vga/.test(hay)) {
    return 'HDMI - VGA';
  }
  return null;
}

export function ugreenDisplayModel(
  title: string,
  specs: readonly UgreenNameSpec[] = [],
  subcategorySlug = '',
): string {
  const raw = stripLeadingBrand(title);
  const hay = haystack(title, specs);
  const series = seriesToken(title);
  const watts = wattageToken(title, specs);
  const capacity = capacityToken(title, specs);
  const gan = hasGan(title, specs) ? 'GaN' : null;
  const inOne = inOneToken(title);
  const connectors = usbConnectorPhrase(title);

  if (subcategorySlug === 'sarj-cihazi') {
    if (/qc3\.0/i.test(raw)) {
      return joinParts(['QC3.0', watts]);
    }
    if (/pd\s*20w/i.test(raw) && series === null) {
      return joinParts([watts, 'PD']);
    }
    return joinParts([series, watts, gan, portsToken(title)]);
  }

  if (subcategorySlug === 'simsiz-sarj') {
    return joinParts([
      manufacturerModel(specs),
      inOne,
      /magnetic|maqnit/i.test(hay) ? 'maqnit' : null,
    ]);
  }

  if (subcategorySlug === 'avtomobil-telefon-sarji') {
    return joinParts([watts, portsToken(title), inOne]);
  }

  if (subcategorySlug === 'powerbank') {
    const magnetic = /magnetic|maqnit/i.test(hay) ? 'maqnit' : null;
    const wireless =
      magnetic === null && /wireless|simsiz/i.test(hay) ? 'simsiz' : null;
    const builtIn = /built-in cable|daxili kabel|built-in usb-c/i.test(hay)
      ? 'daxili kabelli'
      : null;
    const titleWatts = wattageToken(title, []);
    return joinParts([
      magnetic === null ? null : manufacturerModel(specs),
      capacity,
      titleWatts,
      portsToken(title),
      magnetic,
      wireless,
      builtIn,
    ]);
  }

  if (
    subcategorySlug === 'usb-kabel' ||
    subcategorySlug === 'audio-kabel' ||
    subcategorySlug === 'hdmi-kabel'
  ) {
    const extra = /retractable|yigilan|yığılan/i.test(hay) ? 'yığılan' : null;
    const angled = /90\s*degree|90°|down-angled|bucaqli|bucaqlı/i.test(hay)
      ? '90°'
      : null;
    if (subcategorySlug === 'hdmi-kabel') {
      return joinParts(['HDMI 4K', angled]);
    }
    return joinParts([connectors, watts, extra]);
  }

  if (subcategorySlug === 'sebeke-aksesuarlari') {
    if (/rj45 ethernet connector|rj45.*connector/i.test(hay)) {
      return 'RJ45';
    }
    if (/modular plugs|rj45.*plug/i.test(hay)) {
      return 'Cat 6 RJ45';
    }
    return joinParts(['Cat 6']);
  }

  if (subcategorySlug === 'qulaqliq') {
    return series ?? raw.replace(/,.*/, '').trim();
  }

  if (subcategorySlug === 'dok-stansiya') {
    return joinParts([
      inOne === null ? manufacturerModel(specs) : null,
      inOne,
      'USB-C',
    ]);
  }

  if (subcategorySlug === 'video-adapter') {
    const resolution = /\b4k\b/i.test(hay)
      ? '4K'
      : /\b1080p\b/i.test(hay)
        ? '1080p'
        : null;
    return joinParts([connectors, resolution]);
  }

  if (subcategorySlug === 'hdmi-extender') {
    const wireless = /wireless|simsiz/i.test(hay) ? 'simsiz' : null;
    const distance = raw.match(/(\d+)\s*m\b/i);
    return joinParts([
      wireless,
      'HDMI',
      distance === null ? null : `${distance[1]}m`,
    ]);
  }

  if (subcategorySlug === 'usb-hub') {
    return joinParts(['USB 3.0']);
  }

  if (subcategorySlug === 'usb-switch') {
    const usb = /usb\s*3/i.test(hay) ? 'USB 3.0' : 'USB 2.0';
    return joinParts(['2-in-4', usb]);
  }

  if (subcategorySlug === 'kart-oxuyucusu') {
    return /all-in-one/i.test(hay) ? 'USB 3.0 All-in-One' : 'USB 3.0';
  }

  if (subcategorySlug === 'sebeke-adapteri') {
    if (/ac650|wireless usb|wi-fi|wifi/i.test(hay)) {
      return 'AC650';
    }
    if (/usb type c|usb-c/i.test(hay)) {
      return 'USB-C Gigabit';
    }
    if (/hub with gigabit/i.test(hay)) {
      return 'USB 3.0 hub Gigabit';
    }
    return 'USB 3.0 Gigabit';
  }

  if (subcategorySlug === 'bluetooth-adapter') {
    const version = raw.match(/Bluetooth\s+([\d.]+)/i);
    return joinParts([
      'Bluetooth',
      version === null ? null : version[1],
      'USB',
    ]);
  }

  if (subcategorySlug === 'bluetooth-adapter-audio') {
    return 'Bluetooth 5.0';
  }

  if (subcategorySlug === 'ses-karti') {
    if (/2 ports usb-c hub/i.test(hay)) {
      return 'USB-C hub 3.5 mm';
    }
    return 'USB';
  }

  if (subcategorySlug === 'sican') {
    if (series === 'FUN+') {
      return 'FUN+';
    }
    if (/vertical/i.test(hay)) {
      return 'vertikal';
    }
    if (/multi-mode/i.test(hay)) {
      return 'multi-mode';
    }
    return 'erqonomik';
  }

  if (subcategorySlug === 'noutbuk-cantasi') {
    const size = raw.match(/(\d+(?:\.\d+)?)''[^\d]*(\d+(?:\.\d+)?)''/);
    if (size !== null && size[1] !== undefined && size[2] !== undefined) {
      return `${size[1]}-${size[2]}"`;
    }
    const single = raw.match(/(\d+)''/);
    return single === null || single[1] === undefined ? '' : `${single[1]}"`;
  }

  if (subcategorySlug === 'hdd-qutusu') {
    return '2.5"';
  }

  if (subcategorySlug === 'magsafe-aksesuar') {
    return 'MagSafe';
  }

  if (subcategorySlug === 'avtomobil-telefon-tutacagi') {
    return /gravity/i.test(hay) ? 'Gravity' : '';
  }

  if (subcategorySlug === 'noutbuk-aksesuarlari') {
    return /vertical/i.test(hay) ? 'vertikal' : 'qatlanan';
  }

  if (subcategorySlug === 'teqdimat-cihazi') {
    return '';
  }

  if (subcategorySlug === 'mikrofon') {
    return '';
  }

  if (subcategorySlug === 'telefon-dayagi') {
    return '';
  }

  return series ?? raw.replace(/,.*$/, '').trim();
}

function typePhrase(
  title: string,
  subcategorySlug: string,
  displayModel: string,
  specs: readonly UgreenNameSpec[],
): string {
  const hay = haystack(title, specs);
  const modelHay = fold(displayModel);

  if (subcategorySlug === 'sarj-cihazi') {
    if (/\bset\b/i.test(stripLeadingBrand(title))) {
      return 'şarj dəsti';
    }
    return 'şarj cihazı';
  }
  if (subcategorySlug === 'simsiz-sarj') {
    return 'simsiz şarj';
  }
  if (subcategorySlug === 'avtomobil-telefon-sarji') {
    return 'avtomobil şarjı';
  }
  if (subcategorySlug === 'powerbank') {
    return 'powerbank';
  }
  if (subcategorySlug === 'usb-kabel') {
    if (/lanyard|adapter cable/i.test(hay) && /adapter/i.test(hay)) {
      return 'USB adapter';
    }
    return 'kabel';
  }
  if (subcategorySlug === 'audio-kabel') {
    if (/adapter/i.test(hay) && !/cable/i.test(hay)) {
      return 'audio adapter';
    }
    if (/10\s*cm|10sm/i.test(hay) && /usb-c to 3\.5/i.test(hay)) {
      return 'audio adapter';
    }
    return 'audio kabel';
  }
  if (subcategorySlug === 'hdmi-kabel') {
    if (/adapter/i.test(hay)) {
      return 'adapter';
    }
    return 'kabel';
  }
  if (subcategorySlug === 'sebeke-aksesuarlari') {
    if (/connector/i.test(hay) || /konnektor/.test(modelHay)) {
      return 'konnektor';
    }
    if (/plug/i.test(hay)) {
      return 'konnektor 100 əd';
    }
    return 'LAN kabel';
  }
  if (subcategorySlug === 'qulaqliq') {
    if (/earbud|true wireless/i.test(hay)) {
      return 'TWS qulaqlıq';
    }
    if (/anc|noise-cancell/i.test(hay)) {
      return 'ANC qulaqlıq';
    }
    return 'qulaqlıq';
  }
  if (subcategorySlug === 'dok-stansiya') {
    const titleHay = fold(stripLeadingBrand(title));
    if (/\bhub\b/.test(titleHay) || /6-in-1/.test(modelHay)) {
      return 'hub';
    }
    return 'dok stansiyası';
  }
  if (subcategorySlug === 'video-adapter') {
    if (/cable/i.test(hay)) {
      return 'kabel';
    }
    return 'adapter';
  }
  if (subcategorySlug === 'hdmi-extender') {
    return 'extender';
  }
  if (subcategorySlug === 'usb-hub') {
    return 'hub';
  }
  if (subcategorySlug === 'usb-switch') {
    return 'switch';
  }
  if (subcategorySlug === 'kart-oxuyucusu') {
    return 'kart oxuyucu';
  }
  if (subcategorySlug === 'teqdimat-cihazi') {
    return 'simsiz presenter';
  }
  if (subcategorySlug === 'magsafe-aksesuar') {
    return 'metal halqa';
  }
  if (subcategorySlug === 'avtomobil-telefon-tutacagi') {
    return 'avtomobil tutacağı';
  }
  if (subcategorySlug === 'telefon-dayagi') {
    return 'telefon dayaqı';
  }
  if (subcategorySlug === 'noutbuk-aksesuarlari') {
    return 'noutbuk dayaqı';
  }
  if (subcategorySlug === 'noutbuk-cantasi') {
    if (/sleeve/i.test(hay)) {
      return 'noutbuk qabı';
    }
    return 'noutbuk çantası';
  }
  if (subcategorySlug === 'hdd-qutusu') {
    return 'HDD qutu';
  }
  if (subcategorySlug === 'bluetooth-adapter') {
    return 'adapter';
  }
  if (subcategorySlug === 'bluetooth-adapter-audio') {
    return 'ötürücü';
  }
  if (subcategorySlug === 'ses-karti') {
    return 'səs kartı';
  }
  if (subcategorySlug === 'sican') {
    return 'simsiz siçan';
  }
  if (subcategorySlug === 'mikrofon') {
    return 'USB mikrofon';
  }
  if (subcategorySlug === 'sebeke-adapteri') {
    if (/wireless|wi-fi|wifi|ac650/i.test(hay)) {
      return 'Wi-Fi adapter';
    }
    return 'Ethernet adapter';
  }
  return 'UGREEN məhsulu';
}

function alreadyHasTail(model: string, phrase: string): boolean {
  const modelFold = fold(model);
  const tail = fold(phrase);
  return modelFold === tail || modelFold.endsWith(` ${tail}`);
}

export function resolveUgreenCatalogName(
  sku: string,
  fallbackTitle: string,
  options?: {
    subcategorySlug?: string;
    specs?: readonly UgreenNameSpec[];
  },
): string {
  const specs = options?.specs ?? [];
  const subcategorySlug = options?.subcategorySlug ?? 'sarj-cihazi';
  const title =
    fallbackTitle.trim() === '' ? normalizeUgreenSku(sku) : fallbackTitle;
  const model = ugreenDisplayModel(title, specs, subcategorySlug);
  const phrase = typePhrase(title, subcategorySlug, model, specs);
  const lengthNeeded =
    subcategorySlug === 'usb-kabel' ||
    subcategorySlug === 'audio-kabel' ||
    subcategorySlug === 'hdmi-kabel' ||
    subcategorySlug === 'sebeke-aksesuarlari';
  const length = lengthNeeded ? resolveUgreenLength(title, specs) : null;
  const skipLength =
    length !== null &&
    subcategorySlug === 'sebeke-aksesuarlari' &&
    /konnektor/.test(fold(phrase));
  const color = colorFromTitle(title);

  const core = alreadyHasTail(model, phrase)
    ? joinParts(['UGREEN', model])
    : joinParts(['UGREEN', model, phrase]);
  const generated = joinParts([core, skipLength ? null : length, color]);

  if (generated.length > 12) {
    return generated;
  }

  const trimmed = fallbackTitle.trim();
  if (/^ugreen\b/i.test(trimmed)) {
    return trimmed;
  }
  return joinParts(['UGREEN', trimmed]);
}
