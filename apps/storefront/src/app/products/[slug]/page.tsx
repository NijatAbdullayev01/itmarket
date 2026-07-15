import Link from "next/link";
import { addToCart } from "@/app/actions";
import { getProduct } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { formatAzn } from "@/lib/format-azn";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EmptyStateLink,
  Price,
  ProductGallery,
  ProductInfo,
} from "@itmarket/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
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
  const [{ slug }, cartSession] = await Promise.all([
    params,
    getGuestCartSession(),
  ]);
  const product = await getProduct(slug);
  const firstAvailable = product.variants.find(
    (variant) => variant.available > 0,
  );

  return (
    <div className="ui-container">
      <nav className="ui-breadcrumb" aria-label="Səhifə yolu">
        <Link href="/">Kataloq</Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/?category=${encodeURIComponent(product.category.slug)}`}
        >
          {product.category.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>
      <section className="ui-product-detail">
        <div>
          <ProductGallery media={product.media} productName={product.name} />
          <ProductInfo
            name={product.name}
            description={product.description}
            category={product.category}
            brand={product.brand}
            attributes={product.variants[0]?.attributes}
            categoryHref={`/?category=${encodeURIComponent(product.category.slug)}`}
          />
        </div>
        <Card className="ui-buy-box">
          {firstAvailable === undefined ? (
            <EmptyState
              title="Bu məhsul hazırda stokda yoxdur"
              description="Stok yenilənəndə kataloqda görünəcək."
              action={<EmptyStateLink href="/" label="Kataloqa qayıt" />}
            />
          ) : (
            <form action={addToCart} style={{ display: "grid", gap: 16 }}>
              <input
                type="hidden"
                name="cartId"
                value={cartSession.cartId ?? ""}
              />
              <div className="ui-field">
                <label htmlFor="variantId">Variant</label>
                <select
                  id="variantId"
                  name="variantId"
                  defaultValue={firstAvailable.id}
                >
                  {product.variants.map((variant) => (
                    <option
                      disabled={variant.available <= 0}
                      key={variant.id}
                      value={variant.id}
                    >
                      {variant.name} · {variant.sku} ·{" "}
                      {formatAzn(Number(variant.price))}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Price value={formatAzn(Number(firstAvailable.price))} />
                {firstAvailable.previousPrice ? (
                  <>
                    {" "}
                    <Price
                      value={formatAzn(Number(firstAvailable.previousPrice))}
                      variant="previous"
                    />
                  </>
                ) : null}
              </div>
              {firstAvailable.available <= 3 ? (
                <Badge variant="warning">
                  Son {firstAvailable.available} ədəd
                </Badge>
              ) : (
                <Badge variant="success">Stokda var</Badge>
              )}
              <div className="ui-field">
                <label htmlFor="quantity">Miqdar</label>
                <input
                  id="quantity"
                  min="1"
                  max={firstAvailable.available}
                  name="quantity"
                  type="number"
                  defaultValue="1"
                />
              </div>
              <Button type="submit" block>
                Səbətə əlavə et
              </Button>
            </form>
          )}
        </Card>
      </section>
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
