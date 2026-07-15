import { BrandBar } from "./brand-bar";
import { CategorySidebar } from "./category-sidebar";
import { HeroSlider } from "./hero-slider";

type CatalogHeroProps = {
  categories: { id: string; name: string; slug: string; parentId?: string | null }[];
  brands: { id: string; name: string; slug: string }[];
};

export function CatalogHero({ categories, brands }: CatalogHeroProps) {
  return (
    <section className="ui-catalog-hero" aria-label="Kampaniyalar və kateqoriyalar">
      <div className="ui-home-hero__grid">
        <CategorySidebar categories={categories} />
        <HeroSlider />
      </div>

      <BrandBar brands={brands} />
    </section>
  );
}
