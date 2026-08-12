/**
 * Rəng / Daimi yaddaş / Müvəqqəti yaddaş SKU variantları yalnız
 * telefon və planşet kateqoriyaları üçündür (aksesuarlar daxil deyil).
 */

export const SMARTPHONES_ACCESSORIES_ROOT_SLUG = "smartfonlar";

export type PhoneTabletVariantCategoryInput = {
  slug: string;
  name?: string | null;
  /** Alt kateqoriyada məhsul olanda əsas (parent) slug. */
  parentSlug?: string | null;
  /** Ağacın kök slug-u məlumdursa (parent-dən yuxarı). */
  rootSlug?: string | null;
};

function foldCategoryText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("az")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("ə", "e")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c");
}

const PHONE_TABLET_PATTERNS = [
  "smartfon",
  "telefon",
  "iphone",
  "phone",
  "mobil",
  "planset",
  "tablet",
  "ipad",
] as const;

/** Aksesuar — telefon/planşet variantlarından istisna. */
const ACCESSORY_ONLY_PATTERNS = [
  "aksesuar",
  "accessory",
  "cexol",
  "case",
  "cover",
  "kabel",
  "cable",
  "adapter",
  "qulaqliq",
  "earbud",
  "earphone",
  "headphone",
  "airpods",
  "powerbank",
  "sarj",
  "charger",
  "protector",
  "qoruyucu",
] as const;

function categoryHaystack(input: PhoneTabletVariantCategoryInput) {
  return foldCategoryText(`${input.name ?? ""} ${input.slug}`);
}

function slugEqualsSmartphonesRoot(slug: string | null | undefined) {
  return foldCategoryText(slug ?? "") === SMARTPHONES_ACCESSORIES_ROOT_SLUG;
}

/** Əsas kateqoriya «Smartfonlar və aksesuarlar» ağacındadır. */
export function isSmartphonesAccessoriesCategoryFamily(
  input: PhoneTabletVariantCategoryInput,
) {
  if (slugEqualsSmartphonesRoot(input.slug)) {
    return true;
  }
  if (slugEqualsSmartphonesRoot(input.parentSlug)) {
    return true;
  }
  if (slugEqualsSmartphonesRoot(input.rootSlug)) {
    return true;
  }
  return categoryHaystack(input).includes("smartfon");
}

function looksLikePhoneOrTabletCategory(input: PhoneTabletVariantCategoryInput) {
  const haystack = categoryHaystack(input);
  if (haystack === "") {
    return false;
  }

  const isAccessoryOnly =
    ACCESSORY_ONLY_PATTERNS.some((pattern) => haystack.includes(pattern)) &&
    !PHONE_TABLET_PATTERNS.some((pattern) => haystack.includes(pattern));

  if (isAccessoryOnly) {
    return false;
  }

  return PHONE_TABLET_PATTERNS.some((pattern) => haystack.includes(pattern));
}

/**
 * Rəng / daimi yaddaş / müvəqqəti yaddaş variant atributları aktiv olsun?
 * Yalnız telefon və planşet kateqoriyaları (aksesuarlar yox).
 * Nümunə: Smartfonlar, Planşetlər, Apple → iPhone / iPad.
 */
export function supportsPhoneTabletVariantAttributes(
  input: PhoneTabletVariantCategoryInput,
) {
  return looksLikePhoneOrTabletCategory(input);
}
