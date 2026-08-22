import { Suspense } from "react";

import { addToCart, buyNow } from "@/app/actions";
import {
  CompanionProductsFallback,
  CompanionProductsSection,
} from "@/components/companion-products-section";
import { ProductHeroSection } from "@/components/product-hero-section";
import { SimilarProductsSection } from "@/components/similar-products-section";
import { ApiUnavailableError, type ProductDetail } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";
import { getCustomerChromeProfile } from "@/lib/customer-session";
import { loadStorefrontProduct } from "@/lib/load-storefront-product";
import {
  getStorefrontProductDisplayTitle,
  getStorefrontProductDisplayTitleFromSummary,
} from "@/lib/product-display-title";
import { BlogGuideLinks } from "@/components/blog-guide-links";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import {
  getBlogGuidesForCategory,
  getBlogPageContent,
} from "@/lib/i18n/blog/blog";
import {
  buildProductJsonLd,
  buildProductSocialMetadata,
  noIndexRobots,
  parseProductVariantQuery,
  resolvePreferredProductVariant,
  resolveProductJsonLdImageUrls,
  resolveProductSeoDescription,
  resolveProductSeoTitle,
  resolveProductSocialImage,
  toJsonLd,
} from "@/lib/seo";
import { EmptyState, EmptyStateLink, PageLoading } from "@itmarket/ui";

/** Align with catalog ISR so PDP HTML/JSON-LD refresh on a known cadence. */
export const revalidate = 120;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const preferredVariantId = parseProductVariantQuery(query.variant);

  try {
    const product = await loadStorefrontProduct(slug);
    const preferredVariant = resolvePreferredProductVariant(
      product,
      preferredVariantId,
    );
    const displayTitle = preferredVariant
      ? getStorefrontProductDisplayTitle(product, preferredVariant)
      : getStorefrontProductDisplayTitleFromSummary(product);
    const title = resolveProductSeoTitle(product, displayTitle);
    const description = resolveProductSeoDescription(product, displayTitle);

    const avail = preferredVariant
      ? preferredVariant.available > 0
        ? "in stock"
        : preferredVariant.availableByOrder
          ? "backorder"
          : "out of stock"
      : product.available > 0
        ? "in stock"
        : "out of stock";

    return buildProductSocialMetadata({
      slug,
      title,
      description,
      image: resolveProductSocialImage(product, preferredVariant?.id),
      images: resolveProductJsonLdImageUrls(product, preferredVariant?.id),
      price: preferredVariant?.price ?? product.price,
      currency: preferredVariant?.currency ?? product.currency,
      availability: avail,
      brand: product.brand?.name,
      sku: preferredVariant?.sku ?? product.defaultVariantId ?? undefined,
    });
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      const locale = await getRequestLocale();
      const m = getMessages(locale);
      return {
        title: m.catalog.apiUnavailableTitle,
        robots: noIndexRobots,
      };
    }
    throw error;
  }
}

async function ProductBuyingGuides({ product }: { product: ProductDetail }) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const blogCopy = getBlogPageContent(locale);
  const posts = getBlogGuidesForCategory(
    locale,
    [product.category?.slug, product.category?.parentSlug],
    3,
  );
  return (
    <BlogGuideLinks
      title={messages.product.buyingGuidesAria}
      posts={posts}
      readMoreLabel={blogCopy.readMore}
      readingTimeLabel={blogCopy.readingTimeLabel}
      allGuidesLabel={blogCopy.allGuides}
    />
  );
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  const [locale, { slug }, query, cartSession, customer] = await Promise.all([
    getRequestLocale(),
    params,
    searchParams,
    getGuestCartSession(),
    getCustomerChromeProfile(),
  ]);
  const messages = getMessages(locale);
  const preferredVariantId = parseProductVariantQuery(query.variant);

  let product: ProductDetail | undefined;
  let cartVariantIds: string[] = [];
  let apiUnavailable = false;

  try {
    const [resolvedProduct, variants] = await Promise.all([
      loadStorefrontProduct(slug),
      getCartVariantIds(cartSession.cartId),
    ]);
    product = resolvedProduct;
    cartVariantIds = variants;
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      apiUnavailable = true;
      cartVariantIds = await getCartVariantIds(cartSession.cartId);
    } else {
      throw error;
    }
  }

  if (apiUnavailable || product === undefined) {
    return (
      <div className="ui-container ui-product-page">
        <EmptyState
          title={messages.catalog.apiUnavailableTitle}
          description={messages.catalog.apiUnavailableDescription}
          action={<EmptyStateLink href="/" label={messages.common.backToHome} />}
        />
      </div>
    );
  }

  const preferredVariant = resolvePreferredProductVariant(
    product,
    preferredVariantId,
  );
  const displayTitle = preferredVariant
    ? getStorefrontProductDisplayTitle(product, preferredVariant)
    : getStorefrontProductDisplayTitleFromSummary(product);

  return (
    <div className="ui-container ui-product-page">
      <ProductHeroSection
        cartId={cartSession.cartId ?? ""}
        cartVariantIds={cartVariantIds}
        product={product}
        customerEmail={customer?.email}
        customerFirstName={customer?.firstName ?? undefined}
        customerLastName={customer?.lastName ?? undefined}
        companionSlot={
          <Suspense
            key="companion-products-slot"
            fallback={
              <CompanionProductsFallback
                ariaLabel={messages.product.companionAria}
              />
            }
          >
            <CompanionProductsSection
              slug={slug}
              cartId={cartSession.cartId ?? ""}
              buyNowAction={buyNow}
            />
          </Suspense>
        }
        addToCartAction={addToCart}
        buyNowAction={buyNow}
      />

      {/* Stream similar products after hero so the buy box paints first. */}
      <Suspense
        fallback={
          <PageLoading
            variant="catalog"
            showTitle={false}
            framed={false}
            label={messages.product.similarLoading}
          />
        }
      >
        <SimilarProductsSection
          slug={slug}
          cartId={cartSession.cartId}
          cartVariantIds={cartVariantIds}
        />
      </Suspense>

      <ProductBuyingGuides product={product} />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildProductJsonLd(product, displayTitle, preferredVariant?.id),
          ),
        }}
      />
    </div>
  );
}
