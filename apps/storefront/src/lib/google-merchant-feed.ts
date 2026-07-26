import { getProductImageUrl, PRODUCT_PLACEHOLDER } from "@itmarket/ui";

import type { ProductSummary } from "./api";
import { mapBarcodeToGtin } from "./seo";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export function resolveFeedGtin(
  barcode: string | null | undefined,
): string | undefined {
  const mapped = mapBarcodeToGtin(barcode);
  return mapped.gtin13 ?? mapped.gtin8 ?? mapped.gtin;
}

/** Real catalog image path for Merchant; skip placeholders / missing media. */
export function resolveFeedImagePath(
  image: ProductSummary["image"],
): string | undefined {
  if (!image?.objectKey?.trim()) {
    return undefined;
  }
  const path = getProductImageUrl(image);
  if (!path || path === PRODUCT_PLACEHOLDER) {
    return undefined;
  }
  return path;
}

/** Build one Google Merchant `<item>` from a catalog list row (one variant). */
export function buildMerchantItemXml(
  origin: URL,
  item: ProductSummary,
): string {
  const variantId = item.defaultVariantId?.trim();
  if (!variantId || !item.price) {
    return "";
  }

  const imagePath = resolveFeedImagePath(item.image);
  if (!imagePath) {
    return "";
  }

  const link = new URL(`/products/${item.slug}`, origin).href;
  const imageLink = new URL(imagePath, origin).href;
  const title = item.name.trim() || "IT Market product";
  const description =
    item.seoDescription?.trim() || item.description?.trim() || title;
  const availability = item.available > 0 ? "in_stock" : "out_of_stock";
  const brand = item.brand?.name?.trim();
  const gtin = resolveFeedGtin(item.barcode);
  const mpn = item.sku?.trim();
  const previousPrice = item.previousPrice?.trim();
  const onSale =
    Boolean(previousPrice) &&
    previousPrice !== item.price &&
    Number(previousPrice) > Number(item.price);

  const priceLines = onSale
    ? [
        `<g:price>${escapeXml(previousPrice!)} AZN</g:price>`,
        `<g:sale_price>${escapeXml(item.price)} AZN</g:sale_price>`,
      ]
    : [`<g:price>${escapeXml(item.price)} AZN</g:price>`];

  const identifierLine = gtin
    ? `<g:gtin>${escapeXml(gtin)}</g:gtin>`
    : mpn
      ? ""
      : `<g:identifier_exists>false</g:identifier_exists>`;

  return [
    "<item>",
    `<g:id>${escapeXml(variantId)}</g:id>`,
    `<g:item_group_id>${escapeXml(item.id)}</g:item_group_id>`,
    `<g:title>${cdata(title)}</g:title>`,
    `<g:description>${cdata(description)}</g:description>`,
    `<g:link>${escapeXml(link)}</g:link>`,
    `<g:image_link>${escapeXml(imageLink)}</g:image_link>`,
    `<g:availability>${availability}</g:availability>`,
    `<g:condition>new</g:condition>`,
    ...priceLines,
    brand ? `<g:brand>${escapeXml(brand)}</g:brand>` : "",
    mpn ? `<g:mpn>${escapeXml(mpn)}</g:mpn>` : "",
    identifierLine,
    "</item>",
  ]
    .filter(Boolean)
    .join("");
}

export function buildMerchantFeedXml(
  origin: URL,
  items: ProductSummary[],
): string {
  const itemChunks = items
    .map((item) => buildMerchantItemXml(origin, item))
    .filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>IT Market</title>
    <link>${escapeXml(origin.href)}</link>
    <description>IT Market Google Merchant məhsul feed-i</description>
    ${itemChunks.join("\n    ")}
  </channel>
</rss>
`;
}
