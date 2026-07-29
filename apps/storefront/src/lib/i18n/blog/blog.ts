import type { Locale } from "../locales";
import { blogAz } from "./blog-az";
import { blogEn } from "./blog-en";
import { blogRu } from "./blog-ru";
import type { BlogPageContent, BlogPost } from "./blog-types";

export type {
  BlogBlock,
  BlogPageContent,
  BlogPost,
} from "./blog-types";

const blogByLocale: Record<Locale, BlogPageContent> = {
  az: blogAz,
  en: blogEn,
  ru: blogRu,
};

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

/** AZ-primary cover image for OG / JSON-LD / RSS (indexable locale). */
export function getBlogPostImagePath(slug: string): string | undefined {
  const path = getBlogPostBySlug("az", slug)?.imagePath?.trim();
  return path || undefined;
}

/** Flatten blocks to plain text for RSS description fallback. */
export function blogBlocksToPlainText(
  blocks: BlogPost["blocks"],
  maxLength = 500,
): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "p" || block.type === "h2" || block.type === "callout") {
      parts.push(block.text);
    } else {
      parts.push(...block.items);
    }
  }
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
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
        return `<p>${escapeHtml(block.text)}</p>`;
      }
      if (block.type === "h2") {
        return `<h2>${escapeHtml(block.text)}</h2>`;
      }
      if (block.type === "callout") {
        return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
      }
      const tag = block.type === "ol" ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
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
