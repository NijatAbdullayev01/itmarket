import type { Metadata } from "next";
import { getProductImageUrl } from "@itmarket/ui";

import type {
  BrandSummary,
  CategorySummary,
  PickupLocationSummary,
  ProductDetail,
  ProductMedia,
  ProductSummary,
} from "./api";
import { getStorefrontOrigin } from "./site-origin";

export const noIndexRobots = {
  index: false,
  follow: false,
} as const satisfies NonNullable<Metadata["robots"]>;

export const noIndexFollowRobots = {
  index: false,
  follow: true,
} as const satisfies NonNullable<Metadata["robots"]>;

export const PRIVATE_ROBOTS_DISALLOW = [
  "/cart",
  "/checkout",
  "/account",
  "/favorites",
  "/compare",
] as const;

export const DEFAULT_OG_IMAGE_PATH = "/images/og-default.png";
/** Recommended Open Graph image dimensions (px). */
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
/** Brand mark for Organization / BlogPosting publisher (not favicon). */
export const ORGANIZATION_LOGO_PATH = "/images/logo.png";

/** Max images emitted in Product / ProductGroup JSON-LD. */
const PRODUCT_JSON_LD_IMAGE_LIMIT = 10;

const ORGANIZATION_SAME_AS = [
  "https://www.facebook.com/itmarketltdbaku/",
  "https://www.instagram.com/itmarket.ltd/",
  "https://www.tiktok.com/@itmarket.ltd",
] as const;

const ORGANIZATION_HAS_MAP =
  "https://maps.google.com/?q=28+may+k%C3%BC%C3%A7%C9%99si+69C,+Bak%C4%B1,+Az%C9%99rbaycan";

export type SchemaAvailability =
  | "https://schema.org/InStock"
  | "https://schema.org/BackOrder"
  | "https://schema.org/OutOfStock";

export type MerchantAvailability = "in_stock" | "backorder" | "out_of_stock";

/** Map stock + availableByOrder to schema.org Offer availability. */
export function resolveOfferAvailability(
  available: number,
  availableByOrder?: boolean,
): SchemaAvailability {
  if (available > 0) {
    return "https://schema.org/InStock";
  }
  if (availableByOrder === true) {
    return "https://schema.org/BackOrder";
  }
  return "https://schema.org/OutOfStock";
}

/** Map stock + availableByOrder to Google Merchant availability. */
export function resolveMerchantAvailability(
  available: number,
  availableByOrder?: boolean,
): MerchantAvailability {
  if (available > 0) {
    return "in_stock";
  }
  if (availableByOrder === true) {
    return "backorder";
  }
  return "out_of_stock";
}

function organizationGeoCoordinates():
  | { "@type": "GeoCoordinates"; latitude: number; longitude: number }
  | undefined {
  const latRaw = process.env.STORE_GEO_LATITUDE?.trim();
  const lngRaw = process.env.STORE_GEO_LONGITUDE?.trim();
  if (!latRaw || !lngRaw) {
    return undefined;
  }
  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }
  return { "@type": "GeoCoordinates", latitude, longitude };
}

function buildAdditionalPropertyNodes(
  entries: Array<{ name: string; value: string }>,
  limit = 24,
): Array<{ "@type": "PropertyValue"; name: string; value: string }> {
  const nodes: Array<{ "@type": "PropertyValue"; name: string; value: string }> =
    [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const name = entry.name.trim();
    const value = entry.value.trim();
    if (!name || !value) {
      continue;
    }
    const key = name.toLocaleLowerCase("az");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    nodes.push({ "@type": "PropertyValue", name, value });
    if (nodes.length >= limit) {
      break;
    }
  }
  return nodes;
}

function productSpecAdditionalProperties(
  product: ProductDetail,
  variant?: ProductDetail["variants"][number],
) {
  const entries: Array<{ name: string; value: string }> = [];
  for (const spec of product.requiredSpecs ?? []) {
    entries.push({ name: spec.label, value: spec.value });
  }
  if (variant) {
    for (const [name, value] of Object.entries(variant.attributes)) {
      entries.push({ name, value });
    }
  }
  return buildAdditionalPropertyNodes(entries);
}

/** Optional Twitter @handle from env (e.g. @itmarket). */
export function twitterSiteHandle(): string | undefined {
  const raw = process.env.TWITTER_SITE?.trim();
  if (!raw) {
    return undefined;
  }
  return raw.startsWith("@") ? raw : `@${raw}`;
}

/** Google Search Console HTML tag verification token. */
export function googleSiteVerification(): string | undefined {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return token || undefined;
}

/** AZ-primary language alternate (no en/ru hreflang — cookie UI only). */
export function azPrimaryLanguageAlternates(path: string): {
  languages: Record<string, string>;
} {
  return {
    languages: {
      "az-AZ": path,
      "x-default": path,
    },
  };
}

