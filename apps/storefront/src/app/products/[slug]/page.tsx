import Link from "next/link";
import { addToCart } from "@/app/actions";
import { getProduct } from "@/lib/api";
import { formatAzn } from "@/lib/format-azn";

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cartId?: string }>;
}) {
  const [{ slug }, { cartId }] = await Promise.all([params, searchParams]);
  const product = await getProduct(slug);
  const firstAvailable = product.variants.find(
    (variant) => variant.available > 0,
  );

  return (
    <main className="shell detail-page">
      <Link href="/" className="back-link">
        Kataloqa qayıt
      </Link>
      <section className="product-detail">
        <div>
          <p className="product-meta">
            {product.category.name}
            {product.brand ? ` · ${product.brand.name}` : ""}
          </p>
          <h1>{product.name}</h1>
          <p className="hero-copy">
            {product.description ?? "Bu məhsul üçün təsvir əlavə edilməyib."}
          </p>
        </div>
        <aside className="buy-box">
          {firstAvailable === undefined ? (
            <p className="empty-state">Bu məhsul hazırda stokda yoxdur.</p>
          ) : (
            <form action={addToCart}>
              <input type="hidden" name="cartId" value={cartId ?? ""} />
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
                    {formatAzn(Number(variant.price))} · {variant.available}{" "}
                    ədəd
                  </option>
                ))}
              </select>
              <label htmlFor="quantity">Miqdar</label>
              <input
                id="quantity"
                min="1"
                name="quantity"
                type="number"
                defaultValue="1"
              />
              <button type="submit">Səbətə əlavə et</button>
            </form>
          )}
        </aside>
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
    </main>
  );
}
