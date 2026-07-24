"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import {
  buildCatalogHref,
  type CatalogHrefFilters,
} from "./catalog-search-header";

const DEFAULT_PRICE_MIN = 0;
const DEFAULT_PRICE_MAX = 5000;
const PRICE_STEP = 1;

type CatalogPriceRangeProps = {
  base: CatalogHrefFilters;
  boundMin?: number;
  boundMax?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePriceInput(value: string): number | null {
  const normalized = value
    .replace(/\s/g, "")
    .replaceAll("₼", "")
    .replaceAll(".", "")
    .replace(",", ".")
    .trim();
  if (normalized === "") return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/** Compact amount for narrow filter fields (no currency suffix). */
function formatPriceAmount(amount: number) {
  const absolute = Math.abs(amount);
  const [wholePart, fractionalPart = "00"] = absolute.toFixed(2).split(".");
  const groupedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (fractionalPart === "00") {
    return groupedWhole;
  }
  return `${groupedWhole},${fractionalPart}`;
}

export function CatalogPriceRange({
  base,
  boundMin = DEFAULT_PRICE_MIN,
  boundMax = DEFAULT_PRICE_MAX,
}: CatalogPriceRangeProps) {
  const router = useRouter();
  const floor = Math.min(boundMin, boundMax);
  const ceiling = Math.max(boundMin, boundMax, floor + PRICE_STEP);

  const appliedMin = base.minPrice ?? floor;
  const appliedMax = base.maxPrice ?? ceiling;

  const [minValue, setMinValue] = useState(appliedMin);
  const [maxValue, setMaxValue] = useState(appliedMax);
  const [minText, setMinText] = useState(formatPriceAmount(appliedMin));
  const [maxText, setMaxText] = useState(formatPriceAmount(appliedMax));

  useEffect(() => {
    setMinValue(appliedMin);
    setMaxValue(appliedMax);
    setMinText(formatPriceAmount(appliedMin));
    setMaxText(formatPriceAmount(appliedMax));
  }, [appliedMin, appliedMax]);

  const range = ceiling - floor || 1;
  const fromPercent = ((minValue - floor) / range) * 100;
  const toPercent = ((maxValue - floor) / range) * 100;

  function commitMin(next: number) {
    const clamped = clamp(Math.min(next, maxValue), floor, ceiling);
    setMinValue(clamped);
    setMinText(formatPriceAmount(clamped));
  }

  function commitMax(next: number) {
    const clamped = clamp(Math.max(next, minValue), floor, ceiling);
    setMaxValue(clamped);
    setMaxText(formatPriceAmount(clamped));
  }

  function applyPrice() {
    const nextMin = minValue <= floor ? undefined : Math.round(minValue);
    const nextMax = maxValue >= ceiling ? undefined : Math.round(maxValue);
    router.push(
      buildCatalogHref({
        ...base,
        minPrice: nextMin,
        maxPrice: nextMax,
      }),
    );
  }

  return (
    <div className="ui-price-range">
      <div className="ui-price-range__inputs">
        <label className="ui-price-range__field">
          <span className="ui-price-range__field-label">Min</span>
          <input
            className="ui-price-range__input"
            type="text"
            inputMode="decimal"
            value={minText}
            onChange={(event) => setMinText(event.target.value)}
            onBlur={() => {
              const parsed = parsePriceInput(minText);
              commitMin(parsed ?? appliedMin);
            }}
            aria-label="Minimum qiymət"
          />
          <span className="ui-price-range__currency" aria-hidden="true">
            ₼
          </span>
        </label>
        <span className="ui-price-range__separator" aria-hidden="true">
          –
        </span>
        <label className="ui-price-range__field">
          <span className="ui-price-range__field-label">Max</span>
          <input
            className="ui-price-range__input"
            type="text"
            inputMode="decimal"
            value={maxText}
            onChange={(event) => setMaxText(event.target.value)}
            onBlur={() => {
              const parsed = parsePriceInput(maxText);
              commitMax(parsed ?? appliedMax);
            }}
            aria-label="Maksimum qiymət"
          />
          <span className="ui-price-range__currency" aria-hidden="true">
            ₼
          </span>
        </label>
      </div>

      <div
        className="ui-price-range__slider"
        style={
          {
            "--price-from": `${fromPercent}%`,
            "--price-to": `${toPercent}%`,
          } as CSSProperties
        }
      >
        <div className="ui-price-range__track" aria-hidden="true" />
        <input
          className="ui-price-range__thumb ui-price-range__thumb--min"
          type="range"
          min={floor}
          max={ceiling}
          step={PRICE_STEP}
          value={minValue}
          onChange={(event) => commitMin(Number(event.target.value))}
          aria-label="Minimum qiymət sürüşdürücüsü"
        />
        <input
          className="ui-price-range__thumb ui-price-range__thumb--max"
          type="range"
          min={floor}
          max={ceiling}
          step={PRICE_STEP}
          value={maxValue}
          onChange={(event) => commitMax(Number(event.target.value))}
          aria-label="Maksimum qiymət sürüşdürücüsü"
        />
      </div>

      <button
        type="button"
        className="ui-price-range__apply"
        onClick={applyPrice}
      >
        Tətbiq et
      </button>
    </div>
  );
}
