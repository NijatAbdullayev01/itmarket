import { describe, expect, it } from "vitest";

import {
  getAllBlogSlugs,
  getBlogPageContent,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "./blog";

describe("blog page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getBlogPageContent("az").title).toBe("Bloq");
    expect(getBlogPageContent("en").title).toBe("Blog");
    expect(getBlogPageContent("ru").title).toBe("Блог");
  });

  it("keeps the same post slugs and count across locales", () => {
    const az = getBlogPageContent("az");
    const en = getBlogPageContent("en");
    const ru = getBlogPageContent("ru");
    const slugs = getAllBlogSlugs();

    expect(en.posts).toHaveLength(az.posts.length);
    expect(ru.posts).toHaveLength(az.posts.length);
    expect(en.posts.map((post) => post.slug)).toEqual(slugs);
    expect(ru.posts.map((post) => post.slug)).toEqual(slugs);
    expect(slugs.length).toBeGreaterThanOrEqual(5);
  });

  it("resolves posts by slug and related posts", () => {
    const slug = getAllBlogSlugs()[0];
    const post = getBlogPostBySlug("az", slug);
    expect(post?.slug).toBe(slug);
    expect(post?.blocks.length).toBeGreaterThan(3);

    const related = getRelatedBlogPosts("az", slug, 2);
    expect(related).toHaveLength(2);
    expect(related.every((item) => item.slug !== slug)).toBe(true);
  });

  it("includes lead and reading-time labels", () => {
    expect(getBlogPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getBlogPageContent("az").readingTimeLabel(8)).toContain("8");
    expect(getBlogPageContent("en").readingTimeLabel(8)).toContain("8");
    expect(getBlogPageContent("ru").backToBlog.length).toBeGreaterThan(3);
  });
});
