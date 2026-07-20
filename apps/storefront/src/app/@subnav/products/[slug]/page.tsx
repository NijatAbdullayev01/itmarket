import { ProductBreadcrumb } from "@/components/product-breadcrumb";
import { loadStorefrontProduct } from "@/lib/load-storefront-product";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";

export default async function ProductBreadcrumbSlot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadStorefrontProduct(slug);

  return (
    <ProductBreadcrumb
      categoryName={product.category.name}
      categorySlug={product.category.slug}
      productName={getStorefrontProductDisplayTitleFromSummary(product)}
    />
  );
}
