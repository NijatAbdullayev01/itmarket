import {
  CATALOG_DESCRIPTION_FRAGMENTS,
  CATALOG_DESCRIPTION_PHRASES,
  CATALOG_PRODUCT_TYPE_NOUNS,
} from "./catalog-description-phrases";
import {
  EXTRA_AZ_FRAGMENTS,
  EXTRA_DESCRIPTION_PHRASES,
  EXTRA_PRODUCT_TYPE_NOUNS,
} from "./catalog-az-lexicon";
import {
  localizeAzCatalogText,
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
  lookupExactCatalogValue,
} from "./localize-product-attribute";
import type { Locale } from "./locales";
import type { StorefrontMessages } from "./messages";

function foldAz(text: string): string {
  return text
    .trim()
    .replace(/\u0130/g, "i")
    .replace(/i\u0307/gi, "i")
    .toLowerCase()
    .replace(/i\u0307/g, "i")
    .normalize("NFC");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function azBoundaryPattern(phrase: string): RegExp {
  const escaped = escapeRegExp(phrase).replace(/\\\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");
}

const SORTED_PHRASES = Object.entries({
  ...CATALOG_DESCRIPTION_PHRASES,
  ...EXTRA_DESCRIPTION_PHRASES,
}).sort((left, right) => right[0].length - left[0].length);

const SORTED_FRAGMENTS = [...CATALOG_DESCRIPTION_FRAGMENTS, ...EXTRA_AZ_FRAGMENTS].sort(
  (left, right) => right[0].length - left[0].length,
);

const SORTED_TYPE_NOUNS = Object.entries({
  ...CATALOG_PRODUCT_TYPE_NOUNS,
  ...EXTRA_PRODUCT_TYPE_NOUNS,
}).sort((left, right) => right[0].length - left[0].length);

function applyPhraseMap(
  text: string,
  locale: Exclude<Locale, "az">,
): string {
  let result = text;
  for (const [az, translated] of SORTED_PHRASES) {
    result = result.replace(azBoundaryPattern(az), translated[locale]);
  }
  return result;
}

function applyFragments(
  text: string,
  locale: Exclude<Locale, "az">,
): string {
  let result = text;
  for (const [az, en, ru] of SORTED_FRAGMENTS) {
    result = result.replace(azBoundaryPattern(az), locale === "en" ? en : ru);
  }
  return result;
}

function applyBrandTemplates(
  text: string,
  locale: Exclude<Locale, "az">,
): string {
  let result = text;

  result = result.replace(
    /\s*[—–]\s*([^.\n]{1,48}?)\s+tərəfindən istehsal olunmuş etibarlı və yüksək keyfiyyətli texnoloji məhsuldur\.?/giu,
    (_match, brand: string) =>
      locale === "en"
        ? ` is a reliable, high-quality technology product manufactured by ${brand.trim()}.`
        : ` — надёжный высококачественный технологический продукт производства ${brand.trim()}.`,
  );

  result = result.replace(
    /\s*[—–]\s*([^.\n]{1,48}?)\s+brendinin ən yüksək standartlara cavab verən, etibarlı və davamlı məhsuludur\.?/giu,
    (_match, brand: string) =>
      locale === "en"
        ? ` is a reliable, durable product from the ${brand.trim()} brand that meets the highest standards.`
        : ` — надёжный и долговечный продукт бренда ${brand.trim()}, соответствующий самым высоким стандартам.`,
  );

  result = result.replace(
    /\s*[—–]\s*([^.\n]{1,48}?)\s+tərəfindən hazırlanmış yüksək etibarlı və peşəkar rabitə avadanlığıdır\.?/giu,
    (_match, brand: string) =>
      locale === "en"
        ? ` is highly reliable professional communications equipment made by ${brand.trim()}.`
        : ` — высоконадёжное профессиональное оборудование связи производства ${brand.trim()}.`,
  );

  result = result.replace(
    /Orijinal\s+([^\n.;:]{1,40}?)\s+modelidir;\s+rəsmi(?:\s+(\d+)\s+il)?\s+zəmanət və çatdırılma ilə(?: təqdim olunur)?\.?/giu,
    (_match, brand: string, years: string | undefined) => {
      const name = brand.trim();
      if (locale === "en") {
        return years
          ? `It is an original ${name} model; offered with official ${years}-year warranty and delivery.`
          : `It is an original ${name} model; offered with official warranty and delivery.`;
      }
      return years
        ? `Это оригинальная модель ${name}; предлагается с официальной гарантией ${years} лет и доставкой.`
        : `Это оригинальная модель ${name}; предлагается с официальной гарантией и доставкой.`;
    },
  );

  result = result.replace(
    /orijinal\s+([^\n.;:]{1,40}?)\s+([\p{L}][\p{L}\d.+]*)(?:dır|dir|dur|dür)\b/giu,
    (match, brand: string, stem: string) => {
      const noun = lookupTypeNoun(stem);
      if (noun === null) {
        return match;
      }
      const name = brand.trim();
      return locale === "en"
        ? `is an original ${name} ${noun.en}`
        : `оригинальный ${name} ${noun.ru}`;
    },
  );

  result = result.replace(
    /([^\n.]{2,80}?)\s+(\S+)\s+kataloqunda\s+([^\n.]{3,80}?)\s+kimi təqdim olunur\.?/giu,
    (_match, prefix: string, brand: string, productType: string) => {
      const type = localizeProseRemainder(productType.trim(), locale);
      if (locale === "en") {
        return `${prefix.trim()} is presented in the ${brand.trim()} catalog as ${type}.`;
      }
      return `${prefix.trim()} в каталоге ${brand.trim()} представлен как ${type}.`;
    },
  );

  result = result.replace(
    /rəsmi\s+(\d+)\s+il zəmanət və çatdırılma ilə(?: təqdim olunur)?\.?/giu,
    (_match, years: string) =>
      locale === "en"
        ? `offered with official ${years}-year warranty and delivery.`
        : `предлагается с официальной гарантией ${years} лет и доставкой.`,
  );

  result = result.replace(
    /(\d+)\s+il\s+on-site\s+zəmanət\s+və\s+çatdırılma\s+ilə(?: təqdim olunur)?\.?/giu,
    (_match, years: string) =>
      locale === "en"
        ? `with ${years}-year on-site warranty and delivery.`
        : `с ${years}-летней гарантией on-site и доставкой.`,
  );

  result = result.replace(
    /([^.!?\n]{2,70}?)\s+ilə\s+orijinal\s+([^.!?\n]{1,40}?)\s+modelidir\.?/giu,
    (_match, features: string, name: string) =>
      locale === "en"
        ? `is an original ${name.trim()} model with ${features.trim()}`
        : `оригинальная модель ${name.trim()} с ${features.trim()}`,
  );

  result = result.replace(
    /([^.\n]{1,48}?)\s+modelini\s+IT Market-dən\s+ən sərfəli qiymət və rəsmi zəmanətlə əldə edin\.?/giu,
    (_match, model: string) =>
      locale === "en"
        ? `Get the ${model.trim()} from IT Market at the best price and with official warranty.`
        : `Приобретите ${model.trim()} в IT Market по самой выгодной цене и с официальной гарантией.`,
  );

  result = result.replace(
    /Orijinal\s+([^\s.;:]+)\s+avadanlıqları\s+və\s+operativ\s+çatdırılma\.?/giu,
    (_match, brand: string) =>
      locale === "en"
        ? `Original ${brand.trim()} equipment and fast delivery.`
        : `Оригинальное оборудование ${brand.trim()} и оперативная доставка.`,
  );

  result = result.replace(
    /orijinal\s+([^\n.;:,]{1,48}?)\s*,\s+rəsmi(?:\s+\d+\s+(?:il|ay))?\s+zəmanət(?:lə)?(?:\s+və\s+çatdırılma)?\.?/giu,
    (match, product: string) => {
      const hasDelivery = /\s+və\s+çatdırılma/i.test(match);
      return locale === "en"
        ? `Original ${product.trim()}, with official warranty${hasDelivery ? " and delivery" : ""}.`
        : `Оригинальный ${product.trim()}, с официальной гарантией${hasDelivery ? " и доставкой" : ""}.`;
    },
  );

  return result;
}

function applyCopulaNouns(
  text: string,
  locale: Exclude<Locale, "az">,
): string {
  let result = text;

  result = result.replace(
    /([\p{L}][\p{L}\d.+]*(?:[ /-][\p{L}\d.+]+){0,3}?)-(?:dır|dir|dur|dür)\b/giu,
    (match, stem: string) => {
      const noun = lookupTypeNoun(stem);
      if (noun === null) {
        return stem;
      }
      return locale === "en" ? `is a ${noun.en}` : `является ${noun.ru}`;
    },
  );

  result = result.replace(
    /([\p{L}][\p{L}\d.+]*(?:[ /-][\p{L}\d.+]+){0,3}?)(?:dır|dir|dur|dür)\b/giu,
    (match, stem: string) => {
      const noun = lookupTypeNoun(stem);
      if (noun === null) {
        return match;
      }
      return locale === "en" ? `is a ${noun.en}` : `является ${noun.ru}`;
    },
  );

  return result;
}

function lookupTypeNoun(stem: string): { en: string; ru: string } | null {
  const folded = foldAz(stem);
  for (const [az, translated] of SORTED_TYPE_NOUNS) {
    if (foldAz(az) === folded) {
      return translated;
    }
  }
  const parts = stem.trim().split(/[\s/-]+/);
  if (parts.length >= 2) {
    const lastTwo = parts.slice(-2).join(" ");
    const twoFolded = foldAz(lastTwo);
    for (const [az, translated] of SORTED_TYPE_NOUNS) {
      if (foldAz(az) === twoFolded) {
        return translated;
      }
    }
  }
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last) {
      return lookupTypeNoun(last);
    }
  }
  return null;
}

