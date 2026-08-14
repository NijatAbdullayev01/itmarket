import { listCategories, listProducts, type ProductSummary } from "@/lib/api";
import { buildMerchantFeedXml } from "@/lib/google-merchant-feed";
import { getStorefrontOrigin } from "@/lib/site-origin";

/**
 * Keep well below API media signed-URL TTL (6h) so feed image_link values
 * stay valid until the next regeneration. Prefer public objectKey paths in
 * the feed builder when available.
 */
export const revalidate = 1800;

/** API catalog `limit` max is 50. */
const FEED_PAGE_LIMIT = 50;
/**
 * Safety ceiling: 50 × 2000 = 100k variant rows.
 * If hit, response includes X-Feed-Truncated and an XML comment.
 */
const FEED_MAX_PAGES = 2000;

export type MerchantFeedCollection = {
  items: ProductSummary[];
  truncated: boolean;
};

export async function collectCatalogVariants(): Promise<MerchantFeedCollection> {
  const items: ProductSummary[] = [];
  let cursor: string | undefined;
  let truncated = false;

  for (let page = 0; page < FEED_MAX_PAGES; page += 1) {
    const products = await listProducts({
      limit: FEED_PAGE_LIMIT,
      gallery: true,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...products.items);
    if (!products.nextCursor) {
      return { items, truncated: false };
    }
    cursor = products.nextCursor;
  }

  truncated = true;
  console.error(
    `[google-merchant-feed] truncated after ${FEED_MAX_PAGES} pages (${items.length} rows); remaining cursor present`,
  );
  return { items, truncated };
}

export async function GET() {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return new Response("Storefront origin is not configured", { status: 503 });
  }

  let collection: MerchantFeedCollection = { items: [], truncated: false };
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    const [variants, cats] = await Promise.all([
      collectCatalogVariants(),
      listCategories().catch(() => []),
    ]);
    collection = variants;
    categories = cats;
  } catch {
    return new Response("Catalog unavailable", { status: 503 });
  }

  const body = buildMerchantFeedXml(origin, collection.items, {
    categories,
    truncated: collection.truncated,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      ...(collection.truncated
        ? { "X-Feed-Truncated": "1" }
        : {}),
    },
  });
}
