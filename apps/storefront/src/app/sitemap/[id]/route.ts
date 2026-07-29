import {
  buildStaticAndTaxonomyEntries,
  collectCatalogWalk,
  PRODUCTS_PER_SITEMAP,
} from "@/lib/sitemap-catalog";
import { resolveSitemapId } from "@/lib/sitemap-id";
import { getStorefrontOrigin } from "@/lib/site-origin";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toUrlsetXml(
  entries: Array<{
    url: string;
    lastModified?: Date;
    changeFrequency?: string;
    priority?: number;
  }>,
): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `\n<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : "";
      const changefreq = entry.changeFrequency
        ? `\n<changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const priority =
        entry.priority !== undefined
          ? `\n<priority>${entry.priority}</priority>`
          : "";
      return `<url>
<loc>${escapeXml(entry.url)}</loc>${lastmod}${changefreq}${priority}
</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * Chunk sitemaps at `/sitemap/0.xml`, `/sitemap/1.xml`, …
 * (Replaces Next metadata `sitemap.ts` + generateSitemaps so `/sitemap.xml`
 * can own the sitemapindex without a duplicate-route conflict.)
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
    let entries: Array<{
      url: string;
      lastModified?: Date;
      changeFrequency?: string;
      priority?: number;
    }> = [];

    if (id === 0) {
      entries = await buildStaticAndTaxonomyEntries(origin, walk);
    } else if (walk.products.length > 0) {
      const start = (id - 1) * PRODUCTS_PER_SITEMAP;
      const slice = walk.products.slice(start, start + PRODUCTS_PER_SITEMAP);
      entries = slice.map((product) => ({
        url: new URL(`/products/${product.slug}`, origin).href,
        ...(product.lastModified ? { lastModified: product.lastModified } : {}),
        changeFrequency: "daily",
        priority: 0.7,
      }));
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
