import Link from "next/link";

import { BrandMark } from "./brand-mark";

type BrandBarProps = {
  brands: { id: string; name: string; slug: string }[];
};

type BrandItem = BrandBarProps["brands"][number];

function BrandLinks({ brands, keyPrefix }: { brands: BrandItem[]; keyPrefix: string }) {
  return brands.map((brand) => (
    <Link
      key={`${keyPrefix}-${brand.id}`}
      className="ui-brand-bar__item"
      href={`/?brand=${encodeURIComponent(brand.slug)}`}
      title={brand.name}
      tabIndex={keyPrefix === "duplicate" ? -1 : undefined}
    >
      <BrandMark name={brand.name} slug={brand.slug} />
    </Link>
  ));
}

export function BrandBar({ brands }: BrandBarProps) {
  if (brands.length === 0) return null;

  const displayedBrands = brands.slice(0, 12);

  return (
    <div className="ui-brand-bar" aria-label="Brendlər">
      <div className="ui-brand-bar__viewport">
        <div className="ui-brand-bar__scroll">
          <div className="ui-brand-bar__group">
            <BrandLinks brands={displayedBrands} keyPrefix="primary" />
          </div>
          <div className="ui-brand-bar__group" aria-hidden="true">
            <BrandLinks brands={displayedBrands} keyPrefix="duplicate" />
          </div>
        </div>
      </div>
    </div>
  );
}
