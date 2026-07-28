"use client";

import { usePathname } from "next/navigation";

import { IconCatalog } from "./icons";

type HeaderCatalogButtonFallbackProps = {
  catalogLabel?: string;
  openLabel?: string;
};

/**
 * Same geometry/look as the real catalog trigger while data streams.
 * Not disabled-looking — only inert — so Suspense swap is nearly invisible.
 */
export function HeaderCatalogButtonFallback({
  catalogLabel = "Kataloq",
  openLabel = "Kataloqu aç",
}: HeaderCatalogButtonFallbackProps) {
  const pathname = usePathname();
  const visible = pathname !== "/";

  return (
    <div
      className={[
        "ui-header-catalog",
        "ui-header-catalog--fallback",
        visible ? "ui-header-catalog--visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy="true"
    >
      <div className="ui-header-catalog__reveal">
        <div className="ui-header-catalog__slot">
          <span
            className="ui-header-catalog__trigger"
            aria-label={openLabel}
            role="status"
          >
            <span className="ui-header-catalog__icon" aria-hidden="true">
              <IconCatalog width={20} height={20} />
            </span>
            <span className="ui-header-catalog__label">{catalogLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
