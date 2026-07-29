export type StorefrontCatalogRevalidateInput = {
  paths?: string[];
  tags?: string[];
};

function resolveStorefrontOrigin(): string | null {
  const origin = process.env.STOREFRONT_ORIGIN?.trim();
  if (origin === undefined || origin.length === 0) {
    return null;
  }
  return origin.replace(/\/$/, '');
}

/**
 * Best-effort bust of storefront catalog ISR / fetch cache after writes.
 * Failures are swallowed so catalog mutations never depend on storefront uptime.
 */
export async function revalidateStorefrontCatalog(
  input: StorefrontCatalogRevalidateInput = {},
): Promise<void> {
  const origin = resolveStorefrontOrigin();
  const secret = process.env.APP_SECRET?.trim() ?? '';
  if (origin === null || secret.length === 0) {
    return;
  }

  const paths = (input.paths ?? []).filter(
    (path) => path.startsWith('/') && !path.startsWith('//'),
  );
  const tags = input.tags ?? ['catalog'];

  try {
    const response = await fetch(`${origin}/api/revalidate-catalog`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ paths, tags }),
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) {
      // Storefront may be down in local/dev; ignore.
      return;
    }
  } catch {
    // Ignore network / timeout errors.
  }
}

export function scheduleStorefrontCatalogRevalidate(
  input: StorefrontCatalogRevalidateInput = {},
): void {
  void revalidateStorefrontCatalog(input);
}
