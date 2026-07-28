import { PageLoading } from "@itmarket/ui";

/** Catalog-shaped pending UI for home / category / brand soft navigations. */
export default function Loading() {
  return <PageLoading variant="catalog" showTitle={false} />;
}
