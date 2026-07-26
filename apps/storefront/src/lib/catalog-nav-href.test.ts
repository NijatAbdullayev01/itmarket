import { describe, expect, it } from "vitest";
import {
  buildCatalogHref,
  matchCatalogBrandBySlug,
  resolveCatalogNavHref,
} from "@itmarket/ui";

const brands = [
  { name: "Apple", slug: "apple" },
  { name: "Samsung", slug: "samsung" },
];

describe("matchCatalogBrandBySlug", () => {
  it("matches brand boutique slugs case-insensitively", () => {
    expect(matchCatalogBrandBySlug("Apple", brands)?.slug).toBe("apple");
    expect(matchCatalogBrandBySlug("apple", brands)?.slug).toBe("apple");
  });

  it("returns undefined for ordinary category slugs", () => {
    expect(matchCatalogBrandBySlug("noutbuklar", brands)).toBeUndefined();
  });
});

describe("resolveCatalogNavHref", () => {
  it("routes overlapping category slugs to brand landings", () => {
    expect(resolveCatalogNavHref("apple", brands)).toBe("/brands/apple");
  });

  it("routes ordinary categories to indexable category landings", () => {
    expect(resolveCatalogNavHref("smartfonlar", brands)).toBe(
      "/categories/smartfonlar",
    );
  });
});

describe("buildCatalogHref", () => {
  it("builds brand landings without query brand param", () => {
    expect(buildCatalogHref({ brand: "apple" })).toBe("/brands/apple");
  });

  it("keeps brand as facet on category landings", () => {
    expect(buildCatalogHref({ category: "telefonlar", brand: "apple" })).toBe(
      "/categories/telefonlar?brand=apple",
    );
  });

  it("omits page=1 and includes page>1", () => {
    expect(buildCatalogHref({ category: "telefonlar", page: 1 })).toBe(
      "/categories/telefonlar",
    );
    expect(buildCatalogHref({ brand: "apple", page: 3 })).toBe(
      "/brands/apple?page=3",
    );
  });

  it("applies min/max price query params on brand landings", () => {
    expect(
      buildCatalogHref({ brand: "apple", minPrice: 100, maxPrice: 500 }),
    ).toBe("/brands/apple?minPrice=100&maxPrice=500");
  });
});
