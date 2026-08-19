import { cache } from "react";
import { getProductImageUrl, PRODUCT_PLACEHOLDER } from "@itmarket/ui";

import { listBrands, listCategories, listProducts } from "@/lib/api";
import {
  buildLandingCoverageMaps,
  landingCoverageFromCount,
} from "@/lib/catalog-landing-coverage";
import {
  getAllBlogSlugs,
  getBlogPostBySlug,
  getLatestBlogDate,
} from "@/lib/i18n/blog/blog";
import { getStorefrontOrigin } from "@/lib/site-origin";
import type { SitemapUrlEntry } from "@/lib/sitemap-xml";

const SITEMAP_PAGE_LIMIT = 50;
/** Per-sitemap product budget (Google soft-cap is 50k URLs). */
export const PRODUCTS_PER_SITEMAP = 5_000;
/** Safety ceiling: 50 product sitemaps × 5k = 250k product URLs. */
export const MAX_PRODUCT_SITEMAPS = 50;

export type CatalogWalk = {
  products: {
    slug: string;
    name?: string;
    imagePath?: string;
    lastModified?: Date;
  }[];
  categoryCounts: Map<string, number>;
  brandCounts: Map<string, number>;
};

/**
 * One catalog walk powers product sitemaps + taxonomy page discovery
 * (avoids N+1 count queries per category/brand).
 */
export const collectCatalogWalk = cache(async (): Promise<CatalogWalk> => {
  const bySlug = new Map<
    string,
    { lastModified?: Date; name?: string; imagePath?: string }
  >();
  const variantRows: Awaited<ReturnType<typeof listProducts>>["items"] = [];
  let cursor: string | undefined;
  const maxPages =
    MAX_PRODUCT_SITEMAPS * Math.ceil(PRODUCTS_PER_SITEMAP / SITEMAP_PAGE_LIMIT);

  for (let page = 0; page < maxPages; page += 1) {
    const products = await listProducts({
      limit: SITEMAP_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });

    variantRows.push(...products.items);

    for (const product of products.items) {
      const updatedAt = product.updatedAt
        ? new Date(product.updatedAt)
        : undefined;
      const rawImage = getProductImageUrl(product.image);
      const imagePath =
        rawImage && rawImage !== PRODUCT_PLACEHOLDER ? rawImage : undefined;
      const existing = bySlug.get(product.slug);
      if (
        !existing ||
        (updatedAt !== undefined &&
          (!existing.lastModified ||
            updatedAt.getTime() > existing.lastModified.getTime()))
      ) {
        bySlug.set(product.slug, {
          lastModified: updatedAt,
          name: product.name,
          imagePath: imagePath ?? existing?.imagePath,
        });
      } else if (!existing.imagePath && imagePath) {
        existing.imagePath = imagePath;
      }
    }

    if (!products.nextCursor) {
      break;
    }
    cursor = products.nextCursor;
  }

  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    categories = await listCategories();
  } catch {
    // Leaf-only counts still work; parent roll-up needs the tree.
  }

  const { categoryCounts, brandCounts } = buildLandingCoverageMaps(
    variantRows,
    categories,
  );

  return {
    products: [...bySlug.entries()].map(([slug, data]) => ({
      slug,
      name: data.name,
      imagePath: data.imagePath,
      lastModified: data.lastModified,
    })),
    categoryCounts,
    brandCounts,
  };
});

function pushPaginatedLandingEntries(
  entries: Array<{
    url: string;
    lastModified?: Date;
    changeFrequency:
      | "always"
      | "hourly"
      | "daily"
      | "weekly"
      | "monthly"
      | "yearly"
      | "never";
    priority?: number;
  }>,
  origin: URL,
  basePath: string,
  totalPages: number,
  lastModified: Date | undefined,
  priority: number,
) {
  for (let page = 2; page <= totalPages; page += 1) {
    entries.push({
      url: new URL(`${basePath}?page=${page}`, origin).href,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority,
    });
  }
}

