"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { IconChevronLeft, IconChevronRight } from "./icons";

const SLIDES = [
  {
    id: "delivery",
    tag: "Sürətli çatdırılma",
    title: "2 saata pulsuz çatdırılma",
    text: "Bakı üzrə 99 AZN-dən yuxarı sifarişlərə pulsuz və sürətli çatdırılma.",
    href: "/?sort=newest",
    cta: "Sifariş ver",
    variant: "delivery" as const,
  },
  {
    id: "collection",
    tag: "Yeni kolleksiya",
    title: "Texnologiya seçiminizi tapın",
    text: "Noutbuk, monitor, aksesuar və daha çoxu — AZN ilə aydın qiymət.",
    href: "/?sort=newest",
    cta: "Yeni gələnlər",
    variant: "tech" as const,
  },
  {
    id: "installment",
    tag: "Faizsiz taksit",
    title: "0% 12 ay taksit imkanı",
    text: "Seçilmiş məhsullarda nağd, kart və hissə-hissə ödəniş rahatlığı.",
    href: "/?sort=price",
    cta: "Təkliflərə bax",
    variant: "installment" as const,
  },
];

export function HeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + SLIDES.length) % SLIDES.length);
  }, []);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(goNext, 6000);
    return () => window.clearInterval(timer);
  }, [goNext, paused]);

  return (
    <div
      className="ui-hero-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="ui-hero-slider__track">
        {SLIDES.map((slide, index) => (
          <article
            key={slide.id}
            className={
              index === activeIndex
                ? "ui-hero-slide ui-hero-slide--active"
                : "ui-hero-slide"
            }
            aria-hidden={index !== activeIndex}
          >
            <div className={`ui-hero-slide__visual ui-hero-slide__visual--${slide.variant}`}>
              {slide.variant === "delivery" ? (
                <div className="ui-hero-slide__delivery-art" aria-hidden="true">
                  <div className="ui-hero-slide__clock">
                    <span>2</span>
                    <small>saat</small>
                  </div>
                  <div className="ui-hero-slide__scooter" />
                </div>
              ) : slide.variant === "tech" ? (
                <div className="ui-hero-slide__tech-art" aria-hidden="true">
                  <span className="ui-hero-slide__device ui-hero-slide__device--laptop" />
                  <span className="ui-hero-slide__device ui-hero-slide__device--phone" />
                  <span className="ui-hero-slide__device ui-hero-slide__device--headphones" />
                </div>
              ) : (
                <div className="ui-hero-slide__installment-art" aria-hidden="true">
                  <span className="ui-hero-slide__percent">0%</span>
                  <span className="ui-hero-slide__months">12 ay</span>
                </div>
              )}
            </div>
            <div className="ui-hero-slide__content">
              <span className="ui-hero-slide__tag">{slide.tag}</span>
              <h2 className="ui-hero-slide__title">{slide.title}</h2>
              <p className="ui-hero-slide__text">{slide.text}</p>
              <Link className="ui-hero-slide__cta" href={slide.href}>
                {slide.cta}
              </Link>
            </div>
          </article>
        ))}
      </div>

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
        {SLIDES.map((slide, index) => (
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
    </div>
  );
}
