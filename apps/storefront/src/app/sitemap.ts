import type { MetadataRoute } from "next";

import { getStorefrontOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getStorefrontOrigin();

  if (!origin) {
    return [];
  }

  return [
    {
      url: origin.href,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
