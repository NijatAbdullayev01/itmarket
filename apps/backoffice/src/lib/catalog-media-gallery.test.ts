import { describe, expect, it } from "vitest";

import {
  appendCatalogGalleryFiles,
  catalogGalleryFromExistingMedia,
  moveCatalogGalleryItem,
  type CatalogGalleryItem,
} from "./catalog-media-gallery";

function pending(key: string): CatalogGalleryItem {
  return {
    key,
    kind: "pending",
    file: new File(["x"], `${key}.png`, { type: "image/png" }),
  };
}

describe("catalog-media-gallery", () => {
  it("moves items within bounds", () => {
    const items = [pending("a"), pending("b"), pending("c")];
    expect(moveCatalogGalleryItem(items, "a", 1).map((item) => item.key)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(moveCatalogGalleryItem(items, "a", -1)).toEqual(items);
    expect(moveCatalogGalleryItem(items, "c", 1)).toEqual(items);
  });

  it("sorts existing media by sortOrder", () => {
    const items = catalogGalleryFromExistingMedia([
      {
        id: "2",
        objectKey: "b.jpg",
        altText: "B",
        mimeType: "image/jpeg",
        byteSize: 1,
        sortOrder: 2,
      },
      {
        id: "1",
        objectKey: "a.jpg",
        altText: "A",
        mimeType: "image/jpeg",
        byteSize: 1,
        sortOrder: 0,
      },
    ]);
    expect(items.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("rejects oversized or wrong mime files", () => {
    const bad = new File(["x"], "x.gif", { type: "image/gif" });
    const result = appendCatalogGalleryFiles([], [bad]);
    expect(result.error).toMatch(/JPEG/);
    expect(result.items).toEqual([]);
  });
});
