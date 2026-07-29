export type ProductSeoFieldValues = {
  seoTitle: string;
  seoDescription: string;
  description: string;
};

export function canBuildProductSeoRequest(input: {
  modelName?: string | null;
  brandName?: string | null;
}): boolean {
  return (
    (input.modelName?.trim() ?? "").length > 0 &&
    (input.brandName?.trim() ?? "").length > 0
  );
}

export function productSeoNeedsGeneration(
  fields: ProductSeoFieldValues,
): boolean {
  return (
    fields.seoTitle.trim().length === 0 ||
    fields.seoDescription.trim().length === 0 ||
    fields.description.trim().length === 0
  );
}

/** Fill only empty SEO fields from a generated suggestion. */
export function applyGeneratedProductSeo(
  current: ProductSeoFieldValues,
  generated: ProductSeoFieldValues,
): ProductSeoFieldValues {
  return {
    seoTitle: current.seoTitle.trim() || generated.seoTitle.trim(),
    seoDescription:
      current.seoDescription.trim() || generated.seoDescription.trim(),
    description: current.description.trim() || generated.description.trim(),
  };
}
