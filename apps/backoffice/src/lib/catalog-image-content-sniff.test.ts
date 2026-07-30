import { describe, expect, it } from "vitest";

import {
  hasTrailingExecutablePolyglot,
  resolveCatalogImageMime,
} from "./catalog-image-content-sniff";

function fixtureJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

describe("catalog-image-content-sniff", () => {
  it("accepts a minimal jpeg", () => {
    expect(
      resolveCatalogImageMime({
        body: fixtureJpeg(),
        declaredMimeType: "image/jpeg",
      }),
    ).toBe("image/jpeg");
  });

  it("ignores octet-stream and accepts image/jpg alias", () => {
    expect(
      resolveCatalogImageMime({
        body: fixtureJpeg(),
        declaredMimeType: "application/octet-stream",
      }),
    ).toBe("image/jpeg");
    expect(
      resolveCatalogImageMime({
        body: fixtureJpeg(),
        declaredMimeType: "image/jpg",
      }),
    ).toBe("image/jpeg");
  });

  it("rejects trailing PE polyglot after JPEG EOI", () => {
    const polyglot = Buffer.concat([
      fixtureJpeg(),
      Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    ]);
    expect(hasTrailingExecutablePolyglot(polyglot, "image/jpeg")).toBe(true);
    expect(() =>
      resolveCatalogImageMime({
        body: polyglot,
        declaredMimeType: "image/jpeg",
      }),
    ).toThrow(/embedded executable/i);
  });
});
