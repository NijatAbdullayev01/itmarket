import { describe, expect, it } from "vitest";
import {
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
  it("routes overlapping category slugs to the brand filter", () => {
    expect(resolveCatalogNavHref("apple", brands)).toBe("/?brand=apple");
  });

  it("keeps ordinary categories on the category filter", () => {
    expect(resolveCatalogNavHref("smartfonlar", brands)).toBe(
      "/?category=smartfonlar",
    );
  });
});
