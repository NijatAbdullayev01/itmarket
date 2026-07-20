import path from "path";

/** Kataloq şəkilləri həm backoffice, həm storefront statik qovluqlarına yazılır. */
export function resolveCatalogProductImageDirectories(
  cwd = process.cwd(),
): string[] {
  return [
    path.join(cwd, "public/images/catalog"),
    path.join(cwd, "../storefront/public/images/catalog"),
  ];
}