export type CatalogSeoSearchParams = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  onSale?: string;
  color?: string;
  ram?: string;
  storage?: string;
  page?: string;
};

export function absoluteUrl(path: string): string | undefined {
  const origin = getStorefrontOrigin();
  if (!origin) {
    return undefined;
  }
  return new URL(path, origin).href;
}

export function defaultOgImageUrl(): string | undefined {
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
}

function socialOgImage(
  url: string,
  alt: string,
): { url: string; alt: string; width: number; height: number } {
  return {
    url,
    alt,
    width: DEFAULT_OG_IMAGE_WIDTH,
    height: DEFAULT_OG_IMAGE_HEIGHT,
  };
}

function collectAbsoluteMediaUrls(
  media: Array<ProductMedia | null | undefined>,
  limit = PRODUCT_JSON_LD_IMAGE_LIMIT,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const entry of media) {
    if (!entry) {
      continue;
    }
    const href = absoluteUrl(getProductImageUrl(entry));
    if (!href || seen.has(href)) {
      continue;
    }
    seen.add(href);
    urls.push(href);
    if (urls.length >= limit) {
      break;
    }
  }
  return urls;
}

/** Prefer selected variant gallery, then product media, then any variant image. */
export function resolveProductJsonLdImageUrls(
  product: ProductDetail,
  preferredVariantId?: string | null,
): string[] {
  const preferred =
    (preferredVariantId
      ? product.variants.find((variant) => variant.id === preferredVariantId)
      : undefined) ??
    product.variants.find((variant) => variant.id === product.defaultVariantId) ??
    product.variants[0];

  const preferredGallery =
    preferred?.media && preferred.media.length > 0
      ? preferred.media
      : preferred?.image
        ? [preferred.image]
        : [];

  const fromPreferred = collectAbsoluteMediaUrls(preferredGallery);
  if (fromPreferred.length > 0) {
    return fromPreferred;
  }

  const fromProduct = collectAbsoluteMediaUrls(product.media);
  if (fromProduct.length > 0) {
    return fromProduct;
  }

  const fromVariants = collectAbsoluteMediaUrls(
    product.variants.flatMap((variant) =>
      variant.media && variant.media.length > 0
        ? variant.media
        : variant.image
          ? [variant.image]
          : [],
    ),
  );
  if (fromVariants.length > 0) {
    return fromVariants;
  }

  const fallback = resolveProductImage(product);
  return collectAbsoluteMediaUrls(fallback ? [fallback] : []);
}

export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function truncateMetaDescription(
  text: string,
  maxLength = 160,
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  const sliced = normalized.slice(0, maxLength - 1).trimEnd();
  return `${sliced}…`;
}

