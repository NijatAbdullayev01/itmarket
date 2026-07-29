import type { MetadataRoute } from "next";

import { PRIVATE_ROBOTS_DISALLOW } from "@/lib/seo";
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
      disallow: [...PRIVATE_ROBOTS_DISALLOW],
    },
    host: origin.host,
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}
