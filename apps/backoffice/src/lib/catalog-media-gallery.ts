export const CATALOG_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const CATALOG_IMAGE_MAX_BYTES = 5_000_000;
export const CATALOG_IMAGE_MAX_COUNT = 12;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CatalogGalleryPendingItem = {
  key: string;
  kind: "pending";
  file: File;
};

export type CatalogGalleryExistingItem = {
  key: string;
  kind: "existing";
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
  url?: string;
};

export type CatalogGalleryItem =
  | CatalogGalleryPendingItem
  | CatalogGalleryExistingItem;

export function createCatalogGalleryPendingKey() {
  return `pending-${crypto.randomUUID()}`;
}

export function validateCatalogImageFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type) || file.size > CATALOG_IMAGE_MAX_BYTES) {
    return "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur";
  }
  return null;
}

export function catalogGalleryFromExistingMedia(
  media: Array<{
    id: string;
    objectKey: string;
    altText: string;
    mimeType: string;
    byteSize: number;
    sortOrder: number;
    url?: string;
  }>,
): CatalogGalleryExistingItem[] {
  return [...media]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((entry) => ({
      key: `existing-${entry.id}`,
      kind: "existing" as const,
      id: entry.id,
      objectKey: entry.objectKey,
      altText: entry.altText,
      mimeType: entry.mimeType,
      byteSize: entry.byteSize,
      sortOrder: entry.sortOrder,
      ...(entry.url === undefined ? {} : { url: entry.url }),
    }));
}

export function moveCatalogGalleryItem(
  items: CatalogGalleryItem[],
  key: string,
  direction: -1 | 1,
): CatalogGalleryItem[] {
  const index = items.findIndex((item) => item.key === key);
  if (index < 0) {
    return items;
  }
  const target = index + direction;
  if (target < 0 || target >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function appendCatalogGalleryFiles(
  items: CatalogGalleryItem[],
  files: FileList | File[],
): { items: CatalogGalleryItem[]; error?: string } {
  const list = Array.from(files);
  if (list.length === 0) {
    return { items };
  }

  const remaining = CATALOG_IMAGE_MAX_COUNT - items.length;
  if (remaining <= 0) {
    return {
      items,
      error: `Maksimum ${CATALOG_IMAGE_MAX_COUNT} şəkil əlavə edilə bilər`,
    };
  }

  const accepted: CatalogGalleryPendingItem[] = [];
  for (const file of list.slice(0, remaining)) {
    const error = validateCatalogImageFile(file);
    if (error !== null) {
      return { items, error };
    }
    accepted.push({
      key: createCatalogGalleryPendingKey(),
      kind: "pending",
      file,
    });
  }

  return { items: [...items, ...accepted] };
}

export function catalogGalleryPendingFiles(items: CatalogGalleryItem[]): File[] {
  return items
    .filter((item): item is CatalogGalleryPendingItem => item.kind === "pending")
    .map((item) => item.file);
}

export function catalogGalleryExistingIds(items: CatalogGalleryItem[]): string[] {
  return items
    .filter(
      (item): item is CatalogGalleryExistingItem => item.kind === "existing",
    )
    .map((item) => item.id);
}
