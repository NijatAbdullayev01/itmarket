"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { IconChevronLeft, IconChevronRight } from "./icons";
import {
  DEAL_DESKTOP_GAP_PX,
  DEAL_ITEM_TARGET_PX,
  DEAL_MOBILE_LAYOUT_MQ,
  dealProductRailNeedsCarousel,
  layoutDealProductStrip,
  type DealProductRailLayout,
} from "./deal-product-rail-layout";

export type DealProductRailCopy = {
  previous: string;
  next: string;
};

export const defaultDealProductRailCopy: DealProductRailCopy = {
  previous: "\u018Fvv\u0259lki t\u0259klifl\u0259r",
  next: "N\u00F6vb\u0259ti t\u0259klifl\u0259r",
};

type DealProductRailProps = {
  title: string;
  ariaLabel: string;
  children: ReactNode;
  copy?: Partial<DealProductRailCopy>;
};

const STEP_INTERVAL_MS = 4200;
const SLIDE_DURATION_MS = 640;
const SWIPE_THRESHOLD_RATIO = 0.18;
const DRAG_CLICK_SUPPRESS_PX = 8;
const MANUAL_RESUME_MS = 3800;

function DealItems({
  items,
  keyPrefix,
}: {
  items: ReactNode[];
  keyPrefix: string;
}) {
  return items.map((child, index) => (
    <div key={`${keyPrefix}-${index}`} className="ui-deal-rail__item">
      {isValidElement(child) ? cloneElement(child) : child}
    </div>
  ));
}

export function DealProductRail({
  title,
  ariaLabel,
  children,
  copy: copyProp,
}: DealProductRailProps) {
  const copy = { ...defaultDealProductRailCopy, ...copyProp };
  const items = Children.toArray(children).filter(Boolean);
  const count = items.length;
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
  const [layout, setLayout] = useState<DealProductRailLayout | null>(null);

  stepRef.current = step;

  const stepPx = layout?.stepPx ?? DEAL_ITEM_TARGET_PX + DEAL_DESKTOP_GAP_PX;
  const enableCarousel =
    layout !== null &&
    dealProductRailNeedsCarousel(count, layout) &&
    !reduceMotion;
  const canManualNavigate =
    layout !== null && dealProductRailNeedsCarousel(count, layout);

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
    const mobile = window.matchMedia(DEAL_MOBILE_LAYOUT_MQ);

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
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      setLayout(layoutDealProductStrip(viewport.clientWidth, count, isMobile));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [count, isMobile]);

  useEffect(() => {
    setStep(0);
    setInstant(false);
    setDragOffsetPx(0);
  }, [count, enableCarousel]);

  useEffect(() => {
    if (!enableCarousel || paused) return;

    const timer = window.setInterval(() => {
      setStep((current) => current + 1);
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enableCarousel, paused]);

  useEffect(() => {
    if (!enableCarousel || step < count) return;

    const timer = window.setTimeout(() => {
      setInstant(true);
      setStep(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setInstant(false));
      });
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [step, count, enableCarousel]);

  useEffect(() => () => clearResumeTimer(), [clearResumeTimer]);

  const goNext = useCallback(() => {
    if (!canManualNavigate) return;
    pauseForInteraction();
    if (reduceMotion) {
      viewportRef.current?.scrollBy({ left: stepPx, behavior: "smooth" });
      scheduleResume();
      return;
    }
    setStep((current) => current + 1);
    scheduleResume();
  }, [
    canManualNavigate,
    pauseForInteraction,
    reduceMotion,
    scheduleResume,
    stepPx,
  ]);

  const goPrev = useCallback(() => {
    if (!canManualNavigate) return;
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
  }, [
    canManualNavigate,
    count,
    pauseForInteraction,
    reduceMotion,
    scheduleResume,
    stepPx,
  ]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableCarousel) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

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
    <section
      className={[
        "ui-home-rail ui-deal-rail",
        canManualNavigate ? "ui-deal-rail--carousel" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
      style={
        layout
          ? ({
              "--ui-deal-item-width": `${layout.itemWidth}px`,
              "--ui-deal-gap": `${layout.gapPx}px`,
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
      <header className="ui-deal-rail__header">
        <h2 className="ui-section-heading ui-deal-rail__heading">{title}</h2>
      </header>

      <div className="ui-deal-rail__stage">
        <div
          ref={viewportRef}
          className="ui-deal-rail__viewport"
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
              "ui-deal-rail__scroll",
              instant || dragging ? "ui-deal-rail__scroll--instant" : "",
              dragging ? "ui-deal-rail__scroll--dragging" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              enableCarousel
                ? {
                    transform: `translate3d(-${step * stepPx - dragOffsetPx}px, 0, 0)`,
                  }
                : undefined
            }
          >
            <div className="ui-deal-rail__group">
              <DealItems items={items} keyPrefix="primary" />
            </div>
            {enableCarousel ? (
              <div className="ui-deal-rail__group" aria-hidden="true" inert>
                <DealItems items={items} keyPrefix="duplicate" />
              </div>
            ) : null}
          </div>
        </div>

        {canManualNavigate ? (
          <>
            <button
              type="button"
              className="ui-deal-rail__nav ui-deal-rail__nav--prev"
              onClick={goPrev}
              aria-label={copy.previous}
            >
              <IconChevronLeft width={18} height={18} />
            </button>
            <button
              type="button"
              className="ui-deal-rail__nav ui-deal-rail__nav--next"
              onClick={goNext}
              aria-label={copy.next}
            >
              <IconChevronRight width={18} height={18} />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
