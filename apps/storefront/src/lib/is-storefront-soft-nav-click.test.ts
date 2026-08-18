import { describe, expect, it } from "vitest";

import { isStorefrontSoftNavUrl } from "./is-storefront-soft-nav-click";

describe("isStorefrontSoftNavUrl", () => {
  const current = new URL("https://it-market.org/categories/noutbuk");

  it("keeps same-origin path changes", () => {
    expect(
      isStorefrontSoftNavUrl(
        new URL("https://it-market.org/products/thinkpad"),
        current,
      ),
    ).toBe(true);
  });

  it("keeps same-path query changes", () => {
    expect(
      isStorefrontSoftNavUrl(
        new URL("https://it-market.org/categories/noutbuk?page=2"),
        current,
      ),
    ).toBe(true);
  });

  it("ignores the current URL", () => {
    expect(isStorefrontSoftNavUrl(current, current)).toBe(false);
  });

  it("ignores external origins", () => {
    expect(
      isStorefrontSoftNavUrl(new URL("https://example.com/products/x"), current),
    ).toBe(false);
  });
});
