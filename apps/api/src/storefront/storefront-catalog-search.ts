import { buildProductVariantCatalogSearchWhere } from '../catalog/catalog-text-search';

/**
 * Builds Prisma WHERE for storefront catalog search.
 * Multi-word queries use AND across units; each unit expands AZ/EN color synonyms.
 */
export function buildStorefrontCatalogSearchWhere(
  search: string | undefined,
) {
  return buildProductVariantCatalogSearchWhere(search);
}
