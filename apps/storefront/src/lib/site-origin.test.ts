import { afterEach, describe, expect, it, vi } from "vitest";

import { getStorefrontOrigin, resolveStorefrontOrigin } from "./site-origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getStorefrontOrigin", () => {
  it("production-da çatışmayan origin üçün null qaytarır", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_ORIGIN", "");
    vi.stubEnv("API_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

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

describe("resolveStorefrontOrigin", () => {
  it("konfiqurasiya edilmiş origin-i trailing slash olmadan qaytarır", () => {
    vi.stubEnv("API_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(resolveStorefrontOrigin("https://market.example/")).toBe(
      "https://market.example",
    );
  });

  it("konfiqurasiya edilmədikdə default LOCAL_ORIGIN qaytarır", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("API_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(resolveStorefrontOrigin(undefined)).toBe("http://localhost:3010");
    expect(resolveStorefrontOrigin("")).toBe("http://localhost:3010");
  });

  it("parallel-dev API :4000 olduqda default origin :4010 olur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("API_ORIGIN", "http://localhost:4000");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/api/v1");
    expect(resolveStorefrontOrigin(undefined)).toBe("http://localhost:4010");
  });

  it("parallel-dev-də .env 3010 origin-ini 4010-a uyğunlaşdırır", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("API_ORIGIN", "http://localhost:4000");
    expect(resolveStorefrontOrigin("http://localhost:3010")).toBe(
      "http://localhost:4010",
    );
    expect(resolveStorefrontOrigin("http://127.0.0.1:3010")).toBe(
      "http://127.0.0.1:4010",
    );
  });
});
