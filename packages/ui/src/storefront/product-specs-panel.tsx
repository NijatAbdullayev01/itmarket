"use client";

import { useState } from "react";
import {
  formatProductAttributeLabel,
  formatProductAttributeValue,
} from "../utils/format-product-attribute";
import { IconChevronDown, IconDocument } from "./icons";

const INITIAL_VISIBLE_COUNT = 4;

type SpecEntry = [string, string];

type ProductSpecsPanelProps = {
  entries: SpecEntry[];
};

function splitIntoColumns(items: SpecEntry[]): [SpecEntry[], SpecEntry[]] {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function SpecColumn({ items }: { items: SpecEntry[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="ui-product-specs__column">
      {items.map(([key, value]) => (
        <div key={key} className="ui-product-specs__row">
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

export function ProductSpecsPanel({ entries }: ProductSpecsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasHiddenItems = entries.length > INITIAL_VISIBLE_COUNT;
  const visibleEntries =
    expanded || !hasHiddenItems
      ? entries
      : entries.slice(0, INITIAL_VISIBLE_COUNT);
  const [leftColumn, rightColumn] = splitIntoColumns(visibleEntries);

  return (
    <article className="ui-product-details__panel">
      <header className="ui-product-details__header">
        <span className="ui-product-details__icon" aria-hidden="true">
          <IconDocument width={20} height={20} />
        </span>
        <h2 className="ui-product-details__title">Xüsusiyyətlər</h2>
      </header>

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
            {expanded ? "Gizlət" : "Hamısını göstər"}
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
    </article>
  );
}
