import type { ProductMediaStorage } from './media-storage.port';

/** Signed / public read URL lifetime for catalog responses (6 hours).
 * Long enough for Merchant feed cache (s-maxage 30m) + crawler lag;
 * still within S3 presign max (7d). */
export const MEDIA_READ_URL_TTL_SECONDS = 6 * 60 * 60;

export type MediaReadSource = {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder?: number;
};

export type MediaWithReadUrl = {
  id: string;
  objectKey: string;
  url: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
};

export async function withMediaReadUrl(
  storage: ProductMediaStorage,
  media: MediaReadSource | null | undefined,
): Promise<MediaWithReadUrl | null> {
  if (media === null || media === undefined) {
    return null;
  }

  const url = await storage.createReadUrl(
    media.objectKey,
    MEDIA_READ_URL_TTL_SECONDS,
  );
  return {
    id: media.id,
    objectKey: media.objectKey,
    url,
    altText: media.altText,
    mimeType: media.mimeType,
    byteSize: media.byteSize,
    sortOrder: media.sortOrder ?? 0,
  };
}

export async function withMediaReadUrlList(
  storage: ProductMediaStorage,
  media: MediaReadSource[],
): Promise<MediaWithReadUrl[]> {
  return Promise.all(
    media.map(async (entry) => {
      const mapped = await withMediaReadUrl(storage, entry);
      if (mapped === null) {
        throw new Error('Unexpected null media mapping');
      }
      return mapped;
    }),
  );
}
