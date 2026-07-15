import Link from "next/link";
import type { ReactNode } from "react";

import type { ProductMedia } from "../utils/product-image";
import { BrandBar } from "./brand-bar";
import { CategorySidebar } from "./category-sidebar";
import { HeroSlider } from "./hero-slider";
import { WeeklyOffer } from "./weekly-offer";

type CatalogHeroProps = {
  categories: { id: string; name: string; slug: string; parentId?: string | null }[];
  brands: { id: string; name: string; slug: string }[];
  featuredProduct?: {
    slug: string;
    name: string;
    price: string | null;
    previousPrice: string | null;
    image: ProductMedia | null;
  } | null;
  weeklyOfferAction?: ReactNode;
};

export function CatalogHero({
  categories,
  brands,
  featuredProduct,
  weeklyOfferAction,
}: CatalogHeroProps) {
  return (
    <section className="ui-catalog-hero" aria-label="Kampaniyalar və kateqoriyalar">
      <div className="ui-home-hero__grid">
        <CategorySidebar categories={categories} />

        <HeroSlider />

        {featuredProduct ? (
          <WeeklyOffer
            product={featuredProduct}
            addToCartSlot={weeklyOfferAction}
          />
        ) : (
          <aside className="ui-weekly-offer ui-weekly-offer--empty" aria-label="Həftənin təklifləri">
            <h2 className="ui-weekly-offer__heading">Həftənin təklifləri</h2>
            <p className="ui-weekly-offer__empty-text">
              Tezliklə xüsusi təkliflər burada görünəcək.
            </p>
            <Link className="ui-weekly-offer__all" href="/?sort=price">
              Bütün təklifləri gör
            </Link>
          </aside>
        )}
      </div>

      <BrandBar brands={brands} />
    </section>
  );
}
