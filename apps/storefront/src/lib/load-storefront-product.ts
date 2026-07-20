import { ApiError, getProduct, type ProductDetail } from "@/lib/api";
import { notFound } from "next/navigation";

export async function loadStorefrontProduct(
  slug: string,
): Promise<ProductDetail> {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
    throw error;
  }
}
