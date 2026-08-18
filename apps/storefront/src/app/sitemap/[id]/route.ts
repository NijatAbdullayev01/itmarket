import {
  buildProductSitemapEntries,
  buildStaticAndTaxonomyEntries,
  collectCatalogWalk,
  PRODUCTS_PER_SITEMAP,
} from "@/lib/sitemap-catalog";
import { resolveSitemapId } from "@/lib/sitemap-id";
import { getStorefrontOrigin } from "@/lib/site-origin";
import { toUrlsetXml, type SitemapUrlEntry } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Chunk sitemaps at `/sitemap/0.xml`, `/sitemap/1.xml`, …
 * Kept so previously submitted child URLs still resolve; `/sitemap.xml` is
 * the canonical urlset for Search Console.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return new Response("Storefront origin is not configured", { status: 503 });
  }

  const rawId = (await context.params).id;
  if (!rawId.endsWith(".xml")) {
    return new Response("Not Found", { status: 404 });
  }

  const id = resolveSitemapId(rawId.slice(0, -4));
  if (!Number.isFinite(id) || id < 0) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const walk = await collectCatalogWalk();
    let entries: SitemapUrlEntry[] = [];

    if (id === 0) {
      entries = await buildStaticAndTaxonomyEntries(origin, walk);
    } else if (walk.products.length > 0) {
      const start = (id - 1) * PRODUCTS_PER_SITEMAP;
      entries = buildProductSitemapEntries(origin, {
        ...walk,
        products: walk.products.slice(start, start + PRODUCTS_PER_SITEMAP),
      });
    }

    if (entries.length === 0 && id !== 0) {
      return new Response("Not Found", { status: 404 });
    }

    return new Response(toUrlsetXml(entries), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    if (id === 0) {
      const fallback = await buildStaticAndTaxonomyEntries(origin, {
        products: [],
        categoryCounts: new Map(),
        brandCounts: new Map(),
      });
      return new Response(toUrlsetXml(fallback), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }
    return new Response("Sitemap unavailable", { status: 503 });
  }
}
