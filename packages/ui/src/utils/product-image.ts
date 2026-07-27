export type ProductMedia = {
  id: string;
  objectKey: string;
  /** Resolved read URL (signed S3 or local public path). Prefer over objectKey. */
  url?: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
};

export const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

function isBrowsableMediaUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

export function getProductImageUrl(
  image: ProductMedia | null | undefined,
): string {
  if (image === null || image === undefined) {
    return PRODUCT_PLACEHOLDER;
  }
  if (image.url !== undefined && isBrowsableMediaUrl(image.url)) {
    return image.url;
  }
  if (isBrowsableMediaUrl(image.objectKey)) {
    return image.objectKey;
  }
  return PRODUCT_PLACEHOLDER;
}

export function getProductImageAlt(
  image: ProductMedia | null | undefined,
  productName: string,
): string {
  if (image?.altText?.trim()) {
    return image.altText;
  }
  return productName;
}
