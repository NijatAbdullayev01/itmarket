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
          images: [{ url: imageUrl, alt: "IT Market" }],
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
      : "IT Market — texnologiya vitrini";
  const description = filtered
    ? "IT Market kataloq filtrinin nəticələri. Əsas kataloq üçün ana səhifəyə keçin."
    : "IT Market — texnologiya məhsullarını anlaşılan məlumat və AZN qiymətləri ilə təqdim edən Azərbaycan dilli vitrin.";

  const social = withDefaultSocialImage(
    {
      title: filtered ? `${title} | IT Market` : "IT Market — texnologiya vitrini",
      description,
      url: "/",
    },
    {
      card: "summary_large_image",
      title: filtered ? `${title} | IT Market` : "IT Market — texnologiya vitrini",
      description,
    },
  );

  return {
    title: filtered ? { absolute: `${title} | IT Market` } : undefined,
    description,
    alternates: { canonical: "/" },
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
  page?: number;
}): Metadata {
  const page = input.page ?? 1;
  const basePath = `/categories/${input.slug}`;
  const path = page > 1 ? `${basePath}?page=${page}` : basePath;
  const baseTitle = input.seoTitle?.trim() || input.name;
  const title = withPageSuffix(baseTitle, page);
  const description = truncateMetaDescription(
    input.seoDescription?.trim() ||
      (input.filtered
        ? `${input.name} kateqoriyası üzrə filtr nəticələri. Tam siyahı üçün kateqoriya səhifəsinə keçin.`
        : `${input.name} məhsullarını IT Market vitrinində nəzərdən keçirin.`),
  );
  const pageUrl = absoluteUrl(path);
  const social = withDefaultSocialImage(
    {
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

  return {
    title: input.filtered || page > 1 ? { absolute: `${title} | IT Market` } : title,
    description,
    alternates: { canonical: path },
    robots: input.filtered ? noIndexFollowRobots : undefined,
    ...social,
  };
}

export function buildBrandMetadata(input: {
  slug: string;
  name: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  filtered?: boolean;
  page?: number;
}): Metadata {
  const page = input.page ?? 1;
  const basePath = `/brands/${input.slug}`;
  const path = page > 1 ? `${basePath}?page=${page}` : basePath;
  const baseTitle = input.seoTitle?.trim() || input.name;
  const title = withPageSuffix(baseTitle, page);
  const description = truncateMetaDescription(
    input.seoDescription?.trim() ||
      (input.filtered
        ? `${input.name} brendi üzrə filtr nəticələri. Tam siyahı üçün brend səhifəsinə keçin.`
        : `${input.name} məhsullarını IT Market vitrinində nəzərdən keçirin.`),
  );
  const pageUrl = absoluteUrl(path);
  const social = withDefaultSocialImage(
    {
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

  return {
    title: input.filtered || page > 1 ? { absolute: `${title} | IT Market` } : title,
    description,
    alternates: { canonical: path },
    robots: input.filtered ? noIndexFollowRobots : undefined,
    ...social,
  };
}

function resolveProductImage(
  product: ProductDetail,
): ProductMedia | null {
  return (
    product.image ??
    product.media[0] ??
    product.variants.find((variant) => variant.image)?.image ??
    null
  );
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
  price?: string | null;
  currency?: string;
}): Metadata {
  const path = `/products/${input.slug}`;
  const imagePath = getProductImageUrl(input.image);
  const imageUrl = absoluteUrl(imagePath);
  const fallbackImageUrl = imageUrl ? undefined : defaultOgImageUrl();
  const pageUrl = absoluteUrl(path);
  const socialImageUrl = imageUrl ?? fallbackImageUrl;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: path },
    openGraph: {
      locale: "az_AZ",
      siteName: "IT Market",
      title: input.title,
      description: input.description,
      url: pageUrl ?? path,
      ...(socialImageUrl
        ? {
            images: [
              {
                url: socialImageUrl,
                alt: input.image?.altText?.trim() || input.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(socialImageUrl ? { images: [socialImageUrl] } : {}),
    },
    other: {
      "og:type": "product",
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
}): Metadata {
  const pageUrl = absoluteUrl(input.path) ?? input.path;
  const social = withDefaultSocialImage(
    {
      type: "website",
      locale: "az_AZ",
      siteName: "IT Market",
      title: input.title,
      description: input.description,
      url: pageUrl,
    },
    {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  );

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    ...social,
  };
}

function offerPriceValidUntil(from = new Date()): string {
  const date = new Date(from);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function buildProductJsonLd(product: ProductDetail, displayTitle: string) {
  const path = `/products/${product.slug}`;
  const pageUrl = absoluteUrl(path) ?? path;
  const image = resolveProductImage(product);
  const imageUrl = absoluteUrl(getProductImageUrl(image));
  const description = resolveProductSeoDescription(product, displayTitle);
  const defaultVariant =
    product.variants.find((variant) => variant.id === product.defaultVariantId) ??
    product.variants[0];
  const sellerUrl = getStorefrontOrigin()?.href ?? "https://it-market.org/";
  const priceValidUntil = offerPriceValidUntil();

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
    ...(defaultVariant
      ? mapBarcodeToGtin(defaultVariant.barcode)
      : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(product.brand
      ? {
          brand: {
            "@type": "Brand",
            name: product.brand.name,
          },
        }
      : {}),
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: variant.name?.trim() || displayTitle,
      url: pageUrl,
      priceCurrency: "AZN",
      price: variant.price,
      sku: variant.sku,
      ...mapBarcodeToGtin(variant.barcode),
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        variant.available > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "IT Market",
        url: sellerUrl,
      },
    })),
  };

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

  if (reviewCount > 0 && averageRating !== null) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: averageRating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (variantReviews.length > 0) {
    jsonLd.review = variantReviews.slice(0, 5).map((review) => ({
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
    }));
  }

  return jsonLd;
}

export function buildOrganizationJsonLd() {
  const origin = getStorefrontOrigin();
  const url = origin?.href ?? "https://it-market.org/";
  const logo = absoluteUrl("/favicon.png") ?? `${url.replace(/\/$/, "")}/favicon.png`;

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
      itemListElement: input.products.map((product, index) => ({
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
): ProductMedia | null {
  return resolveProductImage(product);
}

export function brandLandingPath(brand: Pick<BrandSummary, "slug">): string {
  return `/brands/${brand.slug}`;
}
