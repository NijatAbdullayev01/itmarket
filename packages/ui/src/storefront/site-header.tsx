import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { BrandLogo } from "./brand-logo";
import {
  defaultStorefrontChromeCopy,
  type StorefrontChromeCopy,
} from "./chrome-copy";
import {
  HeaderCatalogButton,
  type HeaderCatalogBrand,
  type HeaderCatalogCategory,
} from "./header-catalog-button";
import { HeaderCatalogButtonFallback } from "./header-catalog-button-fallback";
import { HeaderCartLink } from "./header-cart-link";
import {
  HeaderSearchInput,
  HeaderSearchInputFallback,
} from "./header-search-input";
import type { MediaImageComponent } from "./media-image";

type SiteHeaderProps = {
  cartItemCount?: number;
  languageSwitcher?: ReactNode;
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
  /** Pre-built catalog control (preferred for streaming). */
  catalogButton?: ReactNode;
  /** Pre-built cart link (preferred for streaming). */
  cartLink?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
  chromeCopy?: StorefrontChromeCopy;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

export function SiteHeader({
  cartItemCount = 0,
  languageSwitcher,
  compareLink,
  favoritesLink,
  accountMenu,
  subnav,
  catalogButton,
  cartLink,
  catalogCategories = [],
  catalogBrands = [],
  chromeCopy = defaultStorefrontChromeCopy,
  Image,
}: SiteHeaderProps) {
  const resolvedCatalogButton =
    catalogButton ?? (
      <Suspense
        fallback={
          <HeaderCatalogButtonFallback
            catalogLabel={chromeCopy.catalog}
            openLabel={chromeCopy.catalogOpen}
          />
        }
      >
        <HeaderCatalogButton
          categories={catalogCategories}
          brands={catalogBrands}
          labels={{
            catalog: chromeCopy.catalog,
            open: chromeCopy.catalogOpen,
            close: chromeCopy.catalogClose,
            categories: chromeCopy.catalogCategories,
          }}
        />
      </Suspense>
    );

  const resolvedCartLink =
    cartLink ?? (
      <HeaderCartLink cartItemCount={cartItemCount} chromeCopy={chromeCopy} />
    );

  return (
    <header className="ui-site-header">
      <div className="ui-container ui-site-header__inner">
        <div className="ui-site-header__start">
          <Link className="ui-brand" href="/" aria-label={chromeCopy.homeAria}>
            <BrandLogo />
          </Link>
        </div>

        <div className="ui-site-header__center">
          {resolvedCatalogButton}
          <form className="ui-site-header__search" action="/" method="get" role="search">
            <label className="sr-only" htmlFor="header-search">
              {chromeCopy.searchLabel}
            </label>
            <Suspense
              fallback={
                <HeaderSearchInputFallback
                  placeholder={chromeCopy.searchPlaceholder}
                  submitLabel={chromeCopy.searchSubmit}
                />
              }
            >
              <HeaderSearchInput
                placeholder={chromeCopy.searchPlaceholder}
                submitLabel={chromeCopy.searchSubmit}
                loadingLabel={chromeCopy.searchLoading}
                resultsLabel={chromeCopy.searchResults}
                emptyTitle={chromeCopy.searchEmptyTitle}
                emptyHint={chromeCopy.searchEmptyHint}
                suggestionsLabel={chromeCopy.searchSuggestions}
                categoriesLabel={chromeCopy.searchCategories}
                outOfStockLabel={chromeCopy.searchOutOfStock}
                viewAllResultsLabel={chromeCopy.searchViewAllResults}
                categoryNames={chromeCopy.categoryNames}
                Image={Image}
              />
            </Suspense>
          </form>
        </div>

        <div className="ui-site-header__actions">
          {languageSwitcher}
          <nav className="ui-header-utilities" aria-label={chromeCopy.utilitiesNav}>
            {compareLink}
            {favoritesLink}
            {resolvedCartLink}
            {accountMenu}
          </nav>
        </div>
      </div>

      {subnav}
    </header>
  );
}
