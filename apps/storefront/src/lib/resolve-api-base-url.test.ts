import { describe, expect, it } from "vitest";

import { BROWSER_API_BASE, resolveApiBaseUrl } from "./resolve-api-base-url";

describe("resolveApiBaseUrl", () => {
  it("uses same-origin proxy in the browser", () => {
    expect(
      resolveApiBaseUrl("http://localhost:3001/api/v1", {
        protocol: "http:",
        hostname: "localhost",
      }),
    ).toBe(BROWSER_API_BASE);
  });

  it("uses configured absolute URL on the server", () => {
    expect(resolveApiBaseUrl("http://localhost:3001/api/v1")).toBe(
      "http://localhost:3001/api/v1",
    );
  });

  it("falls back to the default API base on the server", () => {
    expect(resolveApiBaseUrl(undefined)).toBe(
      "http://127.0.0.1:3001/api/v1",
    );
  });
});
