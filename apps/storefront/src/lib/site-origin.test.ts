import { afterEach, describe, expect, it, vi } from "vitest";

import { getStorefrontOrigin } from "./site-origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getStorefrontOrigin", () => {
  it("production-da çatışmayan origin üçün null qaytarır", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    expect(getStorefrontOrigin()).toBeNull();
  });

  it("production-da təhlükəsiz olmayan və path olan URL-i rədd edir", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_ORIGIN", "http://example.test/store");

    expect(getStorefrontOrigin()).toBeNull();
  });

  it("etibarlı HTTPS origin-i normallaşdırır", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_ORIGIN", "https://market.example/");

    expect(getStorefrontOrigin()?.href).toBe("https://market.example/");
  });
});
