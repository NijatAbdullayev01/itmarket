/** Staff SEO ops: coverage report + bulk fill for empty CMS fields. */

export type CatalogSeoCoverageEntityKind =
  | "product"
  | "brand"
  | "category";

export type CatalogSeoCoverageGapField =
  | "seoTitle"
  | "seoDescription"
  | "description";

export type CatalogSeoCoverageItemContract = {
  entityType: CatalogSeoCoverageEntityKind;
  id: string;
  name: string;
  slug: string;
  status: string;
  missing: CatalogSeoCoverageGapField[];
  /** Present for category samples — drives backoffice edit deep-link. */
  parentId?: string | null;
};

export type CatalogSeoCoverageBucketContract = {
  entityType: CatalogSeoCoverageEntityKind;
  totalActive: number;
  missingAny: number;
  missingSeoTitle: number;
  missingSeoDescription: number;
  missingDescription: number;
  samples: CatalogSeoCoverageItemContract[];
};

export type CatalogSeoOosAuditItemContract = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  available: number;
};

export type CatalogSeoCoverageResponseContract = {
  generatedAt: string;
  buckets: CatalogSeoCoverageBucketContract[];
  /** ACTIVE variants with 0 sellable stock and availableByOrder=false. */
  oosWithoutOrderFlag: {
    total: number;
    samples: CatalogSeoOosAuditItemContract[];
  };
};

export type CatalogSeoFillMissingRequestContract = {
  /** Entity kinds to fill; default all. */
  entityTypes?: CatalogSeoCoverageEntityKind[];
  /** Max rows updated per request (1–100). Default 40. */
  limit?: number;
  /**
   * Also set availableByOrder=true for ACTIVE OOS variants that lack the flag.
   * Default false — opt-in only. Pass `entityTypes: []` to skip SEO text fills.
   */
  enableAvailableByOrderForOos?: boolean;
};

export type CatalogSeoFillMissingItemResultContract = {
  entityType: CatalogSeoCoverageEntityKind | "variant";
  id: string;
  name: string;
  updatedFields: string[];
};

export type CatalogSeoFillMissingResponseContract = {
  filled: CatalogSeoFillMissingItemResultContract[];
  skipped: number;
  remainingGaps: number;
  availableByOrderEnabled: number;
};
