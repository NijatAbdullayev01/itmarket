"use client";

import { useState } from "react";
import { IconChevronDown } from "./icons";

export type CatalogIntroCopy = {
  readMore: string;
  showLess: string;
};

export const defaultCatalogIntroCopy: CatalogIntroCopy = {
  readMore: "Daha \u00E7ox oxu",
  showLess: "Daha az",
};

export type CatalogIntroProps = {
  text: string;
  /** Maximum character count before collapsing is enabled. Defaults to 160. */
  clampLength?: number;
  copy?: Partial<CatalogIntroCopy>;
  className?: string;
};

export function CatalogIntro({
  text,
  clampLength = 160,
  copy = defaultCatalogIntroCopy,
  className,
}: CatalogIntroProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const effectiveCopy: CatalogIntroCopy = {
    readMore: copy.readMore ?? defaultCatalogIntroCopy.readMore,
    showLess: copy.showLess ?? defaultCatalogIntroCopy.showLess,
  };

  const isLong = trimmed.length > clampLength;

  if (!isLong) {
    return (
      <p className={`ui-catalog-intro ${className ?? ""}`.trim()}>
        {trimmed}
      </p>
    );
  }

  return (
    <div
      className={`ui-catalog-intro ${expanded ? "ui-catalog-intro--expanded" : "ui-catalog-intro--collapsed"} ${className ?? ""}`.trim()}
    >
      <p className="ui-catalog-intro__text">{trimmed}</p>
      <button
        type="button"
        className="ui-catalog-intro__toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span>{expanded ? effectiveCopy.showLess : effectiveCopy.readMore}</span>
        <IconChevronDown
          className={`ui-catalog-intro__toggle-icon ${expanded ? "ui-catalog-intro__toggle-icon--expanded" : ""}`}
          width={14}
          height={14}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
