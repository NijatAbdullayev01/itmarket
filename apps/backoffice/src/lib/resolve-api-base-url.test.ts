import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./resolve-api-base-url";

describe("resolveApiBaseUrl", () => {
  it("keeps configured localhost when UI also uses localhost", () => {
    expect(
      resolveApiBaseUrl("http://localhost:3001/api/v1", {
        protocol: "http:",
        hostname: "localhost",
      }),
    ).toBe("http://localhost:3001/api/v1");
  });

  it("rewrites configured localhost to 127.0.0.1 when UI uses 127.0.0.1", () => {
    expect(
      resolveApiBaseUrl("http://localhost:3001/api/v1", {
        protocol: "http:",
        hostname: "127.0.0.1",
      }),
    ).toBe("http://127.0.0.1:3001/api/v1");
  });

  it("derives API URL from the UI hostname when env is missing", () => {
    expect(
      resolveApiBaseUrl(undefined, {
        protocol: "http:",
        hostname: "127.0.0.1",
      }),
    ).toBe("http://127.0.0.1:3001/api/v1");
  });
});
