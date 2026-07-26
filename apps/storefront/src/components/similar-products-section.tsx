import { CatalogProductCard } from "@/components/catalog-product-card";
import { ApiError, listSimilarProducts } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";

type SimilarProductsSectionProps = {
  slug: string;
  cartId?: string;
  cartVariantIds?: string[];
};

export async function SimilarProductsSection({
  slug,
  cartId,
  cartVariantIds = [],
}: SimilarProductsSectionProps) {
  let items: Awaited<ReturnType<typeof listSimilarProducts>>["items"];
  try {
    ({ items } = await listSimilarProducts(slug));
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }

  if (items.length === 0) {
    return null;
  }

  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <section className="ui-product-similar" aria-label={messages.product.similarAria}>
      <header className="ui-product-similar__header">
        <h2 className="ui-section-heading">{messages.product.similarAria}</h2>
      </header>
      <div className="ui-product-grid">
        {items.map((product) => (
          <CatalogProductCard
            key={product.defaultVariantId ?? product.id}
            product={product}
            cartId={cartId}
            cartVariantIds={cartVariantIds}
          />
        ))}
      </div>
    </section>
  );
}
