/**
 * Parent catalog slugs roll up every descendant. Linking a buying guide there
 * dumps the customer into stands, bags, toner, mice, etc. Blog CTAs must use
 * the leaf that matches the product being recommended.
 */
export const BLOG_PARENT_MIX_CATEGORY_SLUGS = [
  "smartfonlar",
  "noutbuklar",
  "monitorlar",
  "printerler",
  "computer",
  "gamer-zona",
  "portativ-enerji",
  "sebeke-avadanliqlari",
] as const;

const PARENT_MIX = new Set<string>(BLOG_PARENT_MIX_CATEGORY_SLUGS);

export function catalogCategorySlugFromHref(href: string): string | null {
  const match = href.trim().match(/^\/categories\/([a-z0-9-]+)\/?$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isBlogParentMixCategoryHref(href: string): boolean {
  const slug = catalogCategorySlugFromHref(href);
  return slug != null && PARENT_MIX.has(slug);
}

const INLINE_HREF_RE = /\]\((\/[^)\s]+)\)/g;

export function collectBlogPostHrefs(post: {
  categoryHref?: string;
  cta?: { href: string };
  blocks: unknown;
}): string[] {
  const hrefs: string[] = [];
  if (post.categoryHref) hrefs.push(post.categoryHref);
  if (post.cta?.href) hrefs.push(post.cta.href);
  const haystack = JSON.stringify(post.blocks);
  for (const match of haystack.matchAll(INLINE_HREF_RE)) {
    hrefs.push(match[1]);
  }
  return hrefs;
}
