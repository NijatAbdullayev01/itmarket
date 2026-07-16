import { addToCart, buyNow } from "@/app/actions";
import { ProductBuyBox } from "@/components/product-buy-box";
import { SimilarProductsSection } from "@/components/similar-products-section";
import {
  ApiError,
  ApiUnavailableError,
  getProduct,
  listCompanionProducts,
  type ProductDetail,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";
import { getCustomerProfile } from "@/lib/customer-session";
import { formatAznValue } from "@/lib/format-azn";
import { EmptyState, EmptyStateLink, ProductGallery, ProductInfo } from "@itmarket/ui";
import { notFound } from "next/navigation";

async function loadProduct(slug: string) {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  return {
    title: product.name,
    description: product.description ?? `${product.name} IT Market vitrinində.`,
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
    [product, companionProducts] = await Promise.all([
      getProduct(slug),
      listCompanionProducts(slug),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
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

  return (
    <div className="ui-container ui-product-page">
      <section className="ui-product-hero" aria-label="Məhsul icmalı">
        <div className="ui-product-hero__left">
          <div className="ui-product-hero__gallery">
            <ProductGallery media={product.media} productName={product.name} />
          </div>
          <div className="ui-product-hero__specs">
            <ProductInfo
              attributes={product.variants[0]?.attributes}
              sku={product.variants[0]?.sku}
              reviewSummary={product.reviewSummary}
              reviews={product.reviews}
            />
          </div>
        </div>
        <div className="ui-product-hero__buy">
          <ProductBuyBox
            cartId={cartSession.cartId ?? ""}
            cartVariantIds={cartVariantIds}
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
            }}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              attributes: variant.attributes,
              price: variant.price,
              priceFormatted: formatAznValue(variant.price) ?? "Qiymət yoxdur",
              previousPrice: variant.previousPrice,
              previousPriceFormatted: formatAznValue(variant.previousPrice),
              available: variant.available,
            }))}
            addToCartAction={addToCart}
            buyNowAction={buyNow}
            customerEmail={customer?.email}
            companionProducts={companionProducts.items}
            reviewSummary={product.reviewSummary}
          />
        </div>
      </section>

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
            name: product.name,
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
