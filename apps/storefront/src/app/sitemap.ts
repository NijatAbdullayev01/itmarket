import type { MetadataRoute } from "next";

import { listProducts } from "@/lib/api";
import { getStorefrontOrigin } from "@/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getStorefrontOrigin();

  if (!origin) {
    return [];
  }

  const entries: MetadataRoute.Sitemap = [
    {
      url: origin.href,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    const products = await listProducts();
    entries.push(
      ...products.items.map((product) => ({
        url: new URL(`/products/${product.slug}`, origin).href,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    );
  } catch {
    return entries;
  }

  return entries;
}
