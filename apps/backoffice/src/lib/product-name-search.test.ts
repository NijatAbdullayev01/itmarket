import { describe, expect, it } from "vitest";

import {
  filterProductsByName,
  findExactProductNameMatch,
} from "./product-name-search";

const products = [
  { id: "1", name: "Apple MacBook Air 13" },
  { id: "2", name: "ThinkPad X1 Carbon" },
  { id: "3", name: "thinkpad t14" },
];

describe("filterProductsByName", () => {
  it("returns empty list for blank query", () => {
    expect(filterProductsByName(products, "")).toEqual([]);
    expect(filterProductsByName(products, "   ")).toEqual([]);
  });

  it("matches case-insensitively and respects limit", () => {
    expect(filterProductsByName(products, "think", 1)).toEqual([
      { id: "2", name: "ThinkPad X1 Carbon" },
    ]);
  });
});

describe("findExactProductNameMatch", () => {
  it("finds exact name ignoring case and surrounding spaces", () => {
    expect(findExactProductNameMatch(products, "  thinkpad x1 carbon  ")).toEqual(
      { id: "2", name: "ThinkPad X1 Carbon" },
    );
  });

  it("returns undefined when only partial match", () => {
    expect(findExactProductNameMatch(products, "ThinkPad")).toBeUndefined();
  });
});
