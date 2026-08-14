import type { ProductMediaStorage } from './media-storage.port';

/** Signed / public read URL lifetime for catalog responses (6 hours).
 * Long enough for Merchant feed cache (s-maxage 30m) + crawler lag;
 * still within S3 presign max (7d). */
export const MEDIA_READ_URL_TTL_SECONDS = 6 * 60 * 60;

/** Refresh signed URLs this long before expiry so list cards never serve a stale link. */
const MEDIA_READ_URL_CACHE_SKEW_MS = 5 * 60 * 1000;

const MEDIA_READ_URL_CACHE_MAX = 4_000;

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

type CachedReadUrl = {
  url: string;
  expiresAt: number;
};

const readUrlCache = new Map<string, CachedReadUrl>();
const inflightReadUrls = new Map<string, Promise<string>>();

export function isPublicMediaObjectKey(objectKey: string): boolean {
  return (
    objectKey.startsWith('/') ||
    objectKey.startsWith('http://') ||
    objectKey.startsWith('https://')
  );
}

export function resetMediaReadUrlCache() {
  readUrlCache.clear();
  inflightReadUrls.clear();
}

function rememberReadUrl(objectKey: string, url: string, now: number) {
  if (readUrlCache.size >= MEDIA_READ_URL_CACHE_MAX) {
    const oldest = readUrlCache.keys().next().value;
    if (oldest !== undefined) {
      readUrlCache.delete(oldest);
    }
  }
  readUrlCache.set(objectKey, {
    url,
    expiresAt: now + MEDIA_READ_URL_TTL_SECONDS * 1000,
  });
}

async function resolveMediaReadUrl(
  storage: ProductMediaStorage,
  objectKey: string,
): Promise<string> {
  if (isPublicMediaObjectKey(objectKey)) {
    return objectKey;
  }

  const now = Date.now();
  const cached = readUrlCache.get(objectKey);
  if (
    cached !== undefined &&
    cached.expiresAt - MEDIA_READ_URL_CACHE_SKEW_MS > now
  ) {
    return cached.url;
  }

  const inflight = inflightReadUrls.get(objectKey);
  if (inflight !== undefined) {
    return inflight;
  }

  const pending = storage
    .createReadUrl(objectKey, MEDIA_READ_URL_TTL_SECONDS)
    .then((url) => {
      rememberReadUrl(objectKey, url, Date.now());
      return url;
    })
    .finally(() => {
      inflightReadUrls.delete(objectKey);
    });
  inflightReadUrls.set(objectKey, pending);
  return pending;
}

export async function withMediaReadUrl(
  storage: ProductMediaStorage,
  media: MediaReadSource | null | undefined,
): Promise<MediaWithReadUrl | null> {
  if (media === null || media === undefined) {
    return null;
  }

  const url = await resolveMediaReadUrl(storage, media.objectKey);
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
