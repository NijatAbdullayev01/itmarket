const KNOWN_BRAND_LOGOS = new Set([
  "apple",
  "asus",
  "canon",
  "dyson",
  "hp",
  "lenovo",
  "lg",
  "samsung",
  "sony",
  "xiaomi",
]);

export type BrandLogoFit = {
  logoScalePercent?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
};

type BrandMarkProps = {
  name: string;
  slug: string;
  logoObjectKey?: string | null;
  className?: string;
  /** When no logo resolves: show the name (default) or render nothing. */
  fallback?: "name" | "null";
} & BrandLogoFit;

function resolveBrandLogoSrc(
  slug: string,
  logoObjectKey?: string | null,
): string | null {
  if (
    typeof logoObjectKey === "string" &&
    (logoObjectKey.startsWith("/") ||
      logoObjectKey.startsWith("http://") ||
      logoObjectKey.startsWith("https://"))
  ) {
    return logoObjectKey;
  }

  if (KNOWN_BRAND_LOGOS.has(slug)) {
    return `/images/brands/${slug}.svg`;
  }

  return null;
}

export function brandLogoFitStyle({
  logoScalePercent,
  logoOffsetX,
  logoOffsetY,
}: BrandLogoFit): { transform: string } | undefined {
  const scale = (logoScalePercent ?? 100) / 100;
  const offsetX = logoOffsetX ?? 0;
  const offsetY = logoOffsetY ?? 0;

  if (scale === 1 && offsetX === 0 && offsetY === 0) {
    return undefined;
  }

  return {
    transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
  };
}

export function BrandMark({
  name,
  slug,
  logoObjectKey,
  logoScalePercent,
  logoOffsetX,
  logoOffsetY,
  className,
  fallback = "name",
}: BrandMarkProps) {
  const src = resolveBrandLogoSrc(slug, logoObjectKey);

  if (src === null) {
    return fallback === "null" ? null : (
      <span className="ui-brand-bar__name">{name}</span>
    );
  }

  return (
    <img
      src={src}
      alt={fallback === "null" ? "" : name}
      className={className ?? "ui-brand-bar__logo"}
      style={brandLogoFitStyle({
        logoScalePercent,
        logoOffsetX,
        logoOffsetY,
      })}
      decoding="async"
      loading="lazy"
      draggable={false}
      aria-hidden={fallback === "null" ? true : undefined}
    />
  );
}