function localizeProseRemainder(
  text: string,
  locale: Exclude<Locale, "az">,
): string {
  let result = applyCopulaNouns(text, locale);
  result = applyFragments(result, locale);
  result = localizeAzCatalogText(result, locale);
  return result.replace(/\s{2,}/g, " ").trim();
}

const SPEC_LINE_RE = /^((?:•\s*|[-*]\s*))?([^:\n]{1,48}):\s+(.+)$/u;

function looksLikeSpecLabel(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > 48) {
    return false;
  }
  if (/[—–]/.test(trimmed) || /\.\s/.test(trimmed)) {
    return false;
  }
  return true;
}

function localizeDescriptionValue(
  label: string,
  value: string,
  locale: Exclude<Locale, "az">,
): string {
  const exact = lookupExactCatalogValue(value, locale);
  if (exact !== null) {
    return exact;
  }
  let result = applyPhraseMap(value, locale);
  result = applyCopulaNouns(result, locale);
  result = applyFragments(result, locale);
  result = localizeProductAttributeValue(label, result, locale);
  result = localizeAzCatalogText(result, locale);
  return result.replace(/\s{2,}/g, " ").trim();
}

function localizeSpecLine(
  line: string,
  locale: Exclude<Locale, "az">,
  messages: StorefrontMessages,
): string | null {
  const match = line.match(SPEC_LINE_RE);
  if (match === null) {
    return null;
  }
  const label = match[2]?.trim() ?? "";
  const value = match[3]?.trim() ?? "";
  if (!looksLikeSpecLabel(label)) {
    return null;
  }
  const bullet = match[1] ?? "";
  let localizedLabel = localizeProductAttributeLabel(label, messages);
  if (/[əöğşüçıƏÖĞŞÜÇİ]/.test(localizedLabel)) {
    localizedLabel = applyFragments(localizedLabel, locale);
  }
  const localizedValue = localizeDescriptionValue(label, value, locale);
  return `${bullet}${localizedLabel}: ${localizedValue}`;
}

