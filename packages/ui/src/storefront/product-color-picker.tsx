"use client";

import type { CSSProperties } from "react";

import type { ProductColorOption } from "../utils/product-color-options";

type ProductColorPickerProps = {
  colors: ProductColorOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
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

export function ProductColorPicker({
  colors,
  selectedValue,
  onSelect,
}: ProductColorPickerProps) {
  const selected =
    colors.find((color) => color.value === selectedValue) ?? colors[0];

  return (
    <div className="ui-product-purchase__colors">
      <div className="ui-product-color-picker__header">
        <span className="ui-product-color-picker__label">
          Rəng: {selected.label}
        </span>
      </div>
      <div
        className="ui-product-color-picker__swatches"
        role="radiogroup"
        aria-label="Rəng seçimi"
      >
        {colors.map((color) => {
          const isSelected = color.value === selectedValue;
          const isDisabled = color.available <= 0;

          return (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={color.label}
              title={
                isDisabled ? `${color.label} — stokda yoxdur` : color.label
              }
              disabled={isDisabled}
              className={
                isSelected
                  ? "ui-product-color-picker__swatch ui-product-color-picker__swatch--active"
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
