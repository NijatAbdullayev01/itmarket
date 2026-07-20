import { describe, expect, it } from "vitest";

import { resolveStorefrontOrigin } from "./resolve-storefront-origin";

describe("resolveStorefrontOrigin", () => {
  it("uses configured origin without trailing slash", () => {
    expect(resolveStorefrontOrigin("https://shop.example/")).toBe(
      "https://shop.example",
    );
  });

  it("falls back to local storefront dev port", () => {
    expect(resolveStorefrontOrigin(undefined)).toBe("http://127.0.0.1:3010");
    expect(resolveStorefrontOrigin("")).toBe("http://127.0.0.1:3010");
  });
});
