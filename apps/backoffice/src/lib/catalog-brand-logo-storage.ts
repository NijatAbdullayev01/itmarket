import { resolveDualAppPublicDirectories } from "./resolve-dual-app-public-dirs";

/** Brend loqoları həm backoffice, həm storefront statik qovluqlarına yazılır. */
export function resolveCatalogBrandLogoDirectories(
  cwd = process.cwd(),
): string[] {
  return resolveDualAppPublicDirectories("images/brands", cwd);
}
