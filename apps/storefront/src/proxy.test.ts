import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("storefront proxy", () => {
  it("binds a per-request nonce and allows Google Analytics / GTM connect-src endpoints", () => {
    const response = proxy(new NextRequest("https://it-market.az/"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];

    expect(nonce).toEqual(expect.any(String));
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("strict-dynamic");
    expect(csp).toContain("https://analytics.google.com");
    expect(csp).toContain("https://*.analytics.google.com");
    expect(csp).toContain("https://www.google.com");
    expect(csp).toContain("https://*.google.com");
    expect(csp).toContain("https://google-analytics.com");
    expect(csp).toContain("https://*.google-analytics.com");
  });
});
