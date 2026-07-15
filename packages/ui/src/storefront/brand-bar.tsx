import Link from "next/link";

type BrandBarProps = {
  brands: { id: string; name: string; slug: string }[];
};

export function BrandBar({ brands }: BrandBarProps) {
  if (brands.length === 0) return null;

  return (
    <div className="ui-brand-bar" aria-label="Brendlər">
      <div className="ui-brand-bar__scroll">
        {brands.slice(0, 12).map((brand) => (
          <Link
            key={brand.id}
            className="ui-brand-bar__item"
            href={`/?brand=${encodeURIComponent(brand.slug)}`}
            title={brand.name}
          >
            <span className="ui-brand-bar__name">{brand.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