export function parseCatalogPage(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

/**
 * True when `?page=` is beyond the last real listing page.
 * Unknown totalPages → false (avoid false noindex / 404 on API errors).
 */
export function isCatalogPageOutOfRange(
  page: number,
  totalPages: number | null | undefined,
): boolean {
  if (page <= 1) {
    return false;
  }
  if (
    typeof totalPages !== "number" ||
    !Number.isFinite(totalPages) ||
    totalPages < 1
  ) {
    return false;
  }
  return page > totalPages;
}

export function hasCatalogSeoFilters(params: CatalogSeoSearchParams): boolean {
  return Boolean(
    params.q?.trim() ||
      params.category?.trim() ||
      params.brand?.trim() ||
      params.sort?.trim() ||
      params.minPrice?.trim() ||
      params.maxPrice?.trim() ||
      params.inStock?.trim() ||
      params.onSale?.trim() ||
      params.color?.trim() ||
      params.ram?.trim() ||
      params.storage?.trim(),
  );
}

/** Facet/search filters beyond the category path itself (for category landings). */
export function hasCategoryPageSeoFilters(
  params: Omit<CatalogSeoSearchParams, "category">,
): boolean {
  return Boolean(
    params.q?.trim() ||
      params.brand?.trim() ||
      params.sort?.trim() ||
      params.minPrice?.trim() ||
      params.maxPrice?.trim() ||
      params.inStock?.trim() ||
      params.onSale?.trim() ||
      params.color?.trim() ||
      params.ram?.trim() ||
      params.storage?.trim(),
  );
}

/** Facet/search filters beyond the brand path itself (for brand landings). */
export function hasBrandPageSeoFilters(
  params: Omit<CatalogSeoSearchParams, "brand">,
): boolean {
  return Boolean(
    params.q?.trim() ||
      params.category?.trim() ||
      params.sort?.trim() ||
      params.minPrice?.trim() ||
      params.maxPrice?.trim() ||
      params.inStock?.trim() ||
      params.onSale?.trim() ||
      params.color?.trim() ||
      params.ram?.trim() ||
      params.storage?.trim(),
  );
}

function withDefaultSocialImage(
  openGraph: NonNullable<Metadata["openGraph"]>,
  twitter?: Metadata["twitter"],
): Pick<Metadata, "openGraph" | "twitter"> {
  const imageUrl = defaultOgImageUrl();
  if (!imageUrl) {
    return { openGraph, twitter };
  }
  const ogImages = openGraph.images;
  const hasOgImage =
    (Array.isArray(ogImages) && ogImages.length > 0) ||
    (typeof ogImages === "string" && ogImages.length > 0);
  return {
    openGraph: hasOgImage
      ? openGraph
      : {
          ...openGraph,
          images: [socialOgImage(imageUrl, "IT Market")],
        },
    twitter: twitter
      ? {
          ...twitter,
          ...(!("images" in twitter) || !twitter.images
            ? { images: [imageUrl] }
            : {}),
        }
      : {
          card: "summary_large_image",
          images: [imageUrl],
        },
  };
}

function withPageSuffix(title: string, page: number): string {
  return page > 1 ? `${title} · Səhifə ${page}` : title;
}

/** Absolute hrefs for real `<link rel="prev|next">` tags (not metadata.other). */
export function buildPaginationLinkHrefs(input: {
  page: number;
  totalPages: number;
  buildPageHref: (page: number) => string;
}): { prev?: string; next?: string } {
  if (input.totalPages <= 1) {
    return {};
  }
  const result: { prev?: string; next?: string } = {};
  if (input.page > 1) {
    const href = input.buildPageHref(input.page - 1);
    result.prev = absoluteUrl(href) ?? href;
  }
  if (input.page < input.totalPages) {
    const href = input.buildPageHref(input.page + 1);
    result.next = absoluteUrl(href) ?? href;
  }
  return result;
}

export function buildHomeMetadata(
  params: CatalogSeoSearchParams = {},
  labels: { brandName?: string; categoryName?: string } = {},
): Metadata {
  const filtered = hasCatalogSeoFilters(params);
  const titleParts: string[] = [];
  const brandLabel = labels.brandName?.trim() || params.brand?.trim();
  const categoryLabel = labels.categoryName?.trim() || params.category?.trim();
  if (brandLabel) {
    titleParts.push(brandLabel);
  }
  if (categoryLabel) {
    titleParts.push(categoryLabel);
  }
  if (params.q?.trim()) {
    titleParts.push(`“${params.q.trim()}” axtarışı`);
  }

  const title =
    titleParts.length > 0
      ? titleParts.join(" · ")
      : "IT Market — Elektronika məhsulları";
  const description = filtered
    ? "IT Market kataloq filtrinin nəticələri. Əsas kataloq üçün ana səhifəyə keçin."
    : "IT Market — texnologiya məhsullarını anlaşılan məlumat və AZN qiymətləri ilə təqdim edən Azərbaycan dilli vitrin.";

  const social = withDefaultSocialImage(
    {
      type: "website",
      locale: "az_AZ",
      siteName: "IT Market",
      title: filtered ? `${title} | IT Market` : "IT Market — Elektronika məhsulları",
      description,
      url: "/",
    },
    {
      card: "summary_large_image",
      title: filtered ? `${title} | IT Market` : "IT Market — Elektronika məhsulları",
      description,
    },
  );

  return {
    title: filtered
      ? { absolute: `${title} | IT Market` }
      : { absolute: "IT Market — Elektronika məhsulları" },
    description,
    alternates: {
      canonical: "/",
      ...azPrimaryLanguageAlternates("/"),
    },
    robots: filtered ? noIndexFollowRobots : undefined,
    ...social,
  };
}

export function buildCategoryMetadata(input: {
  slug: string;
  name: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  filtered?: boolean;
  empty?: boolean;
  /** Beyond last listing page — noindex (page should 404). */
  pageOutOfRange?: boolean;
  page?: number;
}): Metadata {
  const page = input.page ?? 1;
  const basePath = `/categories/${input.slug}`;
  // Out-of-range URLs must not self-canonicalize; point to the indexable landing.
  const path =
    input.pageOutOfRange || page <= 1 ? basePath : `${basePath}?page=${page}`;
  const baseTitle = input.seoTitle?.trim() || input.name;
  const title = withPageSuffix(
    baseTitle,
    input.pageOutOfRange ? 1 : page,
  );
  const description = truncateMetaDescription(
    input.seoDescription?.trim() ||
      (input.filtered
        ? `${input.name} kateqoriyası üzrə filtr nəticələri. Tam siyahı üçün kateqoriya səhifəsinə keçin.`
        : `${input.name} məhsullarını IT Market vitrinində nəzərdən keçirin.`),
  );
  const pageUrl = absoluteUrl(path);
  const social = withDefaultSocialImage(
    {
      type: "website",
      locale: "az_AZ",
      siteName: "IT Market",
      title,
      description,
      url: pageUrl ?? path,
    },
    {
      card: "summary_large_image",
      title,
      description,
    },
  );

  const shouldNoIndex =
    input.filtered ||
    input.pageOutOfRange === true ||
    (input.empty === true && !input.filtered);

  return {
    title:
      input.filtered || (!input.pageOutOfRange && page > 1)
        ? { absolute: `${title} | IT Market` }
        : title,
    description,
    alternates: {
      canonical: path,
      ...azPrimaryLanguageAlternates(path),
    },
    robots: shouldNoIndex ? noIndexFollowRobots : undefined,
    ...social,
  };
}

export function buildBrandMetadata(input: {
  slug: string;
  name: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  filtered?: boolean;
  empty?: boolean;
  /** Beyond last listing page — noindex (page should 404). */
  pageOutOfRange?: boolean;
  page?: number;
}): Metadata {
  const page = input.page ?? 1;
  const basePath = `/brands/${input.slug}`;
  const path =
    input.pageOutOfRange || page <= 1 ? basePath : `${basePath}?page=${page}`;
  const baseTitle = input.seoTitle?.trim() || input.name;
  const title = withPageSuffix(
    baseTitle,
    input.pageOutOfRange ? 1 : page,
  );
  const description = truncateMetaDescription(
    input.seoDescription?.trim() ||
      (input.filtered
        ? `${input.name} brendi üzrə filtr nəticələri. Tam siyahı üçün brend səhifəsinə keçin.`
        : `${input.name} məhsullarını IT Market vitrinində nəzərdən keçirin.`),
  );
  const pageUrl = absoluteUrl(path);
  const social = withDefaultSocialImage(
    {
      type: "website",
      locale: "az_AZ",
      siteName: "IT Market",
      title,
      description,
      url: pageUrl ?? path,
    },
    {
      card: "summary_large_image",
      title,
      description,
    },
  );

  const shouldNoIndex =
    input.filtered ||
    input.pageOutOfRange === true ||
    (input.empty === true && !input.filtered);

  return {
    title:
      input.filtered || (!input.pageOutOfRange && page > 1)
        ? { absolute: `${title} | IT Market` }
        : title,
    description,
    alternates: {
      canonical: path,
      ...azPrimaryLanguageAlternates(path),
    },
    robots: shouldNoIndex ? noIndexFollowRobots : undefined,
    ...social,
  };
}

function resolveProductImage(
  product: ProductDetail,
  preferredVariantId?: string | null,
): ProductMedia | null {
  if (preferredVariantId) {
    const preferred = product.variants.find(
      (variant) => variant.id === preferredVariantId,
    );
    if (preferred) {
      const fromGallery =
        preferred.media && preferred.media.length > 0
          ? preferred.media[0]
          : preferred.image;
      if (fromGallery) {
        return fromGallery;
      }
    }
  }

  return (
    product.image ??
    product.media[0] ??
    product.variants.find((variant) => variant.image)?.image ??
    null
  );
}

/** Resolve shareable `?variant=` against ACTIVE variants; fall back to default. */
export function resolvePreferredProductVariant(
  product: ProductDetail,
  preferredVariantId?: string | null,
): ProductDetail["variants"][number] | undefined {
  if (preferredVariantId) {
    const match = product.variants.find(
      (variant) => variant.id === preferredVariantId,
    );
    if (match) {
      return match;
    }
  }
  return (
    product.variants.find((variant) => variant.id === product.defaultVariantId) ??
    product.variants[0]
  );
}

export function parseProductVariantQuery(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveProductSeoTitle(
  product: Pick<ProductDetail, "seoTitle">,
  displayTitle: string,
): string {
  return product.seoTitle?.trim() || displayTitle;
}

export function resolveProductSeoDescription(
  product: Pick<ProductDetail, "seoDescription" | "description">,
  displayTitle: string,
): string {
  const fromSeo = product.seoDescription?.trim();
  if (fromSeo) {
    return truncateMetaDescription(fromSeo);
  }
  const fromDescription = product.description?.trim();
  if (fromDescription) {
    return truncateMetaDescription(fromDescription);
  }
  return truncateMetaDescription(`${displayTitle} IT Market vitrinində.`);
}

export function mapBarcodeToGtin(
  barcode: string | null | undefined,
): { gtin?: string; gtin8?: string; gtin13?: string } {
  if (!barcode) {
    return {};
  }
  const digits = barcode.replace(/\D/g, "");
  if (digits.length === 8) {
    return { gtin8: digits, gtin: digits };
  }
  if (digits.length === 12 || digits.length === 13) {
    return { gtin13: digits.length === 12 ? `0${digits}` : digits, gtin: digits };
  }
  if (digits.length === 14) {
    return { gtin: digits };
  }
  return {};
}

export function buildProductSocialMetadata(input: {
  slug: string;
  title: string;
  description: string;
  image?: ProductMedia | null;
  /** Extra absolute or site-relative image URLs (gallery), primary first. */
  images?: string[];
  price?: string | null;
  currency?: string;
}): Metadata {
  const path = `/products/${input.slug}`;
  const imagePath = getProductImageUrl(input.image);
  const imageUrl = absoluteUrl(imagePath);
  const fallbackImageUrl = imageUrl ? undefined : defaultOgImageUrl();
  const pageUrl = absoluteUrl(path);
  const galleryUrls = (input.images ?? [])
    .map((entry) => (entry.startsWith("http") ? entry : absoluteUrl(entry)))
    .filter((entry): entry is string => Boolean(entry));
  const socialImageUrls = [
    ...new Set(
      [imageUrl, ...galleryUrls, fallbackImageUrl].filter(
        (entry): entry is string => Boolean(entry),
      ),
    ),
  ].slice(0, PRODUCT_JSON_LD_IMAGE_LIMIT);
  const socialImageUrl = socialImageUrls[0];
  const imageAlt = input.image?.altText?.trim() || input.title;

  const twitterSite = twitterSiteHandle();
  // Next Metadata OpenGraph typing / merge drops unsupported `product` type and
  // can omit the whole openGraph tree. Keep a valid `website` type for reliable
  // title/description/image emission; product commerce type + price go in `other`.
  const openGraph: NonNullable<Metadata["openGraph"]> = {
    type: "website",
    locale: "az_AZ",
    siteName: "IT Market",
    title: input.title,
    description: input.description,
    url: pageUrl ?? path,
    ...(socialImageUrls.length > 0
      ? {
          images: socialImageUrls.map((url) => socialOgImage(url, imageAlt)),
        }
      : {}),
  };

  return {
    title: { absolute: `${input.title} | IT Market` },
    description: input.description,
    alternates: {
      canonical: path,
      ...azPrimaryLanguageAlternates(path),
    },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(twitterSite ? { site: twitterSite } : {}),
      ...(socialImageUrl ? { images: [socialImageUrl] } : {}),
    },
    other: {
      ...(input.price
        ? {
            "product:price:amount": input.price,
            "product:price:currency": input.currency ?? "AZN",
          }
        : {}),
    },
  };
}

export function buildLegalPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  /** Defaults to website; blog posts should pass `article`. */
  openGraphType?: "website" | "article";
  imagePath?: string | null;
  /** ISO calendar date YYYY-MM-DD (article OG / Twitter). */
  publishedTime?: string;
  /** ISO calendar date YYYY-MM-DD (article OG). */
  modifiedTime?: string;
}): Metadata {
  const pageUrl = absoluteUrl(input.path) ?? input.path;
  const ogType = input.openGraphType ?? "website";
  const customImagePath = input.imagePath?.trim();
  const customImageUrl = customImagePath
    ? absoluteUrl(customImagePath)
    : undefined;
  const publishedIso = input.publishedTime?.trim()
    ? `${input.publishedTime.trim()}T12:00:00+04:00`
    : undefined;
  const modifiedIso = input.modifiedTime?.trim()
    ? `${input.modifiedTime.trim()}T12:00:00+04:00`
    : publishedIso;

  const openGraphBase: NonNullable<Metadata["openGraph"]> = {
    type: ogType,
    locale: "az_AZ",
    siteName: "IT Market",
    title: input.title,
    description: input.description,
    url: pageUrl,
    ...(customImageUrl
      ? {
          images: [
            socialOgImage(customImageUrl, input.title),
          ],
        }
      : {}),
    ...(ogType === "article" && publishedIso
      ? {
          publishedTime: publishedIso,
          ...(modifiedIso ? { modifiedTime: modifiedIso } : {}),
        }
      : {}),
  };

  const social = withDefaultSocialImage(openGraphBase, {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    ...(customImageUrl ? { images: [customImageUrl] } : {}),
  });

  const twitterSite = twitterSiteHandle();
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
      ...azPrimaryLanguageAlternates(input.path),
    },
    ...social,
    ...(twitterSite
      ? {
          twitter: {
            ...(typeof social.twitter === "object" && social.twitter
              ? social.twitter
              : { card: "summary_large_image" as const }),
            site: twitterSite,
          },
        }
      : {}),
  };
}

