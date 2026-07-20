const DEFAULT_STOREFRONT_ORIGIN = "http://127.0.0.1:3010";

export function resolveStorefrontOrigin(
  configured = process.env.STOREFRONT_ORIGIN,
): string {
  const trimmed = configured?.trim().replace(/\/$/, "");
  if (trimmed === undefined || trimmed === "") {
    return DEFAULT_STOREFRONT_ORIGIN;
  }
  return trimmed;
}
