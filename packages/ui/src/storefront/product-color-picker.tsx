"use client";

import type { CSSProperties } from "react";

import type { ProductColorOption } from "../utils/product-color-options";

export type ProductColorPickerCopy = {
  label: string;
  groupAria: string;
  outOfStock: string;
  outOfStockForCombo: string;
};

export const defaultProductColorPickerCopy: ProductColorPickerCopy = {
  label: "R\u0259ng:",
  groupAria: "R\u0259ng se\u00E7imi",
  outOfStock: "{label} \u2014 stokda yoxdur",
  outOfStockForCombo:
    "{label} \u2014 bu yadda\u015Fla stokda yoxdur, uy\u011Fun variant se\u00E7il\u0259c\u0259k",
};

type ProductColorPickerProps = {
  colors: ProductColorOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  /** When true, options stay clickable and other axes can adjust (storage × color matrix). */
  matrixSelection?: boolean;
  copy?: Partial<ProductColorPickerCopy>;
  /** Display-only transform; selection values stay unchanged. */
  formatLabel?: (label: string) => string;
};

function swatchStyle(hex: string | null, label: string): CSSProperties {
  if (hex) {
    return { backgroundColor: hex };
  }

  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = label.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 40) % 360} 70% 42%))`,
  };
}

function formatCopy(template: string, label: string): string {
  return template.replaceAll("{label}", label);
}

export function ProductColorPicker({
  colors,
  selectedValue,
  onSelect,
  matrixSelection = false,
  copy: copyProp,
  formatLabel = (label) => label,
}: ProductColorPickerProps) {
  const copy = { ...defaultProductColorPickerCopy, ...copyProp };
  const selected =
    colors.find((color) => color.value === selectedValue) ?? colors[0];
  if (selected === undefined) {
    return null;
  }
  const selectedDisplay = formatLabel(selected.label);

  return (
    <div className="ui-product-purchase__colors">
      <div className="ui-product-color-picker__header">
        <span className="ui-product-color-picker__label">
          {`${copy.label} ${selectedDisplay}`}
        </span>
      </div>
      <div
        className="ui-product-color-picker__swatches"
        role="radiogroup"
        aria-label={copy.groupAria}
      >
        {colors.map((color) => {
          const isSelected = color.value === selectedValue;
          const isUnavailableForCombo = color.available <= 0;
          const isDisabled = !matrixSelection && isUnavailableForCombo;
          const displayLabel = formatLabel(color.label);

          return (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={displayLabel}
              title={
                isUnavailableForCombo
                  ? matrixSelection
                    ? formatCopy(copy.outOfStockForCombo, displayLabel)
                    : formatCopy(copy.outOfStock, displayLabel)
                  : displayLabel
              }
              disabled={isDisabled}
              className={
                isSelected
                  ? "ui-product-color-picker__swatch ui-product-color-picker__swatch--active"
                  : isUnavailableForCombo && matrixSelection
                    ? "ui-product-color-picker__swatch ui-product-color-picker__swatch--muted"
                    : "ui-product-color-picker__swatch"
              }
              onClick={() => onSelect(color.value)}
            >
              <span
                className="ui-product-color-picker__swatch-fill"
                style={swatchStyle(color.hex, color.label)}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