function offerPriceValidUntil(from = new Date()): string {
  const date = new Date(from);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Baseline Bakı standard delivery fee (AZN).
 * Source of truth: apps/api `BAKU_STANDARD_DELIVERY_FEE_AZN`.
 * Free shipping applies only for Bakı standard orders ≥ 500 AZN — do not
 * advertise `0` as the sole Offer rate (overclaim).
 */
export const SCHEMA_BAKU_STANDARD_SHIPPING_RATE_AZN = "10";

/** Free-delivery threshold for Bakı standard (AZN). API: BAKU_FREE_DELIVERY_MINIMUM_AZN. */
export const SCHEMA_BAKU_FREE_SHIPPING_MINIMUM_AZN = "500";

export function buildMerchantReturnPolicyJsonLd() {
  const returnsUrl = absoluteUrl("/returns") ?? "https://it-market.org/returns";
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "AZ",
    returnPolicyCategory:
      "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    // Store handover + agreed courier; voluntary returns do not promise free logistics.
    returnMethod: [
      "https://schema.org/ReturnInStore",
      "https://schema.org/ReturnByMail",
    ],
    returnFees:
      "https://schema.org/ReturnShippingFeesCustomerResponsibility",
    url: returnsUrl,
  };
}

/**
 * Honest Bakı standard shipping baseline.
 * Free-over-500 is conditional (Bakı only) — do not emit a second `0 AZN`
 * OfferShippingDetails (rich results would overclaim free shipping).
 * Full zone/express rules: /delivery-payment.
 */
