const LOCAL_ORIGIN = "http://localhost:3000";

export function getStorefrontOrigin(): URL | null {
  const configuredOrigin = process.env.STOREFRONT_ORIGIN?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredOrigin) {
    return isProduction ? null : new URL(LOCAL_ORIGIN);
  }

  try {
    const url = new URL(configuredOrigin);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    const isOriginOnly =
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password;

    if (
      !isHttp ||
      !isOriginOnly ||
      (isProduction && url.protocol !== "https:")
    ) {
      return isProduction ? null : new URL(LOCAL_ORIGIN);
    }

    return new URL(url.origin);
  } catch {
    return isProduction ? null : new URL(LOCAL_ORIGIN);
  }
}
