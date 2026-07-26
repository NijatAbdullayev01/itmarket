"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { BrandMark } from "./brand-mark";
import { IconChevronLeft, IconChevronRight } from "./icons";

export type BrandBarCopy = {
  brandsNav: string;
  previousBrands: string;
  nextBrands: string;
};

export const defaultBrandBarCopy: BrandBarCopy = {
  brandsNav: "Brendl\u0259r",
  previousBrands: "\u018Fvv\u0259lki brendl\u0259r",
  nextBrands: "N\u00F6vb\u0259ti brendl\u0259r",
};

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
  copy?: Partial<BrandBarCopy>;
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
const SWIPE_THRESHOLD_RATIO = 0.22;
const DRAG_CLICK_SUPPRESS_PX = 8;
const MANUAL_RESUME_MS = 3200;

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
      href={`/brands/${encodeURIComponent(brand.slug)}`}
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

export function BrandBar({ brands, copy: copyProp }: BrandBarProps) {
  const copy = { ...defaultBrandBarCopy, ...copyProp };
  const displayedBrands = brands.slice(0, 12);
  const count = displayedBrands.length;
  const barRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  const hoveredRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    moved: boolean;
    captured: boolean;
  } | null>(null);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [instant, setInstant] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [layout, setLayout] = useState<BrandLayout | null>(null);

  stepRef.current = step;

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const pauseForInteraction = useCallback(() => {
    clearResumeTimer();
    setPaused(true);
  }, [clearResumeTimer]);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      if (!hoveredRef.current) {
        setPaused(false);
      }
    }, MANUAL_RESUME_MS);
  }, [clearResumeTimer]);

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
    setDragOffsetPx(0);
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

  useEffect(() => () => clearResumeTimer(), [clearResumeTimer]);

  const stepPx = layout?.stepPx ?? BRAND_ITEM_TARGET_PX + DESKTOP_GAP_PX;
  const canManualNavigate = count > 1;

  const goNext = useCallback(() => {
    if (count <= 1) return;
    pauseForInteraction();
    if (reduceMotion) {
      viewportRef.current?.scrollBy({ left: stepPx, behavior: "smooth" });
      scheduleResume();
      return;
    }
    setStep((current) => current + 1);
    scheduleResume();
  }, [count, pauseForInteraction, reduceMotion, scheduleResume, stepPx]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    pauseForInteraction();
    if (reduceMotion) {
      viewportRef.current?.scrollBy({ left: -stepPx, behavior: "smooth" });
      scheduleResume();
      return;
    }

    const current = stepRef.current;
    if (current <= 0) {
      setInstant(true);
      setStep(count);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setInstant(false);
          setStep(count - 1);
        });
      });
      scheduleResume();
      return;
    }

    setStep(current - 1);
    scheduleResume();
  }, [count, pauseForInteraction, reduceMotion, scheduleResume, stepPx]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduceMotion || count <= 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    // Capture only after drag threshold — immediate capture breaks <Link> clicks.
    pauseForInteraction();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
      captured: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    if (!drag.captured && Math.abs(dx) >= DRAG_CLICK_SUPPRESS_PX) {
      drag.moved = true;
      drag.captured = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (drag.captured) {
      setDragOffsetPx(dx);
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const moved = drag.moved;
    if (
      drag.captured &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
    setDragOffsetPx(0);

    if (moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    if (!moved) {
      scheduleResume();
      return;
    }

    const threshold = stepPx * SWIPE_THRESHOLD_RATIO;
    if (dx <= -threshold) {
      goNext();
      return;
    }
    if (dx >= threshold) {
      goPrev();
      return;
    }

    scheduleResume();
  };

  if (count === 0) return null;

  return (
    <div
      ref={barRef}
      className="ui-brand-bar"
      aria-label={copy.brandsNav}
      style={
        layout
          ? ({
              "--ui-brand-item-width": `${layout.itemWidth}px`,
              "--ui-brand-gap": `${layout.gapPx}px`,
            } as CSSProperties)
          : undefined
      }
      onMouseEnter={() => {
        hoveredRef.current = true;
        clearResumeTimer();
        setPaused(true);
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        clearResumeTimer();
        setPaused(false);
      }}
      onFocusCapture={() => {
        clearResumeTimer();
        setPaused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleResume();
        }
      }}
    >
      <div
        ref={viewportRef}
        className="ui-brand-bar__viewport"
        style={layout ? { width: layout.viewportWidth } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div
          className={[
            "ui-brand-bar__scroll",
            instant || dragging ? "ui-brand-bar__scroll--instant" : "",
            dragging ? "ui-brand-bar__scroll--dragging" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            reduceMotion
              ? undefined
              : {
                  transform: `translate3d(-${step * stepPx - dragOffsetPx}px, 0, 0)`,
                }
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

      {canManualNavigate ? (
        <>
          <button
            type="button"
            className="ui-brand-bar__nav ui-brand-bar__nav--prev"
            onClick={goPrev}
            aria-label={copy.previousBrands}
          >
            <IconChevronLeft width={16} height={16} />
          </button>
          <button
            type="button"
            className="ui-brand-bar__nav ui-brand-bar__nav--next"
            onClick={goNext}
            aria-label={copy.nextBrands}
          >
            <IconChevronRight width={16} height={16} />
          </button>
        </>
      ) : null}
    </div>
  );
}
