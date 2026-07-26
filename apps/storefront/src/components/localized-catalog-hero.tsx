"use client";

import { useMemo } from "react";

import {
  CatalogHero,
  type BrandBarCopy,
  type TrustFeatureItem,
  type TrustFeaturesCopy,
} from "@itmarket/ui";

import { useLocale } from "@/components/locale-provider";
import { withLocalizedCategoryNames } from "@/lib/i18n";
import {
  toBrandBarCopy,
  toTrustFeatureItems,
  toTrustFeaturesCopy,
} from "@/lib/i18n/ui-copy";

type LocalizedCatalogHeroProps = {
  categories: {
    id: string;
    name: string;
    slug: string;
    parentId?: string | null;
  }[];
  brands: {
    id: string;
    name: string;
    slug: string;
    logoObjectKey?: string | null;
    logoScalePercent?: number | null;
    logoOffsetX?: number | null;
    logoOffsetY?: number | null;
  }[];
  banners?: {
    id: string;
    href: string;
    bannerSrc: string;
    bannerAlt: string;
  }[];
};

export function LocalizedCatalogHero({
  categories,
  brands,
  banners,
}: LocalizedCatalogHeroProps) {
  const { messages } = useLocale();
  const localizedCategories = useMemo(
    () =>
      withLocalizedCategoryNames(categories, messages.catalog.categoryNames),
    [categories, messages.catalog.categoryNames],
  );

  const brandBarCopy: Partial<BrandBarCopy> = toBrandBarCopy(messages);
  const trustFeaturesCopy: Partial<TrustFeaturesCopy> =
    toTrustFeaturesCopy(messages);
  const trustFeaturesItems: TrustFeatureItem[] =
    toTrustFeatureItems(messages);

  return (
    <CatalogHero
      categories={localizedCategories}
      brands={brands}
      banners={banners}
      brandBarCopy={brandBarCopy}
      trustFeaturesCopy={trustFeaturesCopy}
      trustFeaturesItems={trustFeaturesItems}
      categorySidebarCopy={{
        navAria: messages.catalog.categoriesNav,
        empty: messages.catalog.categoriesEmpty,
        childrenAria: messages.catalog.categoryChildrenAria,
      }}
      ariaLabel={messages.catalog.heroAria}
    />
  );
}
