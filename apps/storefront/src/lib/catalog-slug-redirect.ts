import { permanentRedirect } from "next/navigation";

import {
  ApiError,
  ApiUnavailableError,
  getCatalogSlugRedirect,
  type CatalogSlugEntityType,
} from "@/lib/api";

function entityPathPrefix(entityType: CatalogSlugEntityType): string {
  if (entityType === "product") {
    return "/products";
  }
  if (entityType === "category") {
    return "/categories";
  }
  return "/brands";
}

/**
 * If an old catalog slug was renamed or archived, issue a permanent redirect
 * (308) to the current path (or archive targetPath). Returns false when no
 * redirect exists.
 */
export async function redirectIfCatalogSlugMoved(
  entityType: CatalogSlugEntityType,
  slug: string,
): Promise<boolean> {
  try {
    const redirect = await getCatalogSlugRedirect(entityType, slug);
    const target = redirect.path?.trim();
    if (!target) {
      return false;
    }
    const currentPath = `${entityPathPrefix(entityType)}/${slug}`;
    if (target !== currentPath) {
      permanentRedirect(target);
    }
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return false;
    }
    if (error instanceof ApiUnavailableError) {
      return false;
    }
    throw error;
  }
  return false;
}
