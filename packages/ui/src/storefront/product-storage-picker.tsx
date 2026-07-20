"use client";

import type { ProductStorageOption } from "../utils/product-storage-options";

type ProductStoragePickerProps = {
  options: ProductStorageOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  matrixSelection?: boolean;
};

export function ProductStoragePicker({
  options,
  selectedValue,
  onSelect,
  matrixSelection = false,
}: ProductStoragePickerProps) {
  const selected =
    options.find((option) => option.value === selectedValue) ?? options[0];

  return (
    <div className="ui-product-purchase__storage">
      <div className="ui-product-storage-picker__header">
        <span className="ui-product-storage-picker__label">
          Daimi yaddaş: {selected.label}
        </span>
      </div>
      <div
        className="ui-product-storage-picker__options"
        role="radiogroup"
        aria-label="Daimi yaddaş seçimi"
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue;
          const isUnavailableForCombo = option.available <= 0;
          const isDisabled = !matrixSelection && isUnavailableForCombo;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              title={
                isUnavailableForCombo
                  ? matrixSelection
                    ? `${option.label} — bu rəngdə stokda yoxdur, uyğun variant seçiləcək`
                    : `${option.label} — stokda yoxdur`
                  : option.label
              }
              disabled={isDisabled}
              className={
                isSelected
                  ? "ui-product-storage-picker__option ui-product-storage-picker__option--active"
                  : isUnavailableForCombo && matrixSelection
                    ? "ui-product-storage-picker__option ui-product-storage-picker__option--muted"
                    : "ui-product-storage-picker__option"
              }
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
