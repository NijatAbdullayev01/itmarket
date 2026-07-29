import {
  getColorValue,
  getProductImageUrl,
  getStorageValue,
  getVariantPermanentStorageLabel,
  PRODUCT_PLACEHOLDER,
} from "@itmarket/ui";

import type { CategorySummary, ProductMedia, ProductSummary } from "./api";
import { buildCategoryProductTypePath } from "./catalog-landing-coverage";
import {
  mapBarcodeToGtin,
  resolveMerchantAvailability,
  SCHEMA_BAKU_STANDARD_SHIPPING_RATE_AZN,
} from "./seo";

/** Max additional images per Merchant item (Google allows 10). */
const MERCHANT_ADDITIONAL_IMAGE_LIMIT = 10;

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

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isPublicSitePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

/** Prefer stable public paths over signed S3 URLs (TTL-bound). */
export function resolveFeedImagePath(
  image: ProductMedia | ProductSummary["image"] | null | undefined,
): string | undefined {
  if (!image?.objectKey?.trim()) {
    return undefined;
  }

  const objectKey = image.objectKey.trim();
  if (isPublicSitePath(objectKey) && objectKey !== PRODUCT_PLACEHOLDER) {
    return objectKey;
  }

  if (image.url?.trim()) {
    const url = image.url.trim();
    if (isHttpUrl(url) || isPublicSitePath(url)) {
      if (url === PRODUCT_PLACEHOLDER) {
        return undefined;
      }
      return url;
    }
  }

  const path = getProductImageUrl(image);
  if (!path || path === PRODUCT_PLACEHOLDER) {
    return undefined;
  }
  return path;
}

export function resolveFeedImageLink(
  origin: URL,
  imagePath: string,
): string {
  if (isHttpUrl(imagePath)) {
    return imagePath;
  }
  return new URL(imagePath, origin).href;
}

/** Customer-facing color label for Merchant (prefer raw attr over normalized). */
export function resolveFeedColor(
  attrs: Record<string, string>,
): string | undefined {
  const raw =
    attrs.Rəng?.trim() ||
    attrs.Color?.trim() ||
    attrs.colour?.trim() ||
    attrs.color?.trim();
  if (raw) {
    return raw;
  }
  return getColorValue(attrs) ?? undefined;
}

/** Customer-facing storage/size label for Merchant. */
export function resolveFeedSize(
  attrs: Record<string, string>,
  variantName?: string,
): string | undefined {
  return (
    getVariantPermanentStorageLabel(attrs, variantName) ??
    getStorageValue(attrs) ??
    undefined
  );
}

/**
 * Map local category slug/name → Google product category ID.
 * IDs from Google's official taxonomy (Electronics-focused IT retail).
 */
