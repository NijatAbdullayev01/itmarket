import { resolveDualAppPublicDirectories } from "./resolve-dual-app-public-dirs";

/** Kataloq şəkilləri həm backoffice, həm storefront statik qovluqlarına yazılır. */
export function resolveCatalogProductImageDirectories(
  cwd = process.cwd(),
): string[] {
  return resolveDualAppPublicDirectories("images/catalog", cwd);
}
