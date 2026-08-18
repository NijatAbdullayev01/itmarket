import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("backoffice proxy", () => {
  it("binds a per-request nonce and forbids HTML caching", () => {
    const response = proxy(
      new NextRequest("https://admin.it-market.org/catalog/categories"),
    );
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];

    expect(nonce).toEqual(expect.any(String));
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("strict-dynamic");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
