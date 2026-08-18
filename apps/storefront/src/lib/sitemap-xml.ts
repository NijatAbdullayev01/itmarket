export type SitemapUrlEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: string;
  priority?: number;
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
      return `<url>
<loc>${escapeXml(entry.url)}</loc>${lastmod}${changefreq}${priority}
</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
