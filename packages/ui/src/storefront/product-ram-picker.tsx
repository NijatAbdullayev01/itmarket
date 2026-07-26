"use client";

import type { ProductRamOption } from "../utils/product-ram-options";

export type ProductRamPickerCopy = {
  label: string;
  groupAria: string;
  outOfStock: string;
};

export const defaultProductRamPickerCopy: ProductRamPickerCopy = {
  label: "M\u00FCv\u0259qq\u0259ti yadda\u015F:",
  groupAria: "M\u00FCv\u0259qq\u0259ti yadda\u015F se\u00E7imi",
  outOfStock: "{label} \u2014 stokda yoxdur",
};

type ProductRamPickerProps = {
  options: ProductRamOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  copy?: Partial<ProductRamPickerCopy>;
};

function formatCopy(template: string, label: string): string {
  return template.replaceAll("{label}", label);
}

export function ProductRamPicker({
  options,
  selectedValue,
  onSelect,
  copy: copyProp,
}: ProductRamPickerProps) {
  const copy = { ...defaultProductRamPickerCopy, ...copyProp };
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
          const isDisabled = option.available <= 0;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              title={
                isDisabled
                  ? formatCopy(copy.outOfStock, option.label)
                  : option.label
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
