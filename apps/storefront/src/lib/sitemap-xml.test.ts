import { describe, expect, it } from "vitest";

import { toUrlsetXml } from "./sitemap-xml";

describe("toUrlsetXml", () => {
  it("emits a urlset Google can parse without a sitemapindex", () => {
    const xml = toUrlsetXml([
      {
        url: "https://it-market.org/",
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: "https://it-market.org/products/xerox-006r04767",
        lastModified: new Date("2026-08-17T15:10:39.807Z"),
        changeFrequency: "daily",
        priority: 0.7,
      },
    ]);

    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://it-market.org/</loc>");
    expect(xml).toContain(
      "<loc>https://it-market.org/products/xerox-006r04767</loc>",
    );
    expect(xml).toContain("<lastmod>2026-08-17T15:10:39.807Z</lastmod>");
  });
});
