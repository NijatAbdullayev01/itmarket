import { listProducts, type ProductSummary } from "@/lib/api";
import { buildMerchantFeedXml } from "@/lib/google-merchant-feed";
import { getStorefrontOrigin } from "@/lib/site-origin";

/** Keep below API media signed-URL TTL (1h) so feed image_link values stay valid. */
export const revalidate = 1800;

const FEED_PAGE_LIMIT = 50;
const FEED_MAX_PAGES = 400;

async function collectCatalogVariants(): Promise<ProductSummary[]> {
  const items: ProductSummary[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < FEED_MAX_PAGES; page += 1) {
    const products = await listProducts({
      limit: FEED_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...products.items);
    if (!products.nextCursor) {
      break;
    }
    cursor = products.nextCursor;
  }

  return items;
}

export async function GET() {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return new Response("Storefront origin is not configured", { status: 503 });
  }

  let items: ProductSummary[] = [];
  try {
    items = await collectCatalogVariants();
  } catch {
    return new Response("Catalog unavailable", { status: 503 });
  }

  const body = buildMerchantFeedXml(origin, items);

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
