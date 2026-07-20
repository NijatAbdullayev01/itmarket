import { addToCart, buyNow } from "@/app/actions";
import { ProductHeroSection } from "@/components/product-hero-section";
import { SimilarProductsSection } from "@/components/similar-products-section";
import {
  ApiUnavailableError,
  listCompanionProducts,
  type ProductDetail,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";
import { getCustomerProfile } from "@/lib/customer-session";
import { loadStorefrontProduct } from "@/lib/load-storefront-product";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";
import { EmptyState, EmptyStateLink } from "@itmarket/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadStorefrontProduct(slug);
  const displayTitle = getStorefrontProductDisplayTitleFromSummary(product);
  return {
    title: displayTitle,
    description:
      product.description ?? `${displayTitle} IT Market vitrinində.`,
    alternates: { canonical: `/products/${slug}` },
  };
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
  const cartVariantIds = await getCartVariantIds(cartSession.cartId);

  let product: ProductDetail | undefined;
  let companionProducts = { items: [] as Awaited<ReturnType<typeof listCompanionProducts>>["items"] };
  let apiUnavailable = false;

  try {
    product = await loadStorefrontProduct(slug);
    companionProducts = await listCompanionProducts(slug);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      apiUnavailable = true;
    } else {
      throw error;
    }
  }

  if (apiUnavailable || product === undefined) {
    return (
      <div className="ui-container ui-product-page">
        <EmptyState
          title="Məhsul hazır deyil"
          description="API server hazır deyil. Zəhmət olmasa bir az sonra yenidən yoxlayın."
          action={<EmptyStateLink href="/" label="Ana səhifəyə qayıt" />}
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
        companionProducts={companionProducts.items}
        addToCartAction={addToCart}
        buyNowAction={buyNow}
      />

      <SimilarProductsSection
        slug={slug}
        cartId={cartSession.cartId}
        cartVariantIds={cartVariantIds}
      />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: displayTitle,
            sku: product.variants[0]?.sku,
            offers: product.variants.map((variant) => ({
              "@type": "Offer",
              priceCurrency: "AZN",
              price: variant.price,
              availability:
                variant.available > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            })),
          }),
        }}
      />
    </div>
  );
}
