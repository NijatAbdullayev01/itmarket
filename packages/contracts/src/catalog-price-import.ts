export type CatalogPriceImportRowStatus =
  | "updated"
  | "unchanged"
  | "not_found"
  | "ambiguous"
  | "invalid"
  | "no_variants";

export interface CatalogPriceImportItemContract {
  brand: string;
  model: string;
  price: string;
  previousPrice?: string;
}

export interface CatalogPriceImportRequestContract {
  items: CatalogPriceImportItemContract[];
  /** When true, match and report without writing prices. */
  dryRun?: boolean;
}

export interface CatalogPriceImportRowResultContract {
  rowNumber: number;
  brand: string;
  model: string;
  price: string;
  previousPrice: string | null;
  status: CatalogPriceImportRowStatus;
  message: string | null;
  productId: string | null;
  variantIds: string[];
  updatedCount: number;
}

export interface CatalogPriceImportSummaryContract {
  total: number;
  updated: number;
  unchanged: number;
  notFound: number;
  ambiguous: number;
  invalid: number;
  noVariants: number;
}

export interface CatalogPriceImportResponseContract {
  dryRun: boolean;
  summary: CatalogPriceImportSummaryContract;
  rows: CatalogPriceImportRowResultContract[];
}
