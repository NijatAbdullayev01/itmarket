/**
 * Checkout UI uses slug values (e.g. "baku"); backoffice/DB may store
 * display labels (e.g. "Bakı"). Matching must accept both forms.
 *
 * Note: slugify("Bakı") => "baki", but the storefront option value is "baku".
 */
const ADMINISTRATIVE_AREA_ALIASES: ReadonlyArray<{
  label: string;
  value: string;
}> = [
  { label: 'Bakı', value: 'baku' },
  { label: 'Gəncə', value: 'gence' },
  { label: 'Xankəndi', value: 'xankendi' },
  { label: 'Lənkəran', value: 'lenkeran' },
  { label: 'Mingəçevir', value: 'mingecevir' },
  { label: 'Naftalan', value: 'naftalan' },
  { label: 'Sumqayıt', value: 'sumqayit' },
  { label: 'Şəki', value: 'seki' },
  { label: 'Şirvan', value: 'sirvan' },
  { label: 'Yevlax', value: 'yevlax' },
  { label: 'Naxçıvan', value: 'naxcivan' },
  { label: 'Binəqədi', value: 'bineqedi' },
  { label: 'Xətai', value: 'xetai' },
  { label: 'Xəzər', value: 'xezer' },
  { label: 'Qaradağ', value: 'qaradag' },
  { label: 'Nərimanov', value: 'nerimanov' },
  { label: 'Nəsimi', value: 'nesimi' },
  { label: 'Nizami', value: 'nizami' },
  { label: 'Pirallahı', value: 'pirallahi' },
  { label: 'Sabunçu', value: 'sabuncu' },
  { label: 'Səbail', value: 'sebail' },
  { label: 'Suraxanı', value: 'suraxani' },
  { label: 'Yasamal', value: 'yasamal' },
];

const BAKU_CITY_VALUE = 'baku';

const BAKU_ADMINISTRATIVE_AREA_VALUES = new Set<string>([
  BAKU_CITY_VALUE,
  'bineqedi',
  'xetai',
  'xezer',
  'qaradag',
  'nerimanov',
  'nesimi',
  'nizami',
  'pirallahi',
  'sabuncu',
  'sebail',
  'suraxani',
  'yasamal',
]);

export const EXPRESS_DELIVERY_SURCHARGE_AZN = 10;

export type DeliverySpeed = 'STANDARD' | 'EXPRESS';

function slugifyAdministrativeArea(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function administrativeAreaKeys(value: string) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const slug = slugifyAdministrativeArea(trimmed);
  const keys = new Set<string>();

  if (lower) keys.add(lower);
  if (slug) keys.add(slug);

  const matched = ADMINISTRATIVE_AREA_ALIASES.find(
    (area) =>
      area.value === lower ||
      area.value === slug ||
      area.label.toLowerCase() === lower ||
      slugifyAdministrativeArea(area.label) === slug,
  );

  if (matched) {
    keys.add(matched.value);
    keys.add(matched.label.toLowerCase());
    keys.add(slugifyAdministrativeArea(matched.label));
  }

  return keys;
}

export function matchesAdministrativeArea(stored: string, query: string) {
  const storedKeys = administrativeAreaKeys(stored);
  const queryKeys = administrativeAreaKeys(query);

  return Array.from(storedKeys).some((storedKey) => queryKeys.has(storedKey));
}

export function normalizeAdministrativeAreaQuery(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed === '' || trimmed === undefined ? undefined : trimmed;
}

export function isBakuAdministrativeArea(value: string) {
  const keys = administrativeAreaKeys(value);
  return Array.from(keys).some((key) =>
    BAKU_ADMINISTRATIVE_AREA_VALUES.has(key),
  );
}

export function parseDeliverySpeedFromNotes(
  notes: string | null | undefined,
): DeliverySpeed {
  if (notes?.includes('Çatdırılma növü: Təcili')) {
    return 'EXPRESS';
  }
  return 'STANDARD';
}

export function resolveCheckoutDeliveryFee(input: {
  zoneFee: string | number;
  freeDeliveryMinimum?: string | number | null;
  subtotal: string | number;
  administrativeArea?: string | null;
  deliverySpeed?: DeliverySpeed;
  fulfillmentType?: 'DELIVERY' | 'PICKUP';
}) {
  if (input.fulfillmentType === 'PICKUP') {
    return '0.00';
  }

  const area = input.administrativeArea?.trim();
  const deliverySpeed = input.deliverySpeed ?? 'STANDARD';

  if (area && isBakuAdministrativeArea(area)) {
    if (deliverySpeed === 'EXPRESS') {
      return EXPRESS_DELIVERY_SURCHARGE_AZN.toFixed(2);
    }
    return '0.00';
  }

  const subtotal = Number(input.subtotal);
  const freeDeliveryMinimum =
    input.freeDeliveryMinimum === null ||
    input.freeDeliveryMinimum === undefined
      ? null
      : Number(input.freeDeliveryMinimum);
  const zoneFee = Number(input.zoneFee);

  if (
    freeDeliveryMinimum !== null &&
    !Number.isNaN(subtotal) &&
    !Number.isNaN(freeDeliveryMinimum) &&
    subtotal >= freeDeliveryMinimum
  ) {
    return '0.00';
  }

  return zoneFee.toFixed(2);
}
