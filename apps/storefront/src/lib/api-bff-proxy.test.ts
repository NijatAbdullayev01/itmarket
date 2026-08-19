import { describe, expect, it } from "vitest";

import {
  buildApiBffRewrites,
  isStorefrontBffProxyPath,
  STOREFRONT_API_BFF_PREFIXES,
} from "./api-bff-proxy";

describe("storefront API BFF proxy", () => {
  it("proxies catalog, cart, customer, and public payment paths", () => {
    expect(isStorefrontBffProxyPath("/api/v1/storefront/cart")).toBe(true);
    expect(isStorefrontBffProxyPath("/api/v1/customer/auth/login")).toBe(true);
    expect(isStorefrontBffProxyPath("/api/v1/payments/attempts/tok/claim")).toBe(
      true,
    );
    expect(isStorefrontBffProxyPath("/api/v1/payments/orders/ITM-1/status")).toBe(
      true,
    );
  });

  it("does not proxy staff, webhooks, or metrics", () => {
    expect(isStorefrontBffProxyPath("/api/v1/staff/auth/login")).toBe(false);
    expect(isStorefrontBffProxyPath("/api/v1/payments/webhooks/epoint")).toBe(
      false,
    );
    expect(isStorefrontBffProxyPath("/api/v1/observability/metrics")).toBe(
      false,
    );
    expect(isStorefrontBffProxyPath("/api/v1/catalog/products")).toBe(false);
  });

  it("builds prefix rewrites instead of a catch-all", () => {
    const rewrites = buildApiBffRewrites(
      "http://127.0.0.1:3001",
      STOREFRONT_API_BFF_PREFIXES,
    );
    expect(rewrites.some((rule) => rule.source.includes(":path*"))).toBe(true);
    expect(
      rewrites.some((rule) => rule.source === "/api/v1/:path*"),
    ).toBe(false);
    expect(
      rewrites.some((rule) => rule.source.includes("webhooks")),
    ).toBe(false);
  });
});
