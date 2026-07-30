import { describe, expect, it } from "vitest";
import {
  coverageEditHref,
  coverageSampleKindLabel,
} from "./catalog-seo-coverage-links";

describe("catalog-seo-coverage-links", () => {
  it("routes subcategory samples via parentId", () => {
    expect(
      coverageEditHref({
        entityType: "category",
        id: "sub-1",
        name: "Smartfonlar",
        slug: "smartfonlar",
        status: "ACTIVE",
        missing: ["seoTitle"],
        parentId: "root-1",
      }),
    ).toBe("/catalog/subcategories?edit=sub-1");

    expect(
      coverageEditHref({
        entityType: "category",
        id: "root-1",
        name: "Telefonlar",
        slug: "telefonlar",
        status: "ACTIVE",
        missing: ["seoTitle"],
        parentId: null,
      }),
    ).toBe("/catalog/categories?edit=root-1");
  });

  it("labels subcategory samples distinctly", () => {
    expect(
      coverageSampleKindLabel({
        entityType: "category",
        id: "sub-1",
        name: "Smartfonlar",
        slug: "smartfonlar",
        status: "ACTIVE",
        missing: ["seoTitle"],
        parentId: "root-1",
      }),
    ).toBe("Altkateqoriya");
  });
});
