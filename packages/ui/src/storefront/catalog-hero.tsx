import { BrandBar, type BrandBarCopy } from "./brand-bar";
import {
  CategorySidebar,
  type CategorySidebarCopy,
} from "./category-sidebar";
import { HeroSlider, type HeroSlide, type HeroSliderCopy } from "./hero-slider";
import {
  TrustFeatures,
  type TrustFeatureItem,
  type TrustFeaturesCopy,
} from "./trust-features";
import type { MediaImageComponent } from "./media-image";

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
  heroSliderCopy?: HeroSliderCopy;
  brandBarCopy?: Partial<BrandBarCopy>;
  trustFeaturesCopy?: Partial<TrustFeaturesCopy>;
  trustFeaturesItems?: TrustFeatureItem[];
  categorySidebarCopy?: CategorySidebarCopy;
  ariaLabel?: string;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

export function CatalogHero({
  categories,
  brands,
  banners,
  heroSliderCopy,
  brandBarCopy,
  trustFeaturesCopy,
  trustFeaturesItems,
  categorySidebarCopy,
  ariaLabel = "Kampaniyalar və kateqoriyalar",
  Image,
}: CatalogHeroProps) {
  return (
    <section className="ui-catalog-hero" aria-label={ariaLabel}>
      <div className="ui-home-hero__grid">
        <CategorySidebar
          categories={categories}
          brands={brands}
          copy={categorySidebarCopy}
        />
        <HeroSlider slides={banners} copy={heroSliderCopy} Image={Image} />
      </div>

      <TrustFeatures copy={trustFeaturesCopy} items={trustFeaturesItems} />
      <BrandBar brands={brands} copy={brandBarCopy} />
    </section>
  );
}
