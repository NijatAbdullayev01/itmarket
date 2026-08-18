import { describe, expect, it } from "vitest";

import {
  extractBlogFaqs,
  getAllBlogSlugs,
  getBlogGuidesForCategory,
  getBlogPageContent,
  getBlogPostBySlug,
  getBlogPostImagePath,
  getBlogToc,
  getRelatedBlogPosts,
  parseBlogInlineParts,
  sortBlogPostsByDate,
} from "./blog";
import {
  collectBlogPostHrefs,
  isBlogParentMixCategoryHref,
} from "./blog-catalog-leaves";

describe("blog page content", () => {
  it("returns keyword-rich localized titles for az, en, and ru", () => {
    expect(getBlogPageContent("az").title).toMatch(/bələdçi/i);
    expect(getBlogPageContent("az").heading?.length).toBeGreaterThan(20);
    expect(getBlogPageContent("az").tocTitle.length).toBeGreaterThan(2);
    expect(getBlogPageContent("az").guidesTitle.length).toBeGreaterThan(2);
    expect(getBlogPageContent("en").title.toLowerCase()).toContain("guide");
    expect(getBlogPageContent("ru").guidesTitle.length).toBeGreaterThan(2);
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
    expect(slugs.length).toBeGreaterThanOrEqual(11);
  });

  it("provides AZ-primary cover images for indexed posts", () => {
    for (const slug of getAllBlogSlugs()) {
      expect(getBlogPostImagePath(slug)?.startsWith("/images/")).toBe(true);
    }
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
    expect(getBlogPageContent("az").featuredLabel.length).toBeGreaterThan(2);
    expect(getBlogPageContent("az").readingTimeLabel(8)).toContain("8");
    expect(getBlogPageContent("en").readingTimeLabel(8)).toContain("8");
    expect(getBlogPageContent("ru").backToBlog.length).toBeGreaterThan(3);
  });

  it("points AZ covers at dedicated blog image assets", () => {
    for (const slug of getAllBlogSlugs()) {
      const path = getBlogPostImagePath(slug);
      expect(path).toMatch(/^\/images\/blog\/.+\.jpe?g$/i);
      expect(path).toContain(slug);
    }
  });

  it("keeps SEO-facing descriptions, CTAs, FAQ and in-body links", () => {
    for (const post of getBlogPageContent("az").posts) {
      expect(post.description.length).toBeGreaterThan(60);
      expect(post.excerpt.length).toBeGreaterThan(40);
      expect(post.blocks.some((block) => block.type === "h2")).toBe(true);
      expect(post.cta?.href.startsWith("/")).toBe(true);
      expect(post.cta?.href).not.toBe("/");
      expect(extractBlogFaqs(post.blocks).length).toBeGreaterThanOrEqual(3);
      expect(getBlogToc(post.blocks).length).toBeGreaterThanOrEqual(3);
      const haystack = JSON.stringify(post.blocks);
      expect(haystack).toMatch(/\[[^\]]+\]\(\/[^)]+\)/);
    }
  });

  it("parses internal inline links and maps category landings to guides", () => {
    expect(parseBlogInlineParts("baxın [smartfonlar](/categories/smartfonlar).")).toEqual(
      [
        { type: "text", text: "baxın " },
        {
          type: "link",
          label: "smartfonlar",
          href: "/categories/smartfonlar",
        },
        { type: "text", text: "." },
      ],
    );
    expect(parseBlogInlineParts("[x](https://evil.example)")).toEqual([
      { type: "text", text: "[x](https://evil.example)" },
    ]);

    const guides = getBlogGuidesForCategory("az", ["smartfonlar"], 3);
    expect(guides.map((post) => post.slug)).toContain("smartfon-secimi-2026");
    expect(guides.length).toBeGreaterThanOrEqual(2);

    expect(
      getBlogGuidesForCategory("az", ["monitor"], 2).map((post) => post.slug),
    ).toContain("monitor-secimi-is-oyun");
    expect(
      getBlogGuidesForCategory("az", ["noutbuk"], 2).map((post) => post.slug),
    ).toContain("noutbuk-is-tehsil-secimi");

    const latest = sortBlogPostsByDate(getBlogPageContent("az").posts)[0];
    expect(latest?.publishedAt >= "2026-08-08").toBe(true);
  });

  it("sends catalog links to product leaves, not parent mix pages", () => {
    for (const locale of ["az", "en", "ru"] as const) {
      for (const post of getBlogPageContent(locale).posts) {
        for (const href of collectBlogPostHrefs(post)) {
          expect({
            locale,
            slug: post.slug,
            href,
            parentMix: isBlogParentMixCategoryHref(href),
          }).toEqual({
            locale,
            slug: post.slug,
            href,
            parentMix: false,
          });
        }
      }
    }
  });
});