export function buildOfferShippingDetailsJsonLd() {
  const deliveryUrl =
    absoluteUrl("/delivery-payment") ?? "https://it-market.org/delivery-payment";
  return {
    "@type": "OfferShippingDetails",
    name: `Bakı standart çatdırılma (pulsuz ≥ ${SCHEMA_BAKU_FREE_SHIPPING_MINIMUM_AZN} AZN)`,
    shippingRate: {
      "@type": "MonetaryAmount",
      value: SCHEMA_BAKU_STANDARD_SHIPPING_RATE_AZN,
      currency: "AZN",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "AZ",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 5,
        unitCode: "DAY",
      },
    },
    url: deliveryUrl,
  };
}

function productVariantPath(slug: string, variantId: string): string {
  return `/products/${slug}?variant=${encodeURIComponent(variantId)}`;
}

export function buildProductJsonLd(
  product: ProductDetail,
  displayTitle: string,
  preferredVariantId?: string | null,
) {
  const path = `/products/${product.slug}`;
  const pageUrl = absoluteUrl(path) ?? path;
  const imageUrls = resolveProductJsonLdImageUrls(product, preferredVariantId);
  const description = resolveProductSeoDescription(product, displayTitle);
  const defaultVariant = resolvePreferredProductVariant(
    product,
    preferredVariantId,
  );
  const sellerUrl = getStorefrontOrigin()?.href ?? "https://it-market.org/";
  const priceValidUntil = offerPriceValidUntil();
  const returnPolicy = buildMerchantReturnPolicyJsonLd();
  const shippingDetails = buildOfferShippingDetailsJsonLd();
  const multiVariant = product.variants.length > 1;

  const offers = product.variants.map((variant) => {
    const variantPath = productVariantPath(product.slug, variant.id);
    return {
      "@type": "Offer",
      name: variant.name?.trim() || displayTitle,
      url: absoluteUrl(variantPath) ?? variantPath,
      priceCurrency: "AZN",
      price: variant.price,
      sku: variant.sku,
      ...(variant.sku?.trim() ? { mpn: variant.sku.trim() } : {}),
      ...mapBarcodeToGtin(variant.barcode),
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: resolveOfferAvailability(
        variant.available,
        variant.availableByOrder,
      ),
      seller: {
        "@type": "Organization",
        name: "IT Market",
        url: sellerUrl,
      },
      hasMerchantReturnPolicy: returnPolicy,
      shippingDetails,
    };
  });

  const defaultVariantId = defaultVariant?.id;
  const variantReviews =
    defaultVariantId === undefined
      ? product.reviews
      : product.reviews.filter((review) => review.variantId === defaultVariantId);
  const reviewCount = variantReviews.length;
  const averageRating =
    reviewCount === 0
      ? null
      : Math.round(
          (variantReviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount) *
            10,
        ) / 10;

  const aggregateRating =
    reviewCount > 0 && averageRating !== null
      ? {
          "@type": "AggregateRating",
          ratingValue: averageRating,
          reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const reviewNodes =
    variantReviews.length > 0
      ? variantReviews.slice(0, 5).map((review) => ({
          "@type": "Review",
          author: {
            "@type": "Person",
            name: review.authorName,
          },
          datePublished: review.createdAt,
          reviewRating: {
            "@type": "Rating",
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
          ...(review.comment?.trim()
            ? { reviewBody: review.comment.trim() }
            : {}),
        }))
      : undefined;

  if (multiVariant) {
    const variesBy: string[] = [];
    const attributeKeys = new Set<string>();
    for (const variant of product.variants) {
      for (const key of Object.keys(variant.attributes)) {
        attributeKeys.add(key);
      }
    }

    const colorKeys = ["Rəng", "rəng", "Color", "color", "Renk", "renk"];
    const storageKeys = ["Daimi yaddaş", "daimi yaddaş", "Yaddaş", "yaddaş", "Storage", "storage", "ROM", "rom"];
    const ramKeys = ["Müvəqqəti yaddaş", "müvəqqəti yaddaş", "Muveqqeti yaddas", "RAM", "ram"];

    if (colorKeys.some((key) => attributeKeys.has(key))) {
      variesBy.push("https://schema.org/color");
    }
    if (storageKeys.some((key) => attributeKeys.has(key))) {
      variesBy.push("https://schema.org/storageSize");
    }
    if (ramKeys.some((key) => attributeKeys.has(key))) {
      variesBy.push("https://schema.org/memorySize");
    }

    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: displayTitle,
      description,
      url: pageUrl,
      productGroupID: product.id,
      ...(product.category?.name
        ? { category: product.category.name }
        : {}),
      ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
      ...(product.brand
        ? {
            brand: {
              "@type": "Brand",
              name: product.brand.name,
            },
          }
        : {}),
      ...(variesBy.length > 0 ? { variesBy } : {}),
      hasVariant: product.variants.map((variant) => {
        const variantPath = productVariantPath(product.slug, variant.id);
        const variantUrl = absoluteUrl(variantPath) ?? variantPath;
        const variantImageUrls = resolveProductJsonLdImageUrls(
          product,
          variant.id,
        );
        const additionalProperty = productSpecAdditionalProperties(
          product,
          variant,
        );
        return {
          "@type": "Product",
          name: variant.name?.trim() || displayTitle,
          sku: variant.sku,
          ...(variant.sku?.trim() ? { mpn: variant.sku.trim() } : {}),
          ...mapBarcodeToGtin(variant.barcode),
          url: variantUrl,
          ...(variantImageUrls.length > 0 ? { image: variantImageUrls } : {}),
          ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
          offers: offers.find((offer) => offer.sku === variant.sku) ?? {
            "@type": "Offer",
            url: variantUrl,
            priceCurrency: "AZN",
            price: variant.price,
            availability: resolveOfferAvailability(
              variant.available,
              variant.availableByOrder,
            ),
          },
        };
      }),
      ...(aggregateRating ? { aggregateRating } : {}),
      ...(reviewNodes ? { review: reviewNodes } : {}),
    };
  }

  const singleAdditionalProperty = productSpecAdditionalProperties(
    product,
    defaultVariant,
  );

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayTitle,
    description,
    url: pageUrl,
    ...(product.category?.name
      ? { category: product.category.name }
      : {}),
    ...(defaultVariant?.sku ? { sku: defaultVariant.sku } : {}),
    ...(defaultVariant?.sku?.trim()
      ? { mpn: defaultVariant.sku.trim() }
      : {}),
    ...(defaultVariant
      ? mapBarcodeToGtin(defaultVariant.barcode)
      : {}),
    ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
    ...(product.brand
      ? {
          brand: {
            "@type": "Brand",
            name: product.brand.name,
          },
        }
      : {}),
    ...(singleAdditionalProperty.length > 0
      ? { additionalProperty: singleAdditionalProperty }
      : {}),
    offers,
  };

  if (aggregateRating) {
    jsonLd.aggregateRating = aggregateRating;
  }
  if (reviewNodes) {
    jsonLd.review = reviewNodes;
  }

  return jsonLd;
}

