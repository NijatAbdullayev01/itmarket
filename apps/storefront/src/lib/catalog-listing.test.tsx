import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const catalogFiltersSource = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../packages/ui/src/storefront/catalog-filters.tsx",
  ),
  "utf8",
);

describe("CatalogFilters listing", () => {
  it("wraps page copy in a column so brand intro cannot sit in the product grid", () => {
    expect(catalogFiltersSource).toContain(
      '<div className="ui-catalog-listing">{children}</div>',
    );
  });
});
