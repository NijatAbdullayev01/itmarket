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

type BrandMarkProps = {
  name: string;
  slug: string;
  className?: string;
};

export function BrandMark({ name, slug, className }: BrandMarkProps) {
  if (!KNOWN_BRAND_LOGOS.has(slug)) {
    return <span className="ui-brand-bar__name">{name}</span>;
  }

  return (
    <img
      src={`/images/brands/${slug}.svg`}
      alt={name}
      className={className ?? "ui-brand-bar__logo"}
      width={88}
      height={32}
      decoding="async"
      loading="lazy"
    />
  );
}
