import { notFound } from "next/navigation";

import { ApiError, getProduct, type ProductDetail } from "@/lib/api";
import { redirectIfCatalogSlugMoved } from "@/lib/catalog-slug-redirect";

export async function loadStorefrontProduct(
  slug: string,
): Promise<ProductDetail> {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectIfCatalogSlugMoved("product", slug);
      notFound();
    }
    throw error;
  }
}
