import { describe, expect, it } from "vitest";

import { staffApiProxyHeaders } from "./staff-api-proxy-headers";

describe("staffApiProxyHeaders", () => {
  it("forwards cookie and browser Origin for mutation proxies", () => {
    const request = new Request("http://localhost:3002/api/catalog-brand-logo", {
      method: "POST",
      headers: {
        cookie: "itmarket_staff_access=token",
        origin: "http://localhost:3002",
      },
    });

    expect(staffApiProxyHeaders(request)).toEqual({
      cookie: "itmarket_staff_access=token",
      origin: "http://localhost:3002",
    });
  });

  it("sets Sec-Fetch-Site when Origin is missing", () => {
    const request = new Request("http://localhost:3002/api/catalog-brand-logo", {
      method: "POST",
      headers: {
        cookie: "itmarket_staff_access=token",
      },
    });

    expect(staffApiProxyHeaders(request)).toEqual({
      cookie: "itmarket_staff_access=token",
      "sec-fetch-site": "same-site",
    });
  });

  it("omits cookie when absent", () => {
    const request = new Request("http://localhost:3002/api/catalog-brand-logo", {
      method: "POST",
      headers: {
        origin: "http://localhost:3002",
      },
    });

    expect(staffApiProxyHeaders(request)).toEqual({
      origin: "http://localhost:3002",
    });
  });
});
