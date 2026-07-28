import { Suspense } from "react";

import { addToCart, buyNow } from "@/app/actions";
import { ProductHeroSection } from "@/components/product-hero-section";
import { SimilarProductsSection } from "@/components/similar-products-section";
import {
  ApiUnavailableError,
  listCompanionProducts,
  type ProductDetail,
  type ProductSummary,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";
import { getCustomerProfile } from "@/lib/customer-session";
import { loadStorefrontProduct } from "@/lib/load-storefront-product";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import {
  buildProductJsonLd,
  buildProductSocialMetadata,
  noIndexRobots,
  resolveProductSeoDescription,
  resolveProductSeoTitle,
  resolveProductSocialImage,
  toJsonLd,
} from "@/lib/seo";
import { EmptyState, EmptyStateLink, PageLoading } from "@itmarket/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const product = await loadStorefrontProduct(slug);
    const displayTitle = getStorefrontProductDisplayTitleFromSummary(product);
    const title = resolveProductSeoTitle(product, displayTitle);
    const description = resolveProductSeoDescription(product, displayTitle);

    return buildProductSocialMetadata({
      slug,
      title,
      description,
      image: resolveProductSocialImage(product),
      price: product.price,
      currency: product.currency,
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

async function loadCompanions(slug: string): Promise<ProductSummary[]> {
  try {
    const result = await listCompanionProducts(slug);
    return result.items;
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return [];
    }
    throw error;
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, cartSession, customer] = await Promise.all([
    params,
    getGuestCartSession(),
    getCustomerProfile(),
  ]);

  let product: ProductDetail | undefined;
  let companionProducts: ProductSummary[] = [];
  let cartVariantIds: string[] = [];
  let apiUnavailable = false;

  try {
    // Product + companions + cart variants in parallel — companions only need slug.
    const [resolvedProduct, companions, variants] = await Promise.all([
      loadStorefrontProduct(slug),
      loadCompanions(slug),
      getCartVariantIds(cartSession.cartId),
    ]);
    product = resolvedProduct;
    companionProducts = companions;
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
    const locale = await getRequestLocale();
    const messages = getMessages(locale);
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

  const displayTitle = getStorefrontProductDisplayTitleFromSummary(product);

  return (
    <div className="ui-container ui-product-page">
      <ProductHeroSection
        cartId={cartSession.cartId ?? ""}
        cartVariantIds={cartVariantIds}
        product={product}
        customerEmail={customer?.email}
        customerFirstName={customer?.firstName ?? undefined}
        customerLastName={customer?.lastName ?? undefined}
        companionProducts={companionProducts}
        addToCartAction={addToCart}
        buyNowAction={buyNow}
      />

      {/* Stream similar products after hero so loading.tsx clears sooner. */}
      <Suspense
        fallback={
          <PageLoading
            variant="catalog"
            showTitle={false}
            framed={false}
            label="Oxşar məhsullar yüklənir…"
          />
        }
      >
        <SimilarProductsSection
          slug={slug}
          cartId={cartSession.cartId}
          cartVariantIds={cartVariantIds}
        />
      </Suspense>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildProductJsonLd(product, displayTitle)),
        }}
      />
    </div>
  );
}
