export type ProductMedia = {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
};

export const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

export function getProductImageUrl(
  image: ProductMedia | null | undefined,
): string {
  if (image === null || image === undefined) {
    return PRODUCT_PLACEHOLDER;
  }
  if (
    image.objectKey.startsWith("http://") ||
    image.objectKey.startsWith("https://") ||
    image.objectKey.startsWith("/")
  ) {
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
