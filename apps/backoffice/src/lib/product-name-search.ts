export function normalizeProductNameQuery(query: string) {
  return query.trim().toLocaleLowerCase("az");
}

export function filterProductsByName<T extends { name: string }>(
  products: T[],
  query: string,
  limit = 8,
): T[] {
  const normalizedQuery = normalizeProductNameQuery(query);
  if (normalizedQuery === "") {
    return [];
  }

  const matches = products.filter((product) =>
    normalizeProductNameQuery(product.name).includes(normalizedQuery),
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