export function resolveGoogleProductCategoryId(input: {
  slug?: string | null;
  name?: string | null;
  productType?: string | null;
}): string | undefined {
  const haystack = [
    input.slug,
    input.name,
    input.productType,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLocaleLowerCase("az")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (!haystack) {
    return undefined;
  }

  const rules: Array<{ test: RegExp; id: string }> = [
    { test: /noutbuk|laptop|notebook/, id: "328" },
    { test: /smartfon|telefon|phone|iphone/, id: "267" },
    { test: /plan.set|tablet|ipad/, id: "4745" },
    { test: /monitor/, id: "305" },
    { test: /\btv\b|televiz|audio/, id: "404" },
    { test: /printer|printerler/, id: "500" },
    { test: /kamera|foto|camera/, id: "152" },
    { test: /sebeke|network|router|wi-?fi/, id: "342" },
    { test: /tehlukesizlik|security|surveillance/, id: "5491" },
    { test: /gamer|oyun|console|playstation|xbox/, id: "1294" },
    { test: /meiset|appliance|dyson/, id: "604" },
    { test: /komputer|computer|\bpc\b/, id: "278" },
    { test: /aksessuar|accessories|qulaqliq|headphone/, id: "222" },
  ];

  for (const rule of rules) {
    if (rule.test.test(haystack)) {
      return rule.id;
    }
  }

  // Broad Electronics fallback for IT retail catalog rows.
  return "222";
}

export function buildMerchantShippingXml(): string {
  const price = `${SCHEMA_BAKU_STANDARD_SHIPPING_RATE_AZN}.00 AZN`;
  return [
    "<g:shipping>",
    "<g:country>AZ</g:country>",
    "<g:service>Baki standart</g:service>",
    `<g:price>${escapeXml(price)}</g:price>`,
    "</g:shipping>",
  ].join("");
}

export type MerchantItemOptions = {
  /** "Parent > Child" taxonomy path for g:product_type. */
  productType?: string;
};

/** Build one Google Merchant `<item>` from a catalog list row (one variant). */
export function buildMerchantItemXml(
  origin: URL,
  item: ProductSummary,
  options: MerchantItemOptions = {},
): string {
  const variantId = item.defaultVariantId?.trim();
  if (!variantId || !item.price) {
    return "";
  }

  const imagePath = resolveFeedImagePath(item.image);
  if (!imagePath) {
    return "";
  }

  const linkUrl = new URL(`/products/${item.slug}`, origin);
  linkUrl.searchParams.set("variant", variantId);
  const link = linkUrl.href;
  const imageLink = resolveFeedImageLink(origin, imagePath);
  const additionalImageLinks = (item.additionalImages ?? [])
    .map((media) => resolveFeedImagePath(media))
    .filter((path): path is string => Boolean(path))
    .filter((path) => path !== imagePath)
    .slice(0, MERCHANT_ADDITIONAL_IMAGE_LIMIT)
    .map((path) => resolveFeedImageLink(origin, path));
  const uniqueAdditional = [...new Set(additionalImageLinks)].filter(
    (href) => href !== imageLink,
  );

  const title = item.name.trim() || "IT Market product";
  const description =
    item.seoDescription?.trim() || item.description?.trim() || title;
  const availability = resolveMerchantAvailability(
    item.available,
    item.availableByOrder,
  );
  const brand = item.brand?.name?.trim();
  const gtin = resolveFeedGtin(item.barcode);
  const mpn = item.sku?.trim();
  const previousPrice = item.previousPrice?.trim();
  const onSale =
    Boolean(previousPrice) &&
    previousPrice !== item.price &&
    Number(previousPrice) > Number(item.price);

  const attrs = item.variantAttributes ?? {};
  const color = resolveFeedColor(attrs);
  const storage = resolveFeedSize(attrs, item.variantName);
  const productType =
    options.productType?.trim() ||
    item.category?.name?.trim() ||
    undefined;
  const googleProductCategory = resolveGoogleProductCategoryId({
    slug: item.category?.slug,
    name: item.category?.name,
    productType,
  });

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
    ...uniqueAdditional.map(
      (href) =>
        `<g:additional_image_link>${escapeXml(href)}</g:additional_image_link>`,
    ),
    `<g:availability>${availability}</g:availability>`,
    `<g:condition>new</g:condition>`,
    ...priceLines,
    brand ? `<g:brand>${escapeXml(brand)}</g:brand>` : "",
    googleProductCategory
      ? `<g:google_product_category>${escapeXml(googleProductCategory)}</g:google_product_category>`
      : "",
    productType
      ? `<g:product_type>${cdata(productType)}</g:product_type>`
      : "",
    color ? `<g:color>${escapeXml(color)}</g:color>` : "",
    storage ? `<g:size>${escapeXml(storage)}</g:size>` : "",
    mpn ? `<g:mpn>${escapeXml(mpn)}</g:mpn>` : "",
    identifierLine,
    buildMerchantShippingXml(),
    "</item>",
  ]
    .filter(Boolean)
    .join("");
}

export function buildMerchantFeedXml(
  origin: URL,
  items: ProductSummary[],
  options: {
    categories?: CategorySummary[];
    truncated?: boolean;
  } = {},
): string {
  const productTypeBySlug = new Map<string, string>();
  if (options.categories && options.categories.length > 0) {
    for (const category of options.categories) {
      productTypeBySlug.set(
        category.slug,
        buildCategoryProductTypePath(category.slug, options.categories),
      );
    }
  }

  const itemChunks = items
    .map((item) =>
      buildMerchantItemXml(origin, item, {
        productType:
          (item.category?.slug
            ? productTypeBySlug.get(item.category.slug)
            : undefined) || item.category?.name,
      }),
    )
    .filter(Boolean);

  const truncatedComment = options.truncated
    ? "\n<!-- WARNING: feed truncated at collection safety cap; raise FEED_MAX_PAGES or split feeds -->"
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>IT Market Google Merchant</title>
    <link>${escapeXml(origin.href)}</link>
    <description>IT Market product variants for Google Merchant Center</description>${truncatedComment}
${itemChunks.map((chunk) => `    ${chunk}`).join("\n")}
  </channel>
</rss>
`;
}
