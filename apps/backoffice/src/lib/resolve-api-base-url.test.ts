import { describe, expect, it } from "vitest";

import {
  BROWSER_API_BASE,
  resolveApiBaseUrl,
} from "./resolve-api-base-url";

describe("resolveApiBaseUrl", () => {
  it("uses same-origin proxy path in the browser", () => {
    expect(
      resolveApiBaseUrl("http://localhost:3001/api/v1", {
        protocol: "http:",
        hostname: "localhost",
      }),
    ).toBe(BROWSER_API_BASE);
  });

  it("uses same-origin proxy path for 127.0.0.1 UI hosts", () => {
    expect(
      resolveApiBaseUrl("http://localhost:3001/api/v1", {
        protocol: "http:",
        hostname: "127.0.0.1",
      }),
    ).toBe(BROWSER_API_BASE);
  });

  it("uses configured URL on the server when env is set", () => {
    expect(resolveApiBaseUrl("http://localhost:3001/api/v1")).toBe(
      "http://localhost:3001/api/v1",
    );
  });

  it("falls back to loopback API URL on the server when env is missing", () => {
    expect(resolveApiBaseUrl(undefined)).toBe(
      "http://127.0.0.1:3001/api/v1",
    );
  });
});
