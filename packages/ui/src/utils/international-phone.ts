import {
  COUNTRY_CALLING_CODES,
  DEFAULT_COUNTRY_ISO2,
  getCountryCallingCode,
} from "../data/country-calling-codes";

export function normalizePhoneInput(value: string) {
  return value.replace(/[\s()-]/g, "");
}

const countriesByDialCodeLength = [...COUNTRY_CALLING_CODES].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
);

export function getLocalPhoneMaxDigits(countryIso2: string) {
  return countryIso2 === "AZ" ? 9 : 12;
}

export function normalizeLocalPhoneNumber(
  value: string,
  countryIso2: string = DEFAULT_COUNTRY_ISO2,
) {
  const digits = value.replace(/\D/g, "");
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  return withoutLeadingZero.slice(0, getLocalPhoneMaxDigits(countryIso2));
}

export function formatInternationalPhone(
  countryIso2: string,
  localNumber: string,
) {
  const country = getCountryCallingCode(countryIso2);
  const normalizedLocal = normalizeLocalPhoneNumber(localNumber, countryIso2);
  if (normalizedLocal === "") return "";

  return `+${country.dialCode}${normalizedLocal}`;
}

export function parseInternationalPhone(value: string) {
  const normalized = normalizePhoneInput(value.trim());
  if (normalized === "") {
    return {
      countryIso2: DEFAULT_COUNTRY_ISO2,
      localNumber: "",
    };
  }

  const digits = normalized.startsWith("+")
    ? normalized.slice(1)
    : normalized.startsWith("00")
      ? normalized.slice(2)
      : normalized;

  for (const country of countriesByDialCodeLength) {
    if (digits.startsWith(country.dialCode)) {
      return {
        countryIso2: country.iso2,
        localNumber: digits.slice(country.dialCode.length),
      };
    }
  }

  return {
    countryIso2: DEFAULT_COUNTRY_ISO2,
    localNumber: digits,
  };
}

export function isCompleteInternationalPhone(
  countryIso2: string,
  localNumber: string,
) {
  const formatted = formatInternationalPhone(countryIso2, localNumber);
  if (formatted.length < 8 || formatted.length > 16) return false;

  const country = getCountryCallingCode(countryIso2);
  const normalizedLocal = normalizeLocalPhoneNumber(localNumber, countryIso2);
  if (normalizedLocal === "") return false;

  if (country.iso2 === "AZ") {
    return normalizedLocal.length === 9;
  }

  return (
    normalizedLocal.length >= 4 &&
    normalizedLocal.length <= getLocalPhoneMaxDigits(countryIso2)
  );
}

export function isCompleteAzMobilePhone(value: string) {
  const parsed = parseInternationalPhone(value);
  return (
    parsed.countryIso2 === "AZ" &&
    isCompleteInternationalPhone(parsed.countryIso2, parsed.localNumber)
  );
}
