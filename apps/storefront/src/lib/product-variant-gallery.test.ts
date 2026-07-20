import { describe, expect, it } from "vitest";

import {
  resolveProductGalleryMedia,
  type ProductMedia,
} from "@itmarket/ui";

const productMedia: ProductMedia[] = [
  {
    id: "product-1",
    objectKey: "/images/catalog/product.png",
    altText: "Product",
    mimeType: "image/png",
    byteSize: 100,
    sortOrder: 0,
  },
];

const variantMedia: ProductMedia = {
  id: "variant-1",
  objectKey: "/images/catalog/variant.png",
  altText: "Variant",
  mimeType: "image/png",
  byteSize: 100,
  sortOrder: 0,
};

describe("resolveProductGalleryMedia", () => {
  it("prefers variant image when present", () => {
    expect(resolveProductGalleryMedia(productMedia, variantMedia)).toEqual([
      variantMedia,
    ]);
  });

  it("falls back to product media when variant image is missing", () => {
    expect(resolveProductGalleryMedia(productMedia, null)).toEqual(productMedia);
  });
});
