export type CatalogProductImageUploadMeta = {
  objectKey: string;
  mimeType: string;
  byteSize: number;
};

export async function uploadCatalogProductImageFile(
  file: File,
): Promise<CatalogProductImageUploadMeta> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/catalog-product-image", {
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
    throw new Error(payload.message ?? "Şəkil yüklənmədi");
  }
  if (
    payload.objectKey === undefined ||
    payload.mimeType === undefined ||
    payload.byteSize === undefined
  ) {
    throw new Error("Şəkil yükləmə cavabı natamamdır");
  }
  return {
    objectKey: payload.objectKey,
    mimeType: payload.mimeType,
    byteSize: payload.byteSize,
  };
}
