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
