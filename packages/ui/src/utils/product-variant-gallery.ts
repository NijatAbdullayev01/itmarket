import type { ProductMedia } from "./product-image";

export type VariantImageSource = Pick<
  ProductMedia,
  "id" | "objectKey" | "altText" | "mimeType" | "byteSize"
> & { url?: string; sortOrder?: number };

export function toProductMedia(
  image: VariantImageSource | null | undefined,
): ProductMedia | null {
  if (image === null || image === undefined) {
    return null;
  }
  return {
    id: image.id,
    objectKey: image.objectKey,
    ...(image.url === undefined ? {} : { url: image.url }),
    altText: image.altText,
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    sortOrder: image.sortOrder ?? 0,
  };
}

/** Gallery for PDP: variant-specific images when set, otherwise product-level media. */
export function resolveProductGalleryMedia(
  productMedia: ProductMedia[],
  variantImages:
    | VariantImageSource
    | VariantImageSource[]
    | null
    | undefined,
): ProductMedia[] {
  const sources = Array.isArray(variantImages)
    ? variantImages
    : variantImages
      ? [variantImages]
      : [];
  const variantMedia = sources
    .map((entry) => toProductMedia(entry))
    .filter((entry): entry is ProductMedia => entry !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  if (variantMedia.length > 0) {
    return variantMedia;
  }
  return productMedia;
}
