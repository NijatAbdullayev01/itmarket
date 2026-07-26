import { describe, expect, it } from "vitest";

import {
  localizeCategoryName,
  withLocalizedCategoryNames,
} from "./localize-category";

describe("localizeCategoryName", () => {
  const names = {
    noutbuklar: "Laptops",
    smartfonlar: "Smartphones and accessories",
  };

  it("returns the mapped label for a known slug", () => {
    expect(localizeCategoryName("noutbuklar", "Noutbuklar", names)).toBe(
      "Laptops",
    );
  });

  it("falls back to the API name when the slug is unknown", () => {
    expect(localizeCategoryName("unknown", "Custom category", names)).toBe(
      "Custom category",
    );
  });

  it("falls back when slug is missing", () => {
    expect(localizeCategoryName(undefined, "Noutbuklar", names)).toBe(
      "Noutbuklar",
    );
  });
});

describe("withLocalizedCategoryNames", () => {
  it("maps names by slug and leaves unknown entries unchanged", () => {
    const result = withLocalizedCategoryNames(
      [
        { id: "1", slug: "noutbuklar", name: "Noutbuklar" },
        { id: "2", slug: "custom", name: "Xüsusi" },
      ],
      { noutbuklar: "Laptops" },
    );

    expect(result).toEqual([
      { id: "1", slug: "noutbuklar", name: "Laptops" },
      { id: "2", slug: "custom", name: "Xüsusi" },
    ]);
  });

  it("returns the original array when no translations are provided", () => {
    const categories = [{ id: "1", slug: "noutbuklar", name: "Noutbuklar" }];
    expect(withLocalizedCategoryNames(categories, {})).toBe(categories);
  });
});
