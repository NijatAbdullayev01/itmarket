import { buildCombinedSitemapEntries } from "@/lib/sitemap-catalog";
import { getStorefrontOrigin } from "@/lib/site-origin";
import { toUrlsetXml } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Emit a urlset at `/sitemap.xml` (not a sitemapindex).
 * Google Search Console already fetches this path; nested `/sitemap/0.xml`
 * children were reported as "couldn't fetch" after the WordPress migration.
 */
export async function GET() {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return new Response("Storefront origin is not configured", { status: 503 });
  }

  const entries = await buildCombinedSitemapEntries(origin);
  return new Response(toUrlsetXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