function localizeInlineSpecs(
  paragraph: string,
  locale: Exclude<Locale, "az">,
  messages: StorefrontMessages,
): string {
  return paragraph.replace(
    /(^|(?<=\.\s))([^.\n:]{1,40}):\s+([^.\n]+)\.?/gu,
    (full, prefix: string, label: string, value: string) => {
      if (!looksLikeSpecLabel(label)) {
        return full;
      }
      const localizedLabel = localizeProductAttributeLabel(label.trim(), messages);
      if (localizedLabel === label.trim() && /[əöğüşçı]/i.test(label) === false) {
        return full;
      }
      const localizedValue = localizeDescriptionValue(
        label.trim(),
        value.trim(),
        locale,
      );
      const ending = full.endsWith(".") ? "." : "";
      return `${prefix}${localizedLabel}: ${localizedValue}${ending}`;
    },
  );
}

/** "10 q SFP+" / "2.4 q" in catalog copy is gigabit/GHz, not grams. */
function restoreGigabitQTypo(text: string): string {
  return text
    .replace(/(\d+)\s*q\s+(SFP|Ethernet|FC|Fibre|Fiber)\b/gi, "$1G $2")
    .replace(/(\d+(?:\.\d+)?)\s*q(?=\s*\/|\s+Bluetooth)/gi, "$1G");
}

function isSpecShapedLine(
  line: string,
  messages: StorefrontMessages,
): boolean {
  const match = line.match(SPEC_LINE_RE);
  if (match === null) {
    return false;
  }
  const label = match[2]?.trim() ?? "";
  if (!looksLikeSpecLabel(label)) {
    return false;
  }
  if (/^[•\-*]/.test(line.trim())) {
    return true;
  }
  const localized = localizeProductAttributeLabel(label, messages);
  if (localized !== label) {
    return true;
  }
  return label.split(/\s+/).length <= 5 && !/[—–]/.test(label);
}

function localizeParagraph(
  paragraph: string,
  locale: Exclude<Locale, "az">,
  messages: StorefrontMessages,
): string {
  if (isSpecShapedLine(paragraph, messages)) {
    return localizeSpecLine(paragraph, locale, messages) ?? paragraph;
  }

  let result = applyBrandTemplates(paragraph, locale);
  result = applyPhraseMap(result, locale);
  result = localizeInlineSpecs(result, locale, messages);
  result = localizeProseRemainder(result, locale);
  return restoreGigabitQTypo(result);
}

/**
 * Localize stored Azerbaijani product descriptions for storefront locale.
 * Reuses catalog spec dictionaries for `Label: value` lines.
 */
export function localizeProductDescription(
  description: string | null | undefined,
  locale: Locale,
  messages: StorefrontMessages,
): string {
  if (description == null) {
    return "";
  }
  const source = restoreGigabitQTypo(description);
  if (locale === "az" || source.trim() === "") {
    return source;
  }

  return source
    .split("\n")
    .map((line) => {
      if (line.trim() === "") {
        return line;
      }
      return localizeParagraph(line, locale, messages);
    })
    .join("\n");
}
