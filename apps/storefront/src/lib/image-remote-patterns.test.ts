import { describe, expect, it } from "vitest";

import { imageRemotePatterns } from "./image-remote-patterns";

describe("imageRemotePatterns", () => {
  it("keeps local MinIO and HTTPS CDN hosts in production", () => {
    const patterns = imageRemotePatterns("cdn.example.com", "production");
    expect(patterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hostname: "localhost", protocol: "http" }),
        expect.objectContaining({
          hostname: "cdn.example.com",
          protocol: "https",
        }),
      ]),
    );
    expect(
      patterns.some(
        (pattern) =>
          pattern.hostname === "cdn.example.com" && pattern.protocol === "http",
      ),
    ).toBe(false);
  });

  it("rejects loopback and IP CDN hosts in production", () => {
    const patterns = imageRemotePatterns("127.0.0.1,10.0.0.5", "production");
    expect(
      patterns.some((pattern) => pattern.hostname === "10.0.0.5"),
    ).toBe(false);
  });

  it("allows HTTP CDN hosts outside production", () => {
    const patterns = imageRemotePatterns("cdn.example.com", "development");
    expect(
      patterns.some(
        (pattern) =>
          pattern.hostname === "cdn.example.com" && pattern.protocol === "http",
      ),
    ).toBe(true);
  });
});
