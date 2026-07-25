import { BrandBar } from "./brand-bar";
import { CategorySidebar } from "./category-sidebar";
import { HeroSlider, type HeroSlide } from "./hero-slider";
import { TrustFeatures } from "./trust-features";

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
};

export function CatalogHero({ categories, brands, banners }: CatalogHeroProps) {
  return (
    <section className="ui-catalog-hero" aria-label="Kampaniyalar və kateqoriyalar">
      <div className="ui-home-hero__grid">
        <CategorySidebar categories={categories} brands={brands} />
        <HeroSlider slides={banners} />
      </div>

      <TrustFeatures />
      <BrandBar brands={brands} />
    </section>
  );
}
