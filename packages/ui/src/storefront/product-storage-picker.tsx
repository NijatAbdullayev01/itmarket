"use client";

import type { ProductStorageOption } from "../utils/product-storage-options";

type ProductStoragePickerProps = {
  options: ProductStorageOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function ProductStoragePicker({
  options,
  selectedValue,
  onSelect,
}: ProductStoragePickerProps) {
  const selected =
    options.find((option) => option.value === selectedValue) ?? options[0];

  return (
    <div className="ui-product-purchase__storage">
      <div className="ui-product-storage-picker__header">
        <span className="ui-product-storage-picker__label">
          Yaddaş: {selected.label}
        </span>
      </div>
      <div
        className="ui-product-storage-picker__options"
        role="radiogroup"
        aria-label="Yaddaş seçimi"
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue;
          const isDisabled = option.available <= 0;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              title={
                isDisabled ? `${option.label} — stokda yoxdur` : option.label
              }
              disabled={isDisabled}
              className={
                isSelected
                  ? "ui-product-storage-picker__option ui-product-storage-picker__option--active"
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
