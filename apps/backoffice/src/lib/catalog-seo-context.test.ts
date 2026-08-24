import { describe, expect, it } from "vitest";

import {
  applyGeneratedProductSeo,
  canBuildProductSeoRequest,
  productSeoNeedsGeneration,
  promiseWithTimeout,
} from "./catalog-seo-context";

describe("catalog-seo-context helpers", () => {
  it("requires brand and model for product SEO request", () => {
    expect(
      canBuildProductSeoRequest({ modelName: "iPhone 15", brandName: "Apple" }),
    ).toBe(true);
    expect(
      canBuildProductSeoRequest({ modelName: "iPhone 15", brandName: "" }),
    ).toBe(false);
  });

  it("detects missing SEO fields", () => {
    expect(
      productSeoNeedsGeneration({
        seoTitle: "",
        seoDescription: "x",
        description: "y",
      }),
    ).toBe(true);
    expect(
      productSeoNeedsGeneration({
        seoTitle: "a",
        seoDescription: "b",
        description: "c",
      }),
    ).toBe(false);
  });

  it("fills only empty SEO fields from generated values", () => {
    expect(
      applyGeneratedProductSeo(
        {
          seoTitle: "Manual title",
          seoDescription: "",
          description: "",
        },
        {
          seoTitle: "Gen title",
          seoDescription: "Gen desc",
          description: "Gen body",
        },
      ),
    ).toEqual({
      seoTitle: "Manual title",
      seoDescription: "Gen desc",
      description: "Gen body",
    });
  });

  it("rejects when the wrapped promise exceeds the budget", async () => {
    await expect(
      promiseWithTimeout(new Promise(() => undefined), 1),
    ).rejects.toThrow("SEO_SUGGEST_TIMEOUT");
  });
});
