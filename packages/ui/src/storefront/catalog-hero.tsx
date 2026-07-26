import { BrandBar, type BrandBarCopy } from "./brand-bar";
import {
  CategorySidebar,
  type CategorySidebarCopy,
} from "./category-sidebar";
import { HeroSlider, type HeroSlide } from "./hero-slider";
import {
  TrustFeatures,
  type TrustFeatureItem,
  type TrustFeaturesCopy,
} from "./trust-features";

type CatalogHeroProps = {
  categories: { id: string; name: string; slug: string; parentId?: string | null }[];
  brands: {
    id: string;
    name: string;
    slug: string;
    logoObjectKey?: string | null;
    logoScalePercent?: number | null;
    logoOffsetX?: number | null;
    logoOffsetY?: number | null;
  }[];
  banners?: HeroSlide[];
  brandBarCopy?: Partial<BrandBarCopy>;
  trustFeaturesCopy?: Partial<TrustFeaturesCopy>;
  trustFeaturesItems?: TrustFeatureItem[];
  categorySidebarCopy?: CategorySidebarCopy;
  ariaLabel?: string;
};

export function CatalogHero({
  categories,
  brands,
  banners,
  brandBarCopy,
  trustFeaturesCopy,
  trustFeaturesItems,
  categorySidebarCopy,
  ariaLabel = "Kampaniyalar və kateqoriyalar",
}: CatalogHeroProps) {
  return (
    <section className="ui-catalog-hero" aria-label={ariaLabel}>
      <div className="ui-home-hero__grid">
        <CategorySidebar
          categories={categories}
          brands={brands}
          copy={categorySidebarCopy}
        />
        <HeroSlider slides={banners} />
      </div>

      <TrustFeatures copy={trustFeaturesCopy} items={trustFeaturesItems} />
      <BrandBar brands={brands} copy={brandBarCopy} />
    </section>
  );
}
