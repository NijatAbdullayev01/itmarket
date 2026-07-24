"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "./brand-mark";

type BrandBarProps = {
  brands: {
    id: string;
    name: string;
    slug: string;
    logoObjectKey?: string | null;
    logoScalePercent?: number | null;
    logoOffsetX?: number | null;
    logoOffsetY?: number | null;
  }[];
};

type BrandItem = BrandBarProps["brands"][number];

/** Matches `.ui-brand-bar__item` width (120px) + `--space-3` gap (12px). */
const BRAND_ITEM_PX = 120;
const BRAND_GAP_PX = 12;
const BRAND_STEP_PX = BRAND_ITEM_PX + BRAND_GAP_PX;
const STEP_INTERVAL_MS = 2600;
const SLIDE_DURATION_MS = 520;

function BrandLinks({ brands, keyPrefix }: { brands: BrandItem[]; keyPrefix: string }) {
  return brands.map((brand) => (
    <Link
      key={`${keyPrefix}-${brand.id}`}
      className="ui-brand-bar__item"
      href={`/?brand=${encodeURIComponent(brand.slug)}`}
      title={brand.name}
      tabIndex={keyPrefix === "duplicate" ? -1 : undefined}
    >
      <BrandMark
        name={brand.name}
        slug={brand.slug}
        logoObjectKey={brand.logoObjectKey}
        logoScalePercent={brand.logoScalePercent}
        logoOffsetX={brand.logoOffsetX}
        logoOffsetY={brand.logoOffsetY}
      />
    </Link>
  ));
}

function fitViewportWidth(availablePx: number) {
  const count = Math.max(1, Math.floor((availablePx + BRAND_GAP_PX) / BRAND_STEP_PX));
  return count * BRAND_STEP_PX - BRAND_GAP_PX;
}

export function BrandBar({ brands }: BrandBarProps) {
  const displayedBrands = brands.slice(0, 12);
  const count = displayedBrands.length;
  const barRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [instant, setInstant] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const styles = window.getComputedStyle(bar);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const available = bar.clientWidth - paddingLeft - paddingRight;
      setViewportWidth(fitViewportWidth(available));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    setStep(0);
    setInstant(false);
  }, [count]);

  useEffect(() => {
    if (count === 0 || paused || reduceMotion) return;

    const timer = window.setInterval(() => {
      setStep((current) => current + 1);
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count, paused, reduceMotion]);

  useEffect(() => {
    if (count === 0 || step < count) return;

    const timer = window.setTimeout(() => {
      setInstant(true);
      setStep(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setInstant(false));
      });
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [step, count]);

  if (count === 0) return null;

  return (
    <div
      ref={barRef}
      className="ui-brand-bar"
      aria-label="Brendlər"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="ui-brand-bar__viewport"
        style={viewportWidth != null ? { width: viewportWidth } : undefined}
      >
        <div
          className={[
            "ui-brand-bar__scroll",
            instant ? "ui-brand-bar__scroll--instant" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            reduceMotion
              ? undefined
              : { transform: `translate3d(-${step * BRAND_STEP_PX}px, 0, 0)` }
          }
        >
          <div className="ui-brand-bar__group">
            <BrandLinks brands={displayedBrands} keyPrefix="primary" />
          </div>
          {!reduceMotion ? (
            <div className="ui-brand-bar__group" aria-hidden="true">
              <BrandLinks brands={displayedBrands} keyPrefix="duplicate" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
