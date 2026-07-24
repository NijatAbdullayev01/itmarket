export type CatalogBannerImageUploadMeta = {
  objectKey: string;
  mimeType: string;
  byteSize: number;
};

export async function uploadCatalogBannerImageFile(
  file: File,
): Promise<CatalogBannerImageUploadMeta> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/catalog-banner-image", {
    method: "POST",
    body,
  });
  const payload = (await response.json()) as {
    message?: string;
    objectKey?: string;
    mimeType?: string;
    byteSize?: number;
  };
  if (!response.ok) {
    throw new Error(payload.message ?? "Banner şəkli yüklənmədi");
  }
  if (
    payload.objectKey === undefined ||
    payload.mimeType === undefined ||
    payload.byteSize === undefined
  ) {
    throw new Error("Banner yükləmə cavabı natamamdır");
  }
  return {
    objectKey: payload.objectKey,
    mimeType: payload.mimeType,
    byteSize: payload.byteSize,
  };
}
