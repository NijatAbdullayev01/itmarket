import path from "path";

/** Hero banner şəkilləri həm backoffice, həm storefront statik qovluqlarına yazılır. */
export function resolveCatalogBannerImageDirectories(
  cwd = process.cwd(),
): string[] {
  return [
    path.join(cwd, "public/images/hero"),
    path.join(cwd, "../storefront/public/images/hero"),
  ];
}
