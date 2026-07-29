import { describe, expect, it } from "vitest";

import type { CategorySummary, ProductSummary } from "./api";
import {
  buildCategoryProductTypePath,
  buildLandingCoverageMaps,
  landingCoverageFromCount,
} from "./catalog-landing-coverage";

describe("landingCoverageFromCount", () => {
  it("empty counts are skipped", () => {
    expect(landingCoverageFromCount(0)).toEqual({
      hasProducts: false,
      totalPages: 0,
    });
  });

  it("pages by landing page size 24", () => {
    expect(landingCoverageFromCount(24)).toEqual({
      hasProducts: true,
      totalPages: 1,
    });
    expect(landingCoverageFromCount(25)).toEqual({
      hasProducts: true,
      totalPages: 2,
    });
  });
});

describe("buildCategoryProductTypePath", () => {
  const categories: CategorySummary[] = [
    {
      id: "root",
      name: "Elektronika",
      slug: "elektronika",
      parentId: null,
      sortOrder: 0,
    },
    {
      id: "phones",
      name: "Telefonlar",
      slug: "telefonlar",
      parentId: "root",
      sortOrder: 1,
    },
  ];

  it("builds parent > child path", () => {
    expect(buildCategoryProductTypePath("telefonlar", categories)).toBe(
      "Elektronika > Telefonlar",
    );
  });
});

describe("buildLandingCoverageMaps", () => {
  it("counts variant rows per category and brand", () => {
    const items = [
      {
        category: { name: "Telefonlar", slug: "telefonlar" },
        brand: { name: "Apple", slug: "apple" },
      },
      {
        category: { name: "Telefonlar", slug: "telefonlar" },
        brand: { name: "Apple", slug: "apple" },
      },
      {
        category: { name: "Noutbuklar", slug: "noutbuklar" },
        brand: { name: "Lenovo", slug: "lenovo" },
      },
    ] as ProductSummary[];

    const maps = buildLandingCoverageMaps(items);
    expect(maps.categoryCounts.get("telefonlar")).toBe(2);
    expect(maps.categoryCounts.get("noutbuklar")).toBe(1);
    expect(maps.brandCounts.get("apple")).toBe(2);
    expect(maps.brandCounts.get("lenovo")).toBe(1);
  });

  it("rolls child category counts up to parent landings", () => {
    const categories: CategorySummary[] = [
      {
        id: "root",
        name: "Elektronika",
        slug: "elektronika",
        parentId: null,
        sortOrder: 0,
      },
      {
        id: "phones",
        name: "Telefonlar",
        slug: "telefonlar",
        parentId: "root",
        sortOrder: 1,
      },
    ];
    const items = [
      {
        category: {
          name: "Telefonlar",
          slug: "telefonlar",
          parentId: "root",
        },
        brand: { name: "Apple", slug: "apple" },
      },
      {
        category: {
          name: "Telefonlar",
          slug: "telefonlar",
          parentId: "root",
        },
        brand: { name: "Samsung", slug: "samsung" },
      },
    ] as ProductSummary[];

    const maps = buildLandingCoverageMaps(items, categories);
    expect(maps.categoryCounts.get("telefonlar")).toBe(2);
    expect(maps.categoryCounts.get("elektronika")).toBe(2);
  });
});
