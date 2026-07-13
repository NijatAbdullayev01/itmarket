import type { MetadataRoute } from "next";

import { getStorefrontOrigin } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = getStorefrontOrigin();

  if (!origin) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: origin.origin,
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}
