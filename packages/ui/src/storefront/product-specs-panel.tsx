"use client";

import { useState } from "react";
import {
  formatProductAttributeLabel,
  formatProductAttributeValue,
} from "../utils/format-product-attribute";
import type { ProductSpecEntry } from "../utils/product-spec-entries";
import { IconChevronDown, IconDocument } from "./icons";

const INITIAL_VISIBLE_COUNT = 10;

export type ProductSpecsPanelCopy = {
  title: string;
  showAll: string;
  hide: string;
  descriptionTitle: string;
};

export const defaultProductSpecsPanelCopy: ProductSpecsPanelCopy = {
  title: "X\u00FCsusiyy\u0259tl\u0259r",
  showAll: "Ham\u0131s\u0131n\u0131 g\u00F6st\u0259r",
  hide: "Gizl\u0259t",
  descriptionTitle: "M\u0259hsul haqq\u0131nda",
};

type ProductSpecsPanelProps = {
  entries: ProductSpecEntry[];
  /**
   * Anchor id for deep-linking. Defaults to `xususiyyetler` when the panel
   * header is shown; omitted for embedded/disclosure usage (`showHeader={false}`).
   */
  id?: string;
  /** When false, only the spec rows are shown (no panel title). */
  showHeader?: boolean;
  /** Optional product description rendered below the attribute table. */
  description?: string | null;
  copy?: Partial<ProductSpecsPanelCopy>;
};

function splitIntoColumns(
  items: ProductSpecEntry[],
): [ProductSpecEntry[], ProductSpecEntry[]] {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function SpecColumn({ items }: { items: ProductSpecEntry[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="ui-product-specs__column">
      {items.map(([key, value], index) => (
        <div key={`${key}-${index}`} className="ui-product-specs__row">
          <span className="ui-product-specs__label">
            {formatProductAttributeLabel(key, value)}:
          </span>
          <span className="ui-product-specs__value">
            {formatProductAttributeValue(key, value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProductSpecsPanel({
  entries,
  id,
  showHeader = true,
  description,
  copy: copyProp,
}: ProductSpecsPanelProps) {
  const copy = { ...defaultProductSpecsPanelCopy, ...copyProp };
  const [expanded, setExpanded] = useState(false);
  const hasEntries = entries.length > 0;
  const hasHiddenItems = entries.length > INITIAL_VISIBLE_COUNT;
  const visibleEntries =
    expanded || !hasHiddenItems
      ? entries
      : entries.slice(0, INITIAL_VISIBLE_COUNT);
  const [leftColumn, rightColumn] = splitIntoColumns(visibleEntries);
  const panelId =
    id ?? (showHeader && hasEntries ? "xususiyyetler" : undefined);
  const descriptionText = description?.trim() ?? "";
  const hasDescription = descriptionText.length > 0;

  if (!hasEntries && !hasDescription) {
    return null;
  }

  return (
    <article className="ui-product-details__panel" id={panelId}>
      {showHeader && hasEntries ? (
        <header className="ui-product-details__header">
          <span className="ui-product-details__icon" aria-hidden="true">
            <IconDocument width={20} height={20} />
          </span>
          <h2 className="ui-product-details__title">{copy.title}</h2>
        </header>
      ) : null}

      {hasEntries ? (
        <div className="ui-product-specs">
          <div className="ui-product-specs__columns">
            <SpecColumn items={leftColumn} />
            <SpecColumn items={rightColumn} />
          </div>

          {hasHiddenItems ? (
            <button
              type="button"
              className="ui-product-specs__toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? copy.hide : copy.showAll}
              <IconChevronDown
                className={
                  expanded
                    ? "ui-product-specs__toggle-icon ui-product-specs__toggle-icon--expanded"
                    : "ui-product-specs__toggle-icon"
                }
                width={16}
                height={16}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>
      ) : null}

      {hasDescription ? (
        <section
          className="ui-product-description"
          aria-labelledby="product-description-heading"
        >
          {hasEntries ? (
            <h3
              id="product-description-heading"
              className="ui-product-description__title"
            >
              {copy.descriptionTitle}
            </h3>
          ) : (
            <h2
              id="product-description-heading"
              className="ui-product-description__title"
            >
              {copy.descriptionTitle}
            </h2>
          )}
          <p className="ui-product-description__body">{descriptionText}</p>
        </section>
      ) : null}
    </article>
  );
}
