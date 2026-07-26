import type { MetadataRoute } from "next";

import { listBrands, listCategories, listProducts } from "@/lib/api";
import { getStorefrontOrigin } from "@/lib/site-origin";

const SITEMAP_PAGE_LIMIT = 50;
const SITEMAP_MAX_PAGES = 400;
/** Must match category/brand landing page size for `?page=` discovery. */
const CATALOG_LANDING_PAGE_SIZE = 24;

async function collectProductEntries(): Promise<
  { slug: string; lastModified?: Date }[]
> {
  const bySlug = new Map<string, Date | undefined>();
  let cursor: string | undefined;

  for (let page = 0; page < SITEMAP_MAX_PAGES; page += 1) {
    const products = await listProducts({
      limit: SITEMAP_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });

    for (const product of products.items) {
      const updatedAt = product.updatedAt
        ? new Date(product.updatedAt)
        : undefined;
      const existing = bySlug.get(product.slug);
      if (
        !existing ||
        (updatedAt !== undefined && updatedAt.getTime() > existing.getTime())
      ) {
        bySlug.set(product.slug, updatedAt);
      }
    }

    if (!products.nextCursor) {
      break;
    }
    cursor = products.nextCursor;
  }

  return [...bySlug.entries()].map(([slug, lastModified]) => ({
    slug,
    lastModified,
  }));
}

async function resolveLandingTotalPages(filter: {
  category?: string;
  brand?: string;
}): Promise<number> {
  try {
    const result = await listProducts({
      ...filter,
      limit: CATALOG_LANDING_PAGE_SIZE,
      page: 1,
    });
    const totalPages = result.totalPages ?? 1;
    return Number.isFinite(totalPages) && totalPages > 1 ? totalPages : 1;
  } catch {
    return 1;
  }
}

function pushPaginatedLandingEntries(
  entries: MetadataRoute.Sitemap,
  origin: URL,
  basePath: string,
  totalPages: number,
  lastModified: Date,
  priority: number,
) {
  for (let page = 2; page <= totalPages; page += 1) {
    entries.push({
      url: new URL(`${basePath}?page=${page}`, origin).href,
      lastModified,
      changeFrequency: "weekly",
      priority,
    });
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getStorefrontOrigin();

  if (!origin) {
    return [];
  }

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: origin.href,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/terms", origin).href,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/privacy", origin).href,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const categories = await listCategories();
    for (const category of categories) {
      const lastModified = category.updatedAt
        ? new Date(category.updatedAt)
        : now;
      const basePath = `/categories/${category.slug}`;
      entries.push({
        url: new URL(basePath, origin).href,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
      const totalPages = await resolveLandingTotalPages({
        category: category.slug,
      });
      pushPaginatedLandingEntries(
        entries,
        origin,
        basePath,
        totalPages,
        lastModified,
        0.55,
      );
    }
  } catch {
    // Keep static entries when category listing fails.
  }

  try {
    const brands = await listBrands();
    for (const brand of brands) {
      const lastModified = brand.updatedAt ? new Date(brand.updatedAt) : now;
      const basePath = `/brands/${brand.slug}`;
      entries.push({
        url: new URL(basePath, origin).href,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.65,
      });
      const totalPages = await resolveLandingTotalPages({
        brand: brand.slug,
      });
      pushPaginatedLandingEntries(
        entries,
        origin,
        basePath,
        totalPages,
        lastModified,
        0.6,
      );
    }
  } catch {
    // Keep existing entries when brand listing fails.
  }

  try {
    const products = await collectProductEntries();
    for (const product of products) {
      entries.push({
        url: new URL(`/products/${product.slug}`, origin).href,
        ...(product.lastModified
          ? { lastModified: product.lastModified }
          : {}),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch {
    return entries;
  }

  return entries;
}