export async function buildStaticAndTaxonomyEntries(origin: URL, walk: CatalogWalk) {
  const latestBlogDate = getLatestBlogDate();
  // Omit lastModified on evergreen legal pages (fake "now" weakens the signal).
  const entries: Array<{
    url: string;
    lastModified?: Date;
    changeFrequency:
      | "always"
      | "hourly"
      | "daily"
      | "weekly"
      | "monthly"
      | "yearly"
      | "never";
    priority?: number;
  }> = [
    {
      url: origin.href,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/about", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/blog", origin).href,
      ...(latestBlogDate ? { lastModified: latestBlogDate } : {}),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: new URL("/corporate", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/delivery-payment", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/installment", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/returns", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/warranty", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/faq", origin).href,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/terms", origin).href,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/privacy", origin).href,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  for (const slug of getAllBlogSlugs()) {
    const post = getBlogPostBySlug("az", slug);
    entries.push({
      url: new URL(`/blog/${slug}`, origin).href,
      ...(post
        ? {
            lastModified: new Date(
              `${post.updatedAt?.trim() || post.publishedAt}T12:00:00+04:00`,
            ),
          }
        : {}),
      changeFrequency: "monthly",
      priority: 0.65,
    });
  }

  try {
    const categories = await listCategories();
    for (const category of categories) {
      const coverage = landingCoverageFromCount(
        walk.categoryCounts.get(category.slug) ?? 0,
      );
      // Skip empty landings (page is noindex; avoid crawl-budget waste).
      if (!coverage.hasProducts) {
        continue;
      }
      const lastModified = category.updatedAt
        ? new Date(category.updatedAt)
        : undefined;
      const basePath = `/categories/${category.slug}`;
      entries.push({
        url: new URL(basePath, origin).href,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly",
        priority: 0.6,
      });
      pushPaginatedLandingEntries(
        entries,
        origin,
        basePath,
        coverage.totalPages,
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
      const coverage = landingCoverageFromCount(
        walk.brandCounts.get(brand.slug) ?? 0,
      );
      if (!coverage.hasProducts) {
        continue;
      }
      const lastModified = brand.updatedAt
        ? new Date(brand.updatedAt)
        : undefined;
      const basePath = `/brands/${brand.slug}`;
      entries.push({
        url: new URL(basePath, origin).href,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly",
        priority: 0.65,
      });
      pushPaginatedLandingEntries(
        entries,
        origin,
        basePath,
        coverage.totalPages,
        lastModified,
        0.6,
      );
    }
  } catch {
    // Keep existing entries when brand listing fails.
  }

  return entries;
}

export function buildProductSitemapEntries(
  origin: URL,
  walk: CatalogWalk,
): SitemapUrlEntry[] {
  return walk.products.map((product) => {
    const imageUrl =
      product.imagePath && product.imagePath.startsWith("http")
        ? product.imagePath
        : product.imagePath
          ? new URL(product.imagePath, origin).href
          : undefined;

    return {
      url: new URL(`/products/${product.slug}`, origin).href,
      ...(product.lastModified ? { lastModified: product.lastModified } : {}),
      changeFrequency: "daily",
      priority: 0.7,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                title: product.name,
              },
            ],
          }
        : {}),
    };
  });
}

const EMPTY_WALK: CatalogWalk = {
  products: [],
  categoryCounts: new Map(),
  brandCounts: new Map(),
};

/** Single urlset for `/sitemap.xml` — Google already fetches that URL. */
export async function buildCombinedSitemapEntries(
  origin: URL,
): Promise<SitemapUrlEntry[]> {
  try {
    const walk = await collectCatalogWalk();
    const taxonomy = await buildStaticAndTaxonomyEntries(origin, walk);
    return [...taxonomy, ...buildProductSitemapEntries(origin, walk)];
  } catch {
    return buildStaticAndTaxonomyEntries(origin, EMPTY_WALK);
  }
}

/** id=0 taxonomy + static; id=1…N product chunks. */
export async function listSitemapIds(): Promise<Array<{ id: number }>> {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return [{ id: 0 }];
  }

  try {
    const walk = await collectCatalogWalk();

    if (walk.products.length === 0) {
      return [{ id: 0 }];
    }

    const productSitemapCount = Math.ceil(
      walk.products.length / PRODUCTS_PER_SITEMAP,
    );
    const capped = Math.min(productSitemapCount, MAX_PRODUCT_SITEMAPS);
    return [
      { id: 0 },
      ...Array.from({ length: capped }, (_, index) => ({ id: index + 1 })),
    ];
  } catch {
    return [{ id: 0 }];
  }
}
