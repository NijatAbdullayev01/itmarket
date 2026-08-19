export type SitemapImageEntry = {
  url: string;
  title?: string;
};

export type SitemapUrlEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: string;
  priority?: number;
  images?: SitemapImageEntry[];
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toUrlsetXml(entries: SitemapUrlEntry[]): string {
  const hasImages = entries.some((e) => e.images && e.images.length > 0);
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `\n<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : "";
      const changefreq = entry.changeFrequency
        ? `\n<changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const priority =
        entry.priority !== undefined
          ? `\n<priority>${entry.priority}</priority>`
          : "";
      const images = (entry.images ?? [])
        .map(
          (img) =>
            `\n<image:image>\n<image:loc>${escapeXml(img.url)}</image:loc>${
              img.title ? `\n<image:title>${escapeXml(img.title)}</image:title>` : ""
            }\n</image:image>`,
        )
        .join("");
      return `<url>
<loc>${escapeXml(entry.url)}</loc>${lastmod}${changefreq}${priority}${images}
</url>`;
    })
    .join("\n");

  const xmlnsImage = hasImages
    ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xmlnsImage}>
${urls}
</urlset>
`;
}
