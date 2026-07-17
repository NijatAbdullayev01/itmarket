"use client";

import {
  DEFAULT_COUNTRY_ISO2,
  getCountryCallingCode,
  isoToFlagEmoji,
  PHONE_COUNTRY_OPTIONS,
} from "../data/country-calling-codes";
import {
  formatInternationalPhone,
  getLocalPhoneMaxDigits,
  isCompleteInternationalPhone,
  normalizeLocalPhoneNumber,
  parseInternationalPhone,
} from "../utils/international-phone";

type PhoneNumberFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: "tel" | "tel-national";
};

export function PhoneNumberField({
  id,
  label,
  value,
  onChange,
  required = false,
  autoComplete = "tel-national",
}: PhoneNumberFieldProps) {
  const parsedPhone = parseInternationalPhone(value);
  const supportedCountries = PHONE_COUNTRY_OPTIONS;
  const selectedCountry = supportedCountries.some(
    (country) => country.iso2 === parsedPhone.countryIso2,
  )
    ? parsedPhone.countryIso2
    : DEFAULT_COUNTRY_ISO2;
  const localNumber = normalizeLocalPhoneNumber(
    parsedPhone.localNumber,
    selectedCountry,
  );
  const selectedCountryOption = getCountryCallingCode(selectedCountry);
  const hasCountrySelect = supportedCountries.length > 1;
  const isComplete = isCompleteInternationalPhone(
    selectedCountry,
    localNumber,
  );
  const countrySelectId = `${id}-country`;

  const handleCountryChange = (countryIso2: string) => {
    onChange(formatInternationalPhone(countryIso2, localNumber));
  };

  const maxLocalDigits = getLocalPhoneMaxDigits(selectedCountry);

  const handleLocalNumberChange = (nextLocalNumber: string) => {
    const limitedLocalNumber = normalizeLocalPhoneNumber(
      nextLocalNumber,
      selectedCountry,
    );
    onChange(formatInternationalPhone(selectedCountry, limitedLocalNumber));
  };

  return (
    <div
      className={
        isComplete ? "ui-field ui-field--success" : "ui-field"
      }
    >
      <label htmlFor={id}>
        {label}{" "}
        {required ? (
          <span className="ui-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div className="ui-phone-field">
        {hasCountrySelect ? (
          <>
            <label className="ui-visually-hidden" htmlFor={countrySelectId}>
              Ölkə kodu
            </label>
            <select
              id={countrySelectId}
              className="ui-phone-field__country"
              value={selectedCountry}
              onChange={(event) =>
                handleCountryChange(event.currentTarget.value)
              }
              aria-label="Ölkə kodu"
            >
              {supportedCountries.map((country) => (
                <option key={country.iso2} value={country.iso2}>
                  {isoToFlagEmoji(country.iso2)} +{country.dialCode}
                </option>
              ))}
            </select>
          </>
        ) : (
          <span
            className="ui-phone-field__prefix"
            aria-label={`Ölkə kodu: +${selectedCountryOption.dialCode}`}
          >
            +{selectedCountryOption.dialCode}
          </span>
        )}
        <input
          id={id}
          className="ui-phone-field__input"
          type="tel"
          value={localNumber}
          onChange={(event) =>
            handleLocalNumberChange(event.currentTarget.value)
          }
          placeholder="50 123 45 67"
          autoComplete={autoComplete}
          inputMode="numeric"
          maxLength={maxLocalDigits}
          required={required}
          aria-invalid={localNumber.trim() !== "" && !isComplete}
        />
      </div>
    </div>
  );
}

export { DEFAULT_COUNTRY_ISO2 };
