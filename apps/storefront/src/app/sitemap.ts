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
    const seenSlugs = new Set<string>();
    for (const product of products.items) {
      if (seenSlugs.has(product.slug)) {
        continue;
      }
      seenSlugs.add(product.slug);
      entries.push({
        url: new URL(`/products/${product.slug}`, origin).href,
        changeFrequency: "daily" as const,
        priority: 0.7,
      });
    }
  } catch {
    return entries;
  }

  return entries;
}
