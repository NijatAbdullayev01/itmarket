import { describe, expect, it } from "vitest";

import {
  BACKOFFICE_API_BFF_PREFIXES,
  buildApiBffRewrites,
  isBackofficeBffProxyPath,
} from "./api-bff-proxy";

describe("backoffice API BFF proxy", () => {
  it("proxies staff namespaces", () => {
    expect(isBackofficeBffProxyPath("/api/v1/staff/auth/login")).toBe(true);
    expect(isBackofficeBffProxyPath("/api/v1/catalog/products")).toBe(true);
    expect(isBackofficeBffProxyPath("/api/v1/customers")).toBe(true);
    expect(isBackofficeBffProxyPath("/api/v1/staff/payments/storefront-gate")).toBe(
      true,
    );
  });

  it("does not proxy customer checkout, webhooks, or metrics", () => {
    expect(isBackofficeBffProxyPath("/api/v1/customer/auth/login")).toBe(false);
    expect(isBackofficeBffProxyPath("/api/v1/storefront/cart")).toBe(false);
    expect(isBackofficeBffProxyPath("/api/v1/payments/webhooks/epoint")).toBe(
      false,
    );
    expect(isBackofficeBffProxyPath("/api/v1/observability/metrics")).toBe(
      false,
    );
  });

  it("builds prefix rewrites instead of a catch-all", () => {
    const rewrites = buildApiBffRewrites(
      "http://127.0.0.1:3001",
      BACKOFFICE_API_BFF_PREFIXES,
    );
    expect(
      rewrites.some((rule) => rule.source === "/api/v1/:path*"),
    ).toBe(false);
  });
});