export function buildBlogPostingJsonLd(input: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  /** Optional ISO calendar date when the post was last revised. */
  updatedAt?: string;
  tags?: string[];
  imagePath?: string | null;
}) {
  const path = `/blog/${input.slug}`;
  const pageUrl = absoluteUrl(path) ?? path;
  const publisherUrl = getStorefrontOrigin()?.href ?? "https://it-market.org/";
  const modifiedDate = input.updatedAt?.trim() || input.publishedAt;
  const imageUrl =
    absoluteUrl(input.imagePath?.trim() || DEFAULT_OG_IMAGE_PATH) ??
    defaultOgImageUrl();
  const logoUrl =
    absoluteUrl(ORGANIZATION_LOGO_PATH) ??
    `${publisherUrl.replace(/\/$/, "")}${ORGANIZATION_LOGO_PATH}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: truncateMetaDescription(input.description, 300),
    datePublished: `${input.publishedAt}T12:00:00+04:00`,
    dateModified: `${modifiedDate}T12:00:00+04:00`,
    inLanguage: "az",
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(input.tags && input.tags.length > 0 ? { keywords: input.tags.join(", ") } : {}),
    author: {
      "@type": "Organization",
      name: "IT Market",
      url: publisherUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "IT Market",
      url: publisherUrl,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
  };
}

export function buildBlogJsonLd(input: {
  name: string;
  description?: string;
  posts: Array<{ slug: string; title: string; publishedAt: string }>;
}) {
  const pageUrl = absoluteUrl("/blog") ?? "/blog";
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: input.name,
    ...(input.description?.trim()
      ? { description: truncateMetaDescription(input.description, 300) }
      : {}),
    url: pageUrl,
    inLanguage: "az",
    blogPost: input.posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absoluteUrl(`/blog/${post.slug}`) ?? `/blog/${post.slug}`,
      datePublished: `${post.publishedAt}T12:00:00+04:00`,
    })),
  };
}

export function buildFaqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  const pageUrl = absoluteUrl("/faq") ?? "/faq";
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    inLanguage: "az",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildOrganizationJsonLd() {
  const origin = getStorefrontOrigin();
  const url = origin?.href ?? "https://it-market.org/";
  const logo =
    absoluteUrl(ORGANIZATION_LOGO_PATH) ??
    `${url.replace(/\/$/, "")}${ORGANIZATION_LOGO_PATH}`;
  const geo = organizationGeoCoordinates();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IT Market",
    url,
    logo,
    email: "info@it-market.org",
    telephone: ["+994512509585", "+994512509586"],
    address: {
      "@type": "PostalAddress",
      streetAddress: "28 may küçəsi 69C",
      addressLocality: "Bakı",
      addressCountry: "AZ",
    },
    sameAs: [...ORGANIZATION_SAME_AS],
    hasMap: ORGANIZATION_HAS_MAP,
    ...(geo ? { geo } : {}),
  };
}

type WorkingHoursDay = {
  open?: string;
  close?: string;
  closed?: boolean;
};

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const WEEKDAY_SCHEMA = [
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
  "https://schema.org/Sunday",
] as const;

function openingHoursFromWorkingHours(
  workingHours: unknown,
): Array<Record<string, unknown>> | undefined {
  if (
    typeof workingHours !== "object" ||
    workingHours === null ||
    Array.isArray(workingHours)
  ) {
    return undefined;
  }
  const record = workingHours as Record<string, WorkingHoursDay>;
  const specs: Array<Record<string, unknown>> = [];
  for (let index = 0; index < WEEKDAY_KEYS.length; index += 1) {
    const day = record[WEEKDAY_KEYS[index]];
    if (!day || day.closed || !day.open || !day.close) {
      continue;
    }
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: WEEKDAY_SCHEMA[index],
      opens: day.open,
      closes: day.close,
    });
  }
  return specs.length > 0 ? specs : undefined;
}

export function buildLocalBusinessJsonLd(
  pickup?: PickupLocationSummary | null,
) {
  const organization = buildOrganizationJsonLd();
  const openingHours = openingHoursFromWorkingHours(pickup?.workingHours);
  return {
    ...organization,
    "@type": ["Organization", "Store", "LocalBusiness"],
    ...(pickup?.name ? { name: "IT Market", alternateName: pickup.name } : {}),
    ...(pickup?.addressLine
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: pickup.addressLine.replace(/,\s*Bakı.*$/i, "").trim(),
            addressLocality: "Bakı",
            addressCountry: "AZ",
          },
        }
      : {}),
    ...(openingHours ? { openingHoursSpecification: openingHours } : {}),
    priceRange: "$$",
  };
}

export function buildWebSiteJsonLd() {
  const origin = getStorefrontOrigin();
  const url = origin?.href ?? "https://it-market.org/";

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IT Market",
    url,
    inLanguage: "az",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url.replace(/\/$/, "")}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type BreadcrumbTrailItem = {
  name: string;
  path: string;
};

export function buildCategoryAncestorTrail(
  category: Pick<CategorySummary, "id" | "name" | "slug" | "parentId">,
  categories: CategorySummary[],
): BreadcrumbTrailItem[] {
  const byId = new Map(categories.map((entry) => [entry.id, entry]));
  const chain: CategorySummary[] = [];
  let current: CategorySummary | undefined =
    byId.get(category.id) ??
    categories.find((entry) => entry.slug === category.slug);

  while (current) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain.map((entry) => ({
    name: entry.name,
    path: `/categories/${entry.slug}`,
  }));
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbTrailItem[], homeName = "Əsas səhifə") {
  const homeUrl = absoluteUrl("/") ?? "/";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: homeName,
        item: homeUrl,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: absoluteUrl(item.path) ?? item.path,
      })),
    ],
  };
}

export function buildCollectionPageJsonLd(input: {
  name: string;
  description?: string | null;
  path: string;
  products: ProductSummary[];
}) {
  const pageUrl = absoluteUrl(input.path) ?? input.path;
  const seenSlugs = new Set<string>();
  const uniqueProducts: ProductSummary[] = [];
  for (const product of input.products) {
    if (seenSlugs.has(product.slug)) {
      continue;
    }
    seenSlugs.add(product.slug);
    uniqueProducts.push(product);
  }
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    ...(input.description?.trim()
      ? { description: truncateMetaDescription(input.description, 300) }
      : {}),
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: uniqueProducts.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/products/${product.slug}`) ?? `/products/${product.slug}`,
        name: product.name,
      })),
    },
  };
}

export function resolveProductSocialImage(
  product: ProductDetail,
  preferredVariantId?: string | null,
): ProductMedia | null {
  return resolveProductImage(product, preferredVariantId);
}

export function brandLandingPath(brand: Pick<BrandSummary, "slug">): string {
  return `/brands/${brand.slug}`;
}
