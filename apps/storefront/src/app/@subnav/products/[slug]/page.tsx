import { ProductBreadcrumb } from "@/components/product-breadcrumb";
import { getProduct } from "@/lib/api";

export default async function ProductBreadcrumbSlot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return (
    <ProductBreadcrumb
      categoryName={product.category.name}
      categorySlug={product.category.slug}
      productName={product.name}
    />
  );
}
