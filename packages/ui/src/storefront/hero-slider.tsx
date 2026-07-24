"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { IconChevronLeft, IconChevronRight } from "./icons";

export type HeroSlide = {
  id: string;
  href: string;
  bannerSrc: string;
  bannerAlt: string;
};

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "collection",
    href: "/?sort=newest",
    bannerSrc: "/images/hero/tech-banner.png",
    bannerAlt: "TCL 50 UHD 4K televizor — yeni kolleksiya",
  },
  {
    id: "installment",
    href: "/?sort=price",
    bannerSrc: "/images/hero/installment-banner.png",
    bannerAlt: "iPhone taksit kampaniyası",
  },
];

type HeroSliderProps = {
  slides?: HeroSlide[];
};

export function HeroSlider({ slides }: HeroSliderProps) {
  const items =
    slides !== undefined && slides.length > 0 ? slides : FALLBACK_SLIDES;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + items.length) % items.length);
    },
    [items.length],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = window.setInterval(goNext, 6000);
    return () => window.clearInterval(timer);
  }, [goNext, items.length, paused]);

  return (
    <div
      className="ui-hero-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="ui-hero-slider__track">
        {items.map((slide, index) => (
          <article
            key={slide.id}
            className={[
              "ui-hero-slide",
              "ui-hero-slide--tech",
              index === activeIndex ? "ui-hero-slide--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden={index !== activeIndex}
          >
            <div className="ui-hero-slide__body">
              <Link className="ui-hero-slide__banner-link" href={slide.href}>
                <img
                  src={slide.bannerSrc}
                  alt={slide.bannerAlt}
                  className="ui-hero-slide__banner-image"
                  width={1084}
                  height={427}
                  decoding="async"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            className="ui-hero-slider__nav ui-hero-slider__nav--prev"
            onClick={goPrev}
            aria-label="Əvvəlki slayd"
          >
            <IconChevronLeft width={18} height={18} />
          </button>
          <button
            type="button"
            className="ui-hero-slider__nav ui-hero-slider__nav--next"
            onClick={goNext}
            aria-label="Növbəti slayd"
          >
            <IconChevronRight width={18} height={18} />
          </button>

          <div className="ui-hero-slider__dots" role="tablist" aria-label="Slaydlar">
            {items.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                className={
                  index === activeIndex
                    ? "ui-hero-slider__dot ui-hero-slider__dot--active"
                    : "ui-hero-slider__dot"
                }
                aria-selected={index === activeIndex}
                aria-label={`Slayd ${index + 1}`}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
