export type ProductMediaUploadRequest = {
  productId: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
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

/**
 * Infrastructure adapters must target a private bucket. The signed URL is
 * short-lived and the adapter must constrain MIME, size and checksum.
 */
export interface ProductMediaStorage {
  createUploadIntent(
    request: ProductMediaUploadRequest,
  ): Promise<ProductMediaUploadIntent>;
  createReadUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}
