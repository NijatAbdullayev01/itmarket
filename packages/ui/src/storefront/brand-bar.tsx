"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

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

/** Desktop design token for `.ui-brand-bar__item` width. */
const BRAND_ITEM_TARGET_PX = 120;
/** Floor so desktop tiles stay recognizably the same card. */
const BRAND_ITEM_MIN_PX = 100;
const DESKTOP_GAP_PX = 12;
/** Mobile strip: exactly 5 visible tiles with a tighter rhythm. */
const MOBILE_VISIBLE_COUNT = 5;
const MOBILE_GAP_PX = 8;
/** Matches `@media (max-width: 639px)` brand-bar compact styles. */
const MOBILE_LAYOUT_MQ = "(max-width: 639px)";
const STEP_INTERVAL_MS = 2600;
const SLIDE_DURATION_MS = 520;

type BrandLayout = {
  itemWidth: number;
  stepPx: number;
  viewportWidth: number;
  gapPx: number;
};

/**
 * Mobile: always 5 equal tiles filling the strip (discovery density).
 * Desktop: near-120px whole tiles, no side gutters.
 */
function layoutBrandStrip(availablePx: number, isMobile: boolean): BrandLayout {
  const usable = Math.max(BRAND_ITEM_MIN_PX, availablePx);

  if (isMobile) {
    const gapPx = MOBILE_GAP_PX;
    const itemWidth =
      (usable - gapPx * (MOBILE_VISIBLE_COUNT - 1)) / MOBILE_VISIBLE_COUNT;

    return {
      itemWidth,
      stepPx: itemWidth + gapPx,
      viewportWidth: usable,
      gapPx,
    };
  }

  const gapPx = DESKTOP_GAP_PX;
  let count = Math.max(
    1,
    Math.floor((usable + gapPx) / (BRAND_ITEM_TARGET_PX + gapPx)),
  );
  let itemWidth = (usable - gapPx * (count - 1)) / count;

  const nextCount = count + 1;
  const nextWidth = (usable - gapPx * (nextCount - 1)) / nextCount;
  if (nextWidth >= BRAND_ITEM_MIN_PX && itemWidth > BRAND_ITEM_TARGET_PX * 1.15) {
    count = nextCount;
    itemWidth = nextWidth;
  }

  return {
    itemWidth,
    stepPx: itemWidth + gapPx,
    viewportWidth: usable,
    gapPx,
  };
}

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

export function BrandBar({ brands }: BrandBarProps) {
  const displayedBrands = brands.slice(0, 12);
  const count = displayedBrands.length;
  const barRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [instant, setInstant] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [layout, setLayout] = useState<BrandLayout | null>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia(MOBILE_LAYOUT_MQ);

    const syncMotion = () => setReduceMotion(motion.matches);
    const syncMobile = () => setIsMobile(mobile.matches);

    syncMotion();
    syncMobile();
    motion.addEventListener("change", syncMotion);
    mobile.addEventListener("change", syncMobile);
    return () => {
      motion.removeEventListener("change", syncMotion);
      mobile.removeEventListener("change", syncMobile);
    };
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const styles = window.getComputedStyle(bar);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const available = bar.clientWidth - paddingLeft - paddingRight;
      setLayout(layoutBrandStrip(available, isMobile));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [count, isMobile]);

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

  const stepPx = layout?.stepPx ?? BRAND_ITEM_TARGET_PX + DESKTOP_GAP_PX;

  return (
    <div
      ref={barRef}
      className="ui-brand-bar"
      aria-label="Brendlər"
      style={
        layout
          ? ({
              "--ui-brand-item-width": `${layout.itemWidth}px`,
              "--ui-brand-gap": `${layout.gapPx}px`,
            } as CSSProperties)
          : undefined
      }
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
    >
      <div
        className="ui-brand-bar__viewport"
        style={layout ? { width: layout.viewportWidth } : undefined}
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
              : { transform: `translate3d(-${step * stepPx}px, 0, 0)` }
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
