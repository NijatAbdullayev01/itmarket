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

export type CatalogPriceRangeCopy = {
  min: string;
  max: string;
  apply: string;
};

export const defaultCatalogPriceRangeCopy: CatalogPriceRangeCopy = {
  min: "Min",
  max: "Max",
  apply: "T\u0259tbiq et",
};

type CatalogPriceRangeProps = {
  base: CatalogHrefFilters;
  boundMin?: number;
  boundMax?: number;
  copy?: Partial<CatalogPriceRangeCopy>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePriceInput(value: string): number | null {
  const normalized = value
    .replace(/\s/g, "")
    .replaceAll("\u20BC", "")
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
  copy: copyProp,
}: CatalogPriceRangeProps) {
  const copy = { ...defaultCatalogPriceRangeCopy, ...copyProp };
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
    // Prefer current field text so Apply works even if blur hasn't committed yet.
    const parsedMin = parsePriceInput(minText);
    const parsedMax = parsePriceInput(maxText);
    let nextMinValue = parsedMin ?? minValue;
    let nextMaxValue = parsedMax ?? maxValue;
    nextMinValue = clamp(Math.min(nextMinValue, nextMaxValue), floor, ceiling);
    nextMaxValue = clamp(Math.max(nextMaxValue, nextMinValue), floor, ceiling);
    setMinValue(nextMinValue);
    setMaxValue(nextMaxValue);
    setMinText(formatPriceAmount(nextMinValue));
    setMaxText(formatPriceAmount(nextMaxValue));

    const nextMin =
      nextMinValue <= floor ? undefined : Math.round(nextMinValue);
    const nextMax =
      nextMaxValue >= ceiling ? undefined : Math.round(nextMaxValue);
    router.push(
      buildCatalogHref({
        ...base,
        minPrice: nextMin,
        maxPrice: nextMax,
        page: undefined,
      }),
    );
  }

  return (
    <div className="ui-price-range">
      <div className="ui-price-range__inputs">
        <label className="ui-price-range__field">
          <span className="ui-price-range__field-label">{copy.min}</span>
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
            aria-label={`Minimum qiym\u0259t`}
          />
          <span className="ui-price-range__currency" aria-hidden="true">
            {"\u20BC"}
          </span>
        </label>
        <span className="ui-price-range__separator" aria-hidden="true">
          {"\u2013"}
        </span>
        <label className="ui-price-range__field">
          <span className="ui-price-range__field-label">{copy.max}</span>
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
            aria-label={`Maksimum qiym\u0259t`}
          />
          <span className="ui-price-range__currency" aria-hidden="true">
            {"\u20BC"}
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
          aria-label={`Minimum qiym\u0259t s\u00FCr\u00FC\u015Fd\u00FCr\u00FCc\u00FCs\u00FC`}
        />
        <input
          className="ui-price-range__thumb ui-price-range__thumb--max"
          type="range"
          min={floor}
          max={ceiling}
          step={PRICE_STEP}
          value={maxValue}
          onChange={(event) => commitMax(Number(event.target.value))}
          aria-label={`Maksimum qiym\u0259t s\u00FCr\u00FC\u015Fd\u00FCr\u00FCc\u00FCs\u00FC`}
        />
      </div>

      <button
        type="button"
        className="ui-price-range__apply"
        onClick={applyPrice}
      >
        {copy.apply}
      </button>
    </div>
  );
}
