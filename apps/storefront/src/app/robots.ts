import type { MetadataRoute } from "next";

import { PRIVATE_ROBOTS_DISALLOW } from "@/lib/seo";
import { getStorefrontOrigin } from "@/lib/site-origin";

// Build zamanı env olmasa (məs. CI/CD) robots.txt `Disallow: /` kimi
// statik sobranırdı və Google bütün saytı qapalı görürdü. Sitemap.xml ilə
// eyni davranış üçün runtime-da qiymətləndirilsin.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
