import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BlogGuideLinks } from "./blog-guide-links";
import type { BlogPost } from "@/lib/i18n/blog/blog";

const mockPost: BlogPost = {
  slug: "wifi-router-secimi",
  title: "Ev və ofis üçün Wi-Fi router: mesh, Wi-Fi 6 və sürət",
  excerpt:
    "«3000 Mbps» etiketi divardan keçmir. Mərtəbə, cihaz sayı və mesh ehtiyacını əvvəl yazın — sonra Wi-Fi 6 və WAN portuna baxın.",
  description: "Bakıda Wi-Fi router seçimi",
  publishedAt: "2026-08-16",
  readingMinutes: 11,
  category: "Şəbəkə",
  tags: ["Wi-Fi", "router"],
  imagePath: "/images/blog/wifi-router-secimi.jpg",
  blocks: [],
};

describe("BlogGuideLinks", () => {
  it("returns null when posts list is empty", () => {
    const html = renderToStaticMarkup(
      <BlogGuideLinks title="Alış bələdçiləri" posts={[]} />,
    );
    expect(html).toBe("");
  });

  it("renders structured visual card when 1 post is provided", () => {
    const html = renderToStaticMarkup(
      <BlogGuideLinks
        title="Alış bələdçiləri"
        posts={[mockPost]}
        readMoreLabel="Məqaləni oxu"
        allGuidesLabel="Bütün bələdçilər"
      />,
    );

    expect(html).toContain("ui-blog-guides");
    expect(html).toContain("ui-blog-guides__grid--single");
    expect(html).toContain("ui-blog-guides__card--single");
    expect(html).toContain("Alış bələdçiləri");
    expect(html).toContain("Bütün bələdçilər");
    expect(html).toContain("Ev və ofis üçün Wi-Fi router: mesh, Wi-Fi 6 və sürət");
    expect(html).toContain("«3000 Mbps» etiketi divardan keçmir.");
    expect(html).toContain("Şəbəkə");
    expect(html).toContain("11 dəq oxuma");
    expect(html).toContain("Məqaləni oxu");
    expect(html).toContain("/blog/wifi-router-secimi");
  });

  it("renders grid when multiple posts are provided", () => {
    const post2 = { ...mockPost, slug: "smartfon-secimi-2026", title: "Smartfon seçimi" };
    const html = renderToStaticMarkup(
      <BlogGuideLinks
        title="Alış bələdçiləri"
        posts={[mockPost, post2]}
      />,
    );

    expect(html).toContain("ui-blog-guides");
    expect(html).not.toContain("ui-blog-guides__grid--single");
    expect(html).toContain("Smartfon seçimi");
  });
});
