import { describe, expect, it } from "vitest";

import { resolveSitemapId } from "./sitemap-id";

describe("resolveSitemapId", () => {
  it("coerces Next 16 string ids so taxonomy sitemap is not empty", () => {
    expect(resolveSitemapId("0")).toBe(0);
    expect(resolveSitemapId(0)).toBe(0);
    expect(resolveSitemapId("1")).toBe(1);
    expect(Number.isFinite(resolveSitemapId("nope"))).toBe(false);
  });
});
