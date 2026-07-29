/** Catalog entity kinds that accept AI/heuristic SEO suggestions. */
export type CatalogSeoEntityType =
  | "product"
  | "brand"
  | "category"
  | "subcategory";

export type CatalogSeoSuggestSpec = {
  label: string;
  value: string;
};

export type CatalogSeoSuggestRequestContract = {
  entityType: CatalogSeoEntityType;
  /** Required display name for the entity being created/edited. */
  name: string;
  description?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  /** Parent root category name (subcategory / product context). */
  parentCategoryName?: string | null;
  specs?: CatalogSeoSuggestSpec[];
};

export type CatalogSeoSuggestSource = "heuristic" | "llm";

export type CatalogSeoSuggestResponseContract = {
  seoTitle: string;
  seoDescription: string;
  /**
   * Landing / product body copy for the form `description` field
   * (storefront category/brand intro, product description).
   */
  description: string;
  source: CatalogSeoSuggestSource;
  /** Soft guidance for staff (length, fallback, etc.). */
  warnings: string[];
};
