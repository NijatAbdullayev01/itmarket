import { statSync } from "node:fs";
import path from "node:path";

import {
  blogBlocksToPlainText,
  blogBlocksToRssHtml,
  getBlogPostImagePath,
  getBlogPosts,
  sortBlogPostsByDate,
} from "@/lib/i18n/blog/blog";
import { getStorefrontOrigin } from "@/lib/site-origin";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolvePublicFileByteLength(publicPath: string): number | undefined {
  try {
    const absolute = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    const size = statSync(absolute).size;
    return Number.isFinite(size) && size > 0 ? size : undefined;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return new Response("Storefront origin is not configured", { status: 503 });
  }
  const base = origin.href.replace(/\/$/, "");
  const posts = sortBlogPostsByDate(getBlogPosts("az"));
  const channelUrl = `${base}/blog`;
  const feedUrl = `${base}/blog/rss.xml`;
  const lastBuild = posts[0]
    ? new Date(
        `${posts[0].updatedAt?.trim() || posts[0].publishedAt}T12:00:00+04:00`,
      ).toUTCString()
    : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const link = `${base}/blog/${post.slug}`;
      const pubDate = new Date(
        `${post.publishedAt}T12:00:00+04:00`,
      ).toUTCString();
      const imagePath = getBlogPostImagePath(post.slug);
      const imageUrl = imagePath ? `${base}${imagePath}` : undefined;
      const description = escapeXml(
        post.description.trim() || blogBlocksToPlainText(post.blocks),
      );
      const contentHtml = blogBlocksToRssHtml(post.blocks);
      const enclosureLength =
        imagePath !== undefined
          ? resolvePublicFileByteLength(imagePath)
          : undefined;
      const enclosure = imageUrl
        ? `\n      <enclosure url="${escapeXml(imageUrl)}" type="${imagePath!.endsWith(".png") ? "image/png" : "image/jpeg"}" length="${enclosureLength ?? 1}" />`
        : "";

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <content:encoded><![CDATA[${contentHtml.replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>${enclosure}
      <category>${escapeXml(post.category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>IT Market Bloq</title>
    <link>${escapeXml(channelUrl)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>IT Market — texnologiya və alış-veriş məsləhətləri (Azərbaycan dili).</description>
    <language>az</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
