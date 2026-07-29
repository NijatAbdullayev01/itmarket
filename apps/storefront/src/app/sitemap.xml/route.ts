import { listSitemapIds } from "@/lib/sitemap-catalog";
import { getStorefrontOrigin } from "@/lib/site-origin";

export const revalidate = 3600;

/**
 * Next.js `generateSitemaps` only serves `/sitemap/[id].xml` urlsets — it does
 * not emit a `<sitemapindex>` at `/sitemap.xml`. Google expects an index when
 * robots.txt points at `/sitemap.xml`.
 */
export async function GET() {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return new Response("Storefront origin is not configured", { status: 503 });
  }

  const sitemaps = await listSitemapIds();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map((entry) => {
    const loc = new URL(`/sitemap/${entry.id}.xml`, origin).href;
    return `  <sitemap>
    <loc>${loc}</loc>
  </sitemap>`;
  })
  .join("\n")}
</sitemapindex>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
