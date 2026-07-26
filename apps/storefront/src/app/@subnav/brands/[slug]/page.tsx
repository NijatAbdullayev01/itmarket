import { CatalogLandingBreadcrumb } from "@/components/catalog-landing-breadcrumb";
import { ApiUnavailableError, listBrands } from "@/lib/api";

export default async function BrandBreadcrumbSlot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const brands = await listBrands();
    const brand = brands.find((entry) => entry.slug === slug);
    if (brand === undefined) {
      return null;
    }
    return (
      <CatalogLandingBreadcrumb
        trail={[{ name: brand.name, path: `/brands/${brand.slug}` }]}
        currentName={brand.name}
      />
    );
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return null;
    }
    throw error;
  }
}