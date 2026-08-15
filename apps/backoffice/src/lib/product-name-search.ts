import {
  catalogSearchMatches,
  catalogSearchableTextFromJson,
} from "@itmarket/contracts";

export function normalizeProductNameQuery(query: string) {
  return query.trim().toLocaleLowerCase("az");
}

type ProductNameSearchable = {
  name: string;
  slug?: string;
  brand?: { name: string } | null;
  requiredSpecs?: unknown;
  variants?: {
    sku?: string;
    barcode?: string | null;
    name?: string;
    attributes?: unknown;
  }[];
};

function productMatchesNameQuery(
  product: ProductNameSearchable,
  query: string,
): boolean {
  const extraText = catalogSearchableTextFromJson(product.requiredSpecs);
  const variants = product.variants ?? [];
  if (variants.length === 0) {
    return catalogSearchMatches(query, {
      sku: "",
      variantName: "",
      barcode: null,
      productName: product.name,
      brandName: product.brand?.name ?? null,
      colorName: null,
      slug: product.slug ?? null,
      extraText,
    });
  }

  return variants.some((variant) =>
    catalogSearchMatches(query, {
      sku: variant.sku ?? "",
      variantName: variant.name ?? "",
      barcode: variant.barcode ?? null,
      productName: product.name,
      brandName: product.brand?.name ?? null,
      colorName: null,
      slug: product.slug ?? null,
      extraText: [
        extraText,
        catalogSearchableTextFromJson(variant.attributes),
      ].join(" "),
    }),
  );
}

export function filterProductsByName<T extends ProductNameSearchable>(
  products: T[],
  query: string,
  limit = 8,
): T[] {
  const normalizedQuery = normalizeProductNameQuery(query);
  if (normalizedQuery === "") {
    return [];
  }

  const matches = products.filter((product) =>
    productMatchesNameQuery(product, query),
  );

  matches.sort((left, right) =>
    left.name.localeCompare(right.name, "az", { sensitivity: "base" }),
  );

  return matches.slice(0, limit);
}

export function findExactProductNameMatch<T extends { name: string }>(
  products: T[],
  name: string,
): T | undefined {
  const normalizedName = normalizeProductNameQuery(name);
  if (normalizedName === "") {
    return undefined;
  }

  return products.find(
    (product) => normalizeProductNameQuery(product.name) === normalizedName,
  );
}
