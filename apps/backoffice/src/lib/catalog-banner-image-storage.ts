import { resolveDualAppPublicDirectories } from "./resolve-dual-app-public-dirs";

/** Hero banner şəkilləri həm backoffice, həm storefront statik qovluqlarına yazılır. */
export function resolveCatalogBannerImageDirectories(
  cwd = process.cwd(),
): string[] {
  return resolveDualAppPublicDirectories("images/hero", cwd);
}
