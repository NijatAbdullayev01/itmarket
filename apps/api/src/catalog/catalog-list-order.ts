const CATALOG_LIST_SORTS = ['createdAt', 'name', 'sortOrder'] as const;

export type CatalogListSort = (typeof CATALOG_LIST_SORTS)[number];
export type CatalogListDirection = 'asc' | 'desc';

/** Stable cursor pagination: unique `id` tie-breaks equal createdAt/name/sortOrder. */
export function catalogListOrderBy(
  sort: string,
  direction: string,
): Array<Record<string, CatalogListDirection>> {
  const safeSort: CatalogListSort = CATALOG_LIST_SORTS.includes(
    sort as CatalogListSort,
  )
    ? (sort as CatalogListSort)
    : 'createdAt';
  const safeDirection: CatalogListDirection =
    direction === 'asc' ? 'asc' : 'desc';
  return [{ [safeSort]: safeDirection }, { id: safeDirection }];
}
