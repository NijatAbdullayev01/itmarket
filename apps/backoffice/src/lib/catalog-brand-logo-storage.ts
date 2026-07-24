import path from "path";

/** Brend loqoları həm backoffice, həm storefront statik qovluqlarına yazılır. */
export function resolveCatalogBrandLogoDirectories(
  cwd = process.cwd(),
): string[] {
  return [
    path.join(cwd, "public/images/brands"),
    path.join(cwd, "../storefront/public/images/brands"),
  ];
}
