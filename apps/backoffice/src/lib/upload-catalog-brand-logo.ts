import { rotateStaffSession } from "./rotate-staff-session";

export type CatalogBrandLogoUploadMeta = {
  objectKey: string;
  mimeType: string;
  byteSize: number;
};

type UploadOptions = {
  skipAuthRetry?: boolean;
};

export async function uploadCatalogBrandLogoFile(
  file: File,
  options?: UploadOptions,
): Promise<CatalogBrandLogoUploadMeta> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/catalog-brand-logo", {
    method: "POST",
    credentials: "include",
    body,
  });
  const payload = (await response.json()) as {
    message?: string;
    objectKey?: string;
    mimeType?: string;
    byteSize?: number;
  };

  if (response.status === 401 && !options?.skipAuthRetry) {
    const rotated = await rotateStaffSession();
    if (rotated) {
      return uploadCatalogBrandLogoFile(file, { skipAuthRetry: true });
    }
  }

  if (!response.ok) {
    throw new Error(payload.message ?? "Logo yüklənmədi");
  }
  if (
    payload.objectKey === undefined ||
    payload.mimeType === undefined ||
    payload.byteSize === undefined
  ) {
    throw new Error("Logo yükləmə cavabı natamamdır");
  }
  return {
    objectKey: payload.objectKey,
    mimeType: payload.mimeType,
    byteSize: payload.byteSize,
  };
}
