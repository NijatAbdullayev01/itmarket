/**
 * "Yanında ala biləcəyiniz məhsullar" — accessories that belong to the same
 * category family as the viewed product (e.g. phone → phone accessories).
 */

/** Fold AZ text for keyword matching (mirrors catalog search folding). */
export function foldCompanionText(value: string): string {
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
    .replaceAll('ç', 'c');
}

/** Keywords are matched against foldCompanionText() output (ç→c, ş→s, …). */
const ACCESSORY_KEYWORDS = [
  'aksesuar',
  'accessory',
  'cexol',
  'case',
  'cover',
  'kabel',
  'cable',
  'adapter',
  'qulaqliq',
  'qulaqciq',
  'earbud',
  'earphone',
  'headphone',
  'airpods',
  'powerbank',
  'sarj',
  'charger',
  'suse',
  'glass',
  'protector',
  'qoruyucu',
  'stand',
  'dock',
  'mouse',
  'sican',
  'klaviatura',
  'keyboard',
  'canta',
  'bag',
  'stylus',
  'pencil',
  'holder',
  'mount',
  'hub',
  'dongle',
  'memory card',
  'yaddas kart',
  'sim kart',
  'sims kart',
] as const;

/** Primary devices — shown under "Bənzər məhsullar", not as companions. */
const PRIMARY_DEVICE_KEYWORDS = [
  'iphone',
  'ipad',
  'macbook',
  'galaxy',
  'smartfon',
  'telefon',
  'phone',
  'noutbuk',
  'laptop',
  'notebook',
  'monitor',
  'televizor',
  'television',
  'printer',
  'kamera',
  'camera',
  'router',
  'kommutator',
  'switch',
  'server',
  'soyuducu',
  'paltaryuyan',
  'kondisioner',
] as const;

export type CompanionCandidate = {
  id: string;
  name: string;
  brandId: string | null;
  createdAt: Date;
  category: { name: string; slug: string };
  /** Cheapest active variant price, if any. */
  price: number | null;
};

export function isAccessoryCompanionCandidate(candidate: {
  name: string;
  category: { name: string; slug: string };
}): boolean {
  const haystack = foldCompanionText(
    `${candidate.name} ${candidate.category.name} ${candidate.category.slug}`,
  );

  if (ACCESSORY_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return true;
  }

  // Category named/slugged as accessories (e.g. "Aksesuarlar") without device words.
  const categoryHaystack = foldCompanionText(
    `${candidate.category.name} ${candidate.category.slug}`,
  );
  if (
    categoryHaystack.includes('aksesuar') &&
    !PRIMARY_DEVICE_KEYWORDS.some((keyword) => categoryHaystack.includes(keyword))
  ) {
    return true;
  }

  return false;
}

export function isPrimaryDeviceCandidate(candidate: {
  name: string;
  category: { name: string; slug: string };
}): boolean {
  const nameHaystack = foldCompanionText(candidate.name);
  return PRIMARY_DEVICE_KEYWORDS.some((keyword) => nameHaystack.includes(keyword));
}

/**
 * Keep only accessory-like products from the same category family.
 * Other primary devices (phones, laptops, …) are excluded unless their
 * name also matches an accessory keyword (e.g. "iPhone çexol").
 */
export function selectCompanionCandidates(
  candidates: CompanionCandidate[],
  source: { id: string; brandId: string | null },
  limit: number,
): CompanionCandidate[] {
  const accessories = candidates.filter(
    (candidate) =>
      candidate.id !== source.id && isAccessoryCompanionCandidate(candidate),
  );

  return accessories
    .sort((left, right) => {
      const leftSameBrand = left.brandId !== null && left.brandId === source.brandId ? 0 : 1;
      const rightSameBrand =
        right.brandId !== null && right.brandId === source.brandId ? 0 : 1;
      if (leftSameBrand !== rightSameBrand) {
        return leftSameBrand - rightSameBrand;
      }
      const leftPrice = left.price ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.price ?? Number.POSITIVE_INFINITY;
      return (
        leftPrice - rightPrice ||
        right.createdAt.getTime() - left.createdAt.getTime()
      );
    })
    .slice(0, limit);
}
