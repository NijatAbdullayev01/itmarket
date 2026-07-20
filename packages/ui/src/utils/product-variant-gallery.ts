import type { ProductMedia } from "./product-image";

export type VariantImageSource = Pick<
  ProductMedia,
  "id" | "objectKey" | "altText" | "mimeType" | "byteSize"
> & { sortOrder?: number };

export function toProductMedia(
  image: VariantImageSource | null | undefined,
): ProductMedia | null {
  if (image === null || image === undefined) {
    return null;
  }
  return {
    id: image.id,
    objectKey: image.objectKey,
    altText: image.altText,
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    sortOrder: image.sortOrder ?? 0,
  };
}

/** Gallery for PDP: variant-specific image when set, otherwise product-level media. */
export function resolveProductGalleryMedia(
  productMedia: ProductMedia[],
  variantImage: VariantImageSource | null | undefined,
): ProductMedia[] {
  const variantMedia = toProductMedia(variantImage);
  if (variantMedia !== null) {
    return [variantMedia];
  }
  return productMedia;
}
