import { createHmac } from 'node:crypto';

const REVALIDATE_CONTEXT = 'itmarket.catalog-revalidate.v1';

/**
 * Secret presented in `x-revalidate-secret`. Never the raw APP_SECRET so a
 * leaked cache-bust header cannot mint sessions, decrypt FIN, or verify MFA.
 *
 * Optional `CATALOG_REVALIDATE_SECRET` overrides the derived value (rotation
 * without rotating APP_SECRET).
 */
export function catalogRevalidateSecret(
  appSecret: string,
  dedicated = process.env.CATALOG_REVALIDATE_SECRET,
): string {
  const override = dedicated?.trim() ?? '';
  if (override.length >= 32) {
    return override;
  }
  return createHmac('sha256', appSecret)
    .update(REVALIDATE_CONTEXT)
    .digest('hex');
}
