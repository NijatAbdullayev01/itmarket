/**
 * Jabra catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type JabraNameSpec = {
  label: string;
  value: string;
};

export function normalizeJabraSku(model: string): string {
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
  specs: readonly JabraNameSpec[],
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

function haystack(
  title: string,
  specs: readonly JabraNameSpec[],
): string {
  return fold(
    `${title} ${specs.map((entry) => `${entry.label} ${entry.value}`).join(' ')}`,
  );
}

function stripLeadingBrand(title: string): string {
  return title.replace(/^Jabra\s+/i, '').trim();
}

function formToken(title: string, specs: readonly JabraNameSpec[]): string | null {
  const hay = haystack(title, specs);
  if (/\bbuds\b/.test(hay) || /earbuds/.test(hay)) {
    return null;
  }
  if (/\bduo\b/.test(hay)) {
    return 'Duo';
  }
  if (/\bmono\b/.test(hay)) {
    return 'Mono';
  }
  if (/\bstereo\b/.test(hay)) {
    return 'Stereo';
  }
  return null;
}

function connectionToken(
  title: string,
  specs: readonly JabraNameSpec[],
): string | null {
  const hay = haystack(title, specs);
  if (/\bbiz\s*1500\b/.test(hay) || /\bqd\b/.test(fold(title))) {
    if (/\busb\b/.test(hay) && !/\bqd\b/.test(hay)) {
      return 'USB';
    }
    if (/\bqd\b/.test(hay)) {
      return 'QD';
    }
  }
  return null;
}

export function jabraDisplayModel(
  title: string,
  specs: readonly JabraNameSpec[] = [],
): string {
  const raw = stripLeadingBrand(title);
  const hay = haystack(title, specs);
  const form = formToken(title, specs);

  if (/blueparrott/i.test(raw)) {
    return 'BlueParrott C400-XT';
  }

  if (/foam ear cushion/i.test(raw)) {
    return 'Evolve 20-65 foam yastıq';
  }
  if (/leather cushion/i.test(raw)) {
    return 'Evolve 20-65 dəri yastıq';
  }
  if (/ear cushions for evolve2/i.test(raw)) {
    return 'Evolve2 40/65 yastıq dəsti';
  }

  if (/gn\s*1200/i.test(raw)) {
    return 'GN 1200 CC';
  }

  if (/link\s*230/i.test(raw)) {
    return 'LINK 230';
  }

  if (/panacast/i.test(raw)) {
    if (/remote/i.test(raw)) {
      return 'PanaCast 50 Remote';
    }
    if (/table stand/i.test(raw)) {
      return 'PanaCast 50 masa dayaqı';
    }
    if (/usb cable|usb kabel/i.test(raw)) {
      const length = raw.match(/(\d+)\s*m/i);
      return length !== null
        ? `PanaCast USB kabel ${length[1]}m`
        : 'PanaCast USB kabel';
    }
    return 'PanaCast 50';
  }

  if (/speak2/i.test(raw)) {
    const speak = raw.match(/Speak2\s+(\d+)/i);
    return speak !== null ? `Speak2 ${speak[1]}` : 'Speak2';
  }

  if (/evolve2\s+buds/i.test(raw)) {
    if (/damaged|zedelenmis|zədələn/i.test(raw)) {
      return 'Evolve2 Buds (zədələnmiş qutu)';
    }
    return 'Evolve2 Buds';
  }

  const biz = raw.match(/BIZ\s+1500/i);
  if (biz !== null) {
    const parts = ['BIZ 1500'];
    if (form !== null) {
      parts.push(form);
    }
    const connection = connectionToken(title, specs);
    if (connection !== null) {
      parts.push(connection);
    }
    return parts.join(' ');
  }

  const engage = raw.match(/Engage\s+(\d+)/i);
  if (engage !== null) {
    const parts = [`Engage ${engage[1]}`];
    if (form !== null) {
      parts.push(form);
    }
    return parts.join(' ');
  }

  const evolve3 = raw.match(/Evolve3\s+(\d+)/i);
  if (evolve3 !== null) {
    const parts = [`Evolve3 ${evolve3[1]}`];
    if (form !== null) {
      parts.push(form);
    }
    return parts.join(' ');
  }

  const evolve2 = raw.match(/Evolve2\s+(\d+)\s*(SE|Flex)?/i);
  if (evolve2 !== null) {
    const parts = [`Evolve2 ${evolve2[1]}`];
    if (evolve2[2] !== undefined && evolve2[2] !== '') {
      parts.push(evolve2[2]);
    }
    if (form !== null) {
      parts.push(form);
    }
    if (/\bstand\b/.test(hay) && !/table stand/.test(hay)) {
      parts.push('stendli');
    }
    return parts.join(' ');
  }

  const evolve = raw.match(/Evolve\s+(\d+)\s*(II|TE)?/i);
  if (evolve !== null) {
    const parts = [`Evolve ${evolve[1]}`];
    if (evolve[2] !== undefined && evolve[2] !== '') {
      parts.push(evolve[2].toUpperCase() === 'II' ? 'II' : evolve[2]);
    }
    if (form !== null) {
      parts.push(form);
    }
    return parts.join(' ');
  }

  return raw.replace(/,.*$/, '').trim() || raw;
}

function headsetKind(
  title: string,
  specs: readonly JabraNameSpec[],
  displayModel: string,
): string {
  const hay = haystack(title, specs);
  const modelHay = fold(displayModel);
  if (/\bstendli\b/.test(modelHay)) {
    return 'qulaqlıq';
  }
  if (/\bbuds\b/.test(hay) || /earbuds/.test(hay)) {
    return 'qulaqlıq';
  }
  if (/bluetooth/.test(hay)) {
    return 'Bluetooth qulaqlıq';
  }
  if (/dect/.test(hay)) {
    return 'DECT qulaqlıq';
  }
  if (/wireless/.test(hay) && !/wired/.test(hay)) {
    return 'simsiz qulaqlıq';
  }
  if (/\bqd\b/.test(modelHay) || /\busb\b/.test(modelHay)) {
    return 'qulaqlıq';
  }
  if (/\bqd\b/.test(hay)) {
    return 'QD qulaqlıq';
  }
  if (/usb/.test(hay)) {
    return 'USB qulaqlıq';
  }
  return 'qulaqlıq';
}

function typePhrase(
  title: string,
  subcategorySlug: string,
  displayModel: string,
  specs: readonly JabraNameSpec[],
): string {
  const modelHay = fold(displayModel);
  if (subcategorySlug === 'qulaqliq') {
    return headsetKind(title, specs, displayModel);
  }
  if (subcategorySlug === 'qulaqliq-aksesuarlari') {
    if (/yastiq/.test(modelHay)) {
      return '';
    }
    if (/gn 1200/.test(modelHay) || /kabel/.test(modelHay)) {
      return 'headset kabeli';
    }
    if (/link 230/.test(modelHay)) {
      return 'USB adapter';
    }
    return 'qulaqlıq aksesuarı';
  }
  if (subcategorySlug === 'konfrans-dinamiki') {
    return 'konfrans dinamiki';
  }
  if (subcategorySlug === 'konfrans-kamerasi') {
    return 'konfrans kamerası';
  }
  if (subcategorySlug === 'konfrans-kamera-aksesuarlari') {
    if (/remote/.test(modelHay)) {
      return 'pult';
    }
    if (/dayaqi|kabel/.test(modelHay)) {
      return '';
    }
    return 'konfrans kamera aksesuarı';
  }
  return 'Jabra məhsulu';
}

function collapseDuplicateTail(model: string, phrase: string): string {
  const generated = `Jabra ${model} ${phrase}`.replace(/\s+/g, ' ').trim();
  return generated.replace(/\s{2,}/g, ' ');
}

export function resolveJabraCatalogName(
  sku: string,
  fallbackTitle: string,
  options?: {
    subcategorySlug?: string;
    specs?: readonly JabraNameSpec[];
  },
): string {
  const specs = options?.specs ?? [];
  const subcategorySlug = options?.subcategorySlug ?? 'qulaqliq';
  const title = fallbackTitle.trim() === '' ? normalizeJabraSku(sku) : fallbackTitle;
  const model = jabraDisplayModel(title, specs);
  const phrase = typePhrase(title, subcategorySlug, model, specs);
  const generated = collapseDuplicateTail(model, phrase);
  if (generated.length > 12) {
    return generated;
  }

  const trimmed = fallbackTitle.trim();
  if (/^jabra\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Jabra ${trimmed}`.trim();
}
