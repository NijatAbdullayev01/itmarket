"use client";

import type { ProductStorageOption } from "../utils/product-storage-options";

export type ProductStoragePickerCopy = {
  label: string;
  groupAria: string;
  outOfStock: string;
  outOfStockForCombo: string;
};

export const defaultProductStoragePickerCopy: ProductStoragePickerCopy = {
  label: "Daimi yadda\u015F:",
  groupAria: "Daimi yadda\u015F se\u00E7imi",
  outOfStock: "{label} \u2014 stokda yoxdur",
  outOfStockForCombo:
    "{label} \u2014 bu r\u0259ngd\u0259 stokda yoxdur, uy\u011Fun variant se\u00E7il\u0259c\u0259k",
};

type ProductStoragePickerProps = {
  options: ProductStorageOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  matrixSelection?: boolean;
  copy?: Partial<ProductStoragePickerCopy>;
};

function formatCopy(template: string, label: string): string {
  return template.replaceAll("{label}", label);
}

export function ProductStoragePicker({
  options,
  selectedValue,
  onSelect,
  matrixSelection = false,
  copy: copyProp,
}: ProductStoragePickerProps) {
  const copy = { ...defaultProductStoragePickerCopy, ...copyProp };
  const selected =
    options.find((option) => option.value === selectedValue) ?? options[0];

  return (
    <div className="ui-product-purchase__storage">
      <div className="ui-product-storage-picker__header">
        <span className="ui-product-storage-picker__label">
          {copy.label} {selected.label}
        </span>
      </div>
      <div
        className="ui-product-storage-picker__options"
        role="radiogroup"
        aria-label={copy.groupAria}
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
                    ? formatCopy(copy.outOfStockForCombo, option.label)
                    : formatCopy(copy.outOfStock, option.label)
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
