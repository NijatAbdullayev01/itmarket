import type { Locale } from "../locales";
import { relatedBlogSlugsForCategory } from "./blog-category-guides";
import { blogAz } from "./blog-az";
import { blogEn } from "./blog-en";
import { blogRu } from "./blog-ru";
import type {
  BlogBlock,
  BlogInlinePart,
  BlogPageContent,
  BlogPost,
} from "./blog-types";

export type {
  BlogBlock,
  BlogInlinePart,
  BlogPageContent,
  BlogPost,
} from "./blog-types";
export { relatedBlogSlugsForCategory } from "./blog-category-guides";

const blogByLocale: Record<Locale, BlogPageContent> = {
  az: blogAz,
  en: blogEn,
  ru: blogRu,
};

const AZ_TRANSLIT: Record<string, string> = {
  ə: "e",
  Ə: "e",
  ö: "o",
  Ö: "o",
  ü: "u",
  Ü: "u",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ş: "s",
  Ş: "s",
  ç: "c",
  Ç: "c",
};

/** Markdown-style `[label](/internal-path)` — internal storefront paths only. */
const INLINE_LINK_RE = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;

export function getBlogPageContent(locale: Locale): BlogPageContent {
  return blogByLocale[locale];
}

export function getBlogPosts(locale: Locale): BlogPost[] {
  return getBlogPageContent(locale).posts;
}

export function getBlogPostBySlug(
  locale: Locale,
  slug: string,
): BlogPost | undefined {
  return getBlogPosts(locale).find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(
  locale: Locale,
  slug: string,
  limit = 3,
): BlogPost[] {
  const posts = getBlogPosts(locale);
  const current = posts.find((post) => post.slug === slug);
  if (!current) {
    return posts.slice(0, limit);
  }

  const scored = posts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) =>
        current.tags.includes(tag),
      ).length;
      const sameCategory = post.category === current.category ? 1 : 0;
      return { post, score: sharedTags * 2 + sameCategory };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.publishedAt.localeCompare(a.post.publishedAt);
    });

  return scored.slice(0, limit).map((entry) => entry.post);
}

export function getAllBlogSlugs(): string[] {
  return blogAz.posts.map((post) => post.slug);
}

export function sortBlogPostsByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const aDate = a.updatedAt?.trim() || a.publishedAt;
    const bDate = b.updatedAt?.trim() || b.publishedAt;
    const byUpdated = bDate.localeCompare(aDate);
    if (byUpdated !== 0) return byUpdated;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

export function getLatestBlogDate(
  posts: BlogPost[] = blogAz.posts,
): Date | undefined {
  const latest = sortBlogPostsByDate(posts)[0];
  if (!latest) return undefined;
  const iso = latest.updatedAt?.trim() || latest.publishedAt;
  return new Date(`${iso}T12:00:00+04:00`);
}

/** AZ-primary cover image for OG / JSON-LD / RSS (indexable locale). */
export function getBlogPostImagePath(slug: string): string | undefined {
  const path = getBlogPostBySlug("az", slug)?.imagePath?.trim();
  return path || undefined;
}

export function isSafeInternalBlogHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("://");
}

export function parseBlogInlineParts(text: string): BlogInlinePart[] {
  const parts: BlogInlinePart[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(INLINE_LINK_RE.source, "g");
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, index) });
    }
    const label = match[1] ?? "";
    const href = match[2] ?? "";
    if (label && isSafeInternalBlogHref(href)) {
      parts.push({ type: "link", label, href });
    } else {
      parts.push({ type: "text", text: match[0] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: "text", text }];
}

export function stripBlogInlineMarkup(text: string): string {
  return text.replace(INLINE_LINK_RE, "$1").replace(/\s+/g, " ").trim();
}

export function headingIdFromText(text: string): string {
  const stripped = stripBlogInlineMarkup(text)
    .split("")
    .map((char) => AZ_TRANSLIT[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return stripped || "bolme";
}

export function getBlogHeadingIds(blocks: BlogBlock[]): string[] {
  const used = new Map<string, number>();
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.type !== "h2") continue;
    const base = headingIdFromText(block.text);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    ids.push(count === 0 ? base : `${base}-${count + 1}`);
  }
  return ids;
}

export function getBlogToc(
  blocks: BlogBlock[],
): Array<{ id: string; text: string }> {
  const ids = getBlogHeadingIds(blocks);
  const headings = blocks.filter((block) => block.type === "h2");
  return headings.map((block, index) => ({
    id: ids[index] ?? headingIdFromText(block.text),
    text: stripBlogInlineMarkup(block.text),
  }));
}

export function extractBlogFaqs(
  blocks: BlogBlock[],
): Array<{ question: string; answer: string }> {
  return blocks.flatMap((block) =>
    block.type === "faq"
      ? block.items.map((item) => ({
          question: stripBlogInlineMarkup(item.question),
          answer: stripBlogInlineMarkup(item.answer),
        }))
      : [],
  );
}

export function blogPostWordCount(blocks: BlogBlock[]): number {
  return blogBlocksToPlainText(blocks, Number.MAX_SAFE_INTEGER)
    .split(/\s+/)
    .filter(Boolean).length;
}

export function getBlogGuidesForCategory(
  locale: Locale,
  categorySlugs: Array<string | null | undefined>,
  limit = 3,
): BlogPost[] {
  const slugs = relatedBlogSlugsForCategory(...categorySlugs);
  const posts: BlogPost[] = [];
  for (const slug of slugs) {
    const post = getBlogPostBySlug(locale, slug);
    if (post) posts.push(post);
    if (posts.length >= limit) break;
  }
  return posts;
}

function collectBlockPlainParts(block: BlogBlock): string[] {
  if (block.type === "p" || block.type === "h2" || block.type === "callout") {
    return [stripBlogInlineMarkup(block.text)];
  }
  if (block.type === "faq") {
    return block.items.flatMap((item) => [
      stripBlogInlineMarkup(item.question),
      stripBlogInlineMarkup(item.answer),
    ]);
  }
  return block.items.map((item) => stripBlogInlineMarkup(item));
}

function inlineMarkupToRssHtml(text: string): string {
  return parseBlogInlineParts(text)
    .map((part) => {
      if (part.type === "text") {
        return escapeHtml(part.text);
      }
      return `<a href="${escapeHtml(part.href)}">${escapeHtml(part.label)}</a>`;
    })
    .join("");
}

/** Flatten blocks to plain text for RSS description fallback. */
export function blogBlocksToPlainText(
  blocks: BlogPost["blocks"],
  maxLength = 500,
): string {
  const text = blocks
    .flatMap(collectBlockPlainParts)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Simple HTML body for RSS content:encoded (AZ blocks). */
export function blogBlocksToRssHtml(blocks: BlogPost["blocks"]): string {
  return blocks
    .map((block) => {
      if (block.type === "p") {
        return `<p>${inlineMarkupToRssHtml(block.text)}</p>`;
      }
      if (block.type === "h2") {
        return `<h2>${inlineMarkupToRssHtml(block.text)}</h2>`;
      }
      if (block.type === "callout") {
        return `<blockquote>${inlineMarkupToRssHtml(block.text)}</blockquote>`;
      }
      if (block.type === "faq") {
        return block.items
          .map(
            (item) =>
              `<h3>${inlineMarkupToRssHtml(item.question)}</h3><p>${inlineMarkupToRssHtml(item.answer)}</p>`,
          )
          .join("");
      }
      const tag = block.type === "ol" ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li>${inlineMarkupToRssHtml(item)}</li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
