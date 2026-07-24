"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type CatalogResultsBannerSlide = {
  id: string;
  href: string;
  bannerSrc: string;
  bannerAlt: string;
};

type CatalogResultsBannerProps = {
  slides: CatalogResultsBannerSlide[];
};

export function CatalogResultsBanner({ slides }: CatalogResultsBannerProps) {
  const items = slides.filter(
    (slide) =>
      typeof slide.bannerSrc === "string" && slide.bannerSrc.trim() !== "",
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (items.length === 0) {
        return;
      }
      setActiveIndex((index + items.length) % items.length);
    },
    [items.length],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) {
      return;
    }
    const timer = window.setInterval(goNext, 7000);
    return () => window.clearInterval(timer);
  }, [goNext, items.length, paused]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="ui-catalog-results-banner"
      aria-label="Axtarış kampaniya banneri"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="ui-catalog-results-banner__track">
        {items.map((slide, index) => (
          <div
            key={slide.id}
            className={[
              "ui-catalog-results-banner__slide",
              index === activeIndex
                ? "ui-catalog-results-banner__slide--active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden={index !== activeIndex}
          >
            <Link
              className="ui-catalog-results-banner__link"
              href={slide.href}
            >
              <img
                src={slide.bannerSrc}
                alt={slide.bannerAlt}
                className="ui-catalog-results-banner__image"
                width={1360}
                height={220}
                decoding="async"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </Link>
          </div>
        ))}
      </div>

      {items.length > 1 ? (
        <div
          className="ui-catalog-results-banner__dots"
          role="tablist"
          aria-label="Banner slaydları"
        >
          {items.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              className={
                index === activeIndex
                  ? "ui-catalog-results-banner__dot ui-catalog-results-banner__dot--active"
                  : "ui-catalog-results-banner__dot"
              }
              aria-selected={index === activeIndex}
              aria-label={`Banner ${index + 1}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
