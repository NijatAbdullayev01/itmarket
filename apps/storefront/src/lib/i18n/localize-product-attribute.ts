import type { Locale } from "./locales";
import type { StorefrontMessages } from "./messages";

const COLOR_KEYS = new Set(
  ["rəng", "reng", "color", "renk"].map((label) =>
    label.toLocaleLowerCase("az"),
  ),
);

/** Catalog color names stored in Azerbaijani → localized display labels. */
const CATALOG_COLOR_LABELS: Record<
  string,
  Partial<Record<Exclude<Locale, "az">, string>>
> = {
  Ağ: { en: "White", ru: "Белый" },
  Bej: { en: "Beige", ru: "Бежевый" },
  Bənövşəyi: { en: "Purple", ru: "Фиолетовый" },
  Boz: { en: "Gray", ru: "Серый" },
  Çəhrayı: { en: "Pink", ru: "Розовый" },
  "Dərin bənövşəyi": { en: "Deep Purple", ru: "Тёмно-фиолетовый" },
  Gümüşü: { en: "Silver", ru: "Серебристый" },
  "Kosmik narıncı": { en: "Cosmic Orange", ru: "Космический оранжевый" },
  Mavi: { en: "Blue", ru: "Синий" },
  Narıncı: { en: "Orange", ru: "Оранжевый" },
  Qara: { en: "Black", ru: "Чёрный" },
  Qırmızı: { en: "Red", ru: "Красный" },
  Qızılı: { en: "Gold", ru: "Золотой" },
  Sarı: { en: "Yellow", ru: "Жёлтый" },
  "Space Gray": { en: "Space Gray", ru: "Space Gray" },
  Titan: { en: "Titanium", ru: "Титан" },
  "Titan Ağ": { en: "White Titanium", ru: "Белый титан" },
  "Titan Bənövşəyi": { en: "Purple Titanium", ru: "Фиолетовый титан" },
  "Titan Gümüşü": { en: "Natural Titanium", ru: "Натуральный титан" },
  "Titan Mavi": { en: "Blue Titanium", ru: "Синий титан" },
  "Titan Qara": { en: "Black Titanium", ru: "Чёрный титан" },
  "Tünd mavi": { en: "Deep Blue", ru: "Тёмно-синий" },
  Ultramarin: { en: "Ultramarine", ru: "Ультрамарин" },
  "Ultramarin mavi": { en: "Ultramarine Blue", ru: "Ультрамариновый синий" },
  Yaşıl: { en: "Green", ru: "Зелёный" },
};

function normalizeKey(label: string): string {
  return label.trim().toLocaleLowerCase("az");
}

function findCatalogColorKey(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  for (const key of Object.keys(CATALOG_COLOR_LABELS)) {
    if (
      key.localeCompare(trimmed, "az", { sensitivity: "base" }) === 0
    ) {
      return key;
    }
  }

  return null;
}

export function localizeCatalogColor(
  value: string,
  locale: Locale,
): string {
  if (locale === "az") {
    return value;
  }

  const key = findCatalogColorKey(value);
  if (key === null) {
    return value;
  }

  return CATALOG_COLOR_LABELS[key]?.[locale] ?? value;
}

export function localizeProductAttributeLabel(
  label: string,
  messages: StorefrontMessages,
): string {
  const map = messages.product.attributeLabels;
  const normalized = normalizeKey(label);
  for (const [source, translated] of Object.entries(map)) {
    if (normalizeKey(source) === normalized) {
      return translated;
    }
  }
  return label;
}

export function isColorAttributeLabel(label: string): boolean {
  return COLOR_KEYS.has(normalizeKey(label));
}

export function localizeProductAttributeValue(
  label: string,
  value: string,
  locale: Locale,
): string {
  if (isColorAttributeLabel(label)) {
    return localizeCatalogColor(value, locale);
  }
  return value;
}

export function localizeProductSpecEntries(
  entries: ReadonlyArray<readonly [string, string]>,
  locale: Locale,
  messages: StorefrontMessages,
): Array<[string, string]> {
  return entries.map(([label, value]) => {
    const localizedLabel = localizeProductAttributeLabel(label, messages);
    const localizedValue = localizeProductAttributeValue(
      label,
      value,
      locale,
    );
    return [localizedLabel, localizedValue];
  });
}
