import { createHmac } from "node:crypto";

const REVALIDATE_CONTEXT = "itmarket.catalog-revalidate.v1";

/** Keep in sync with `apps/api/src/security/catalog-revalidate-secret.ts`. */
export function catalogRevalidateSecret(
  appSecret: string,
  dedicated = process.env.CATALOG_REVALIDATE_SECRET,
): string {
  const override = dedicated?.trim() ?? "";
  if (override.length >= 32) {
    return override;
  }
  return createHmac("sha256", appSecret)
    .update(REVALIDATE_CONTEXT)
    .digest("hex");
}
