export const PRODUCT_MEDIA_STORAGE = Symbol('PRODUCT_MEDIA_STORAGE');

export const PRODUCT_MEDIA_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ProductMediaMimeType = (typeof PRODUCT_MEDIA_ALLOWED_MIME)[number];

export const PRODUCT_MEDIA_MAX_BYTES = 5_000_000;

export type ProductMediaUploadRequest = {
  productId: string;
  fileName: string;
  mimeType: ProductMediaMimeType;
  byteSize: number;
  checksumSha256: string;
};

export type ProductMediaUploadIntent = {
  objectKey: string;
  method: 'PUT';
  signedUrl: string;
  expiresAt: Date;
  requiredHeaders: Record<string, string>;
};

export type ProductMediaPutObjectRequest = {
  objectKey: string;
  mimeType: ProductMediaMimeType;
  body: Buffer;
  byteSize: number;
  checksumSha256: string;
};

/**
 * Infrastructure adapters must target a private bucket. The signed URL is
 * short-lived and the adapter must constrain MIME, size and checksum.
 */
export interface ProductMediaStorage {
  createUploadIntent(
    request: ProductMediaUploadRequest,
  ): Promise<ProductMediaUploadIntent>;
  putObject(request: ProductMediaPutObjectRequest): Promise<void>;
  createReadUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}

export function isProductMediaMimeType(
  value: string,
): value is ProductMediaMimeType {
  return (PRODUCT_MEDIA_ALLOWED_MIME as readonly string[]).includes(value);
}

export function extensionForProductMediaMime(
  mimeType: ProductMediaMimeType,
): string {
  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

export function assertProductMediaConstraints(input: {
  mimeType: string;
  byteSize: number;
}): asserts input is { mimeType: ProductMediaMimeType; byteSize: number } {
  if (!isProductMediaMimeType(input.mimeType)) {
    throw new Error('Unsupported media MIME type');
  }
  if (
    !Number.isInteger(input.byteSize) ||
    input.byteSize < 1 ||
    input.byteSize > PRODUCT_MEDIA_MAX_BYTES
  ) {
    throw new Error('Unsupported media byte size');
  }
}
