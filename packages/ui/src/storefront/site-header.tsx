import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { BrandLogo } from "./brand-logo";
import {
  defaultStorefrontChromeCopy,
  formatChromeMessage,
  type StorefrontChromeCopy,
} from "./chrome-copy";
import {
  HeaderCatalogButton,
  type HeaderCatalogBrand,
  type HeaderCatalogCategory,
} from "./header-catalog-button";
import {
  HeaderSearchInput,
  HeaderSearchInputFallback,
} from "./header-search-input";
import { IconCart } from "./icons";

type SiteHeaderProps = {
  cartItemCount?: number;
  currentPath?: string;
  languageSwitcher?: ReactNode;
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
  chromeCopy?: StorefrontChromeCopy;
};

export function SiteHeader({
  cartItemCount = 0,
  currentPath = "/",
  languageSwitcher,
  compareLink,
  favoritesLink,
  accountMenu,
  subnav,
  catalogCategories = [],
  catalogBrands = [],
  chromeCopy = defaultStorefrontChromeCopy,
}: SiteHeaderProps) {
  const showBadge = cartItemCount > 0;
  const cartAria = showBadge
    ? formatChromeMessage(chromeCopy.cartWithCount, { count: cartItemCount })
    : chromeCopy.cart;

  return (
    <header className="ui-site-header">
      <div className="ui-container ui-site-header__inner">
        <div className="ui-site-header__start">
          <Link className="ui-brand" href="/" aria-label={chromeCopy.homeAria}>
            <BrandLogo />
          </Link>
        </div>

        <div className="ui-site-header__center">
          <Suspense fallback={null}>
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
              />
            </Suspense>
          </form>
        </div>

        <div className="ui-site-header__actions">
          {languageSwitcher}
          <nav className="ui-header-utilities" aria-label={chromeCopy.utilitiesNav}>
            {compareLink}
            {favoritesLink}
            <Link
              href="/cart"
              aria-current={currentPath.startsWith("/cart") ? "page" : undefined}
              className="ui-header-utilities__link ui-header-utilities__link--cart"
              aria-label={cartAria}
              title={chromeCopy.cart}
            >
              <span className="ui-header-utilities__icon" aria-hidden="true">
                <IconCart width={24} height={24} />
                {showBadge ? (
                  <span className="ui-header-utilities__badge">{cartItemCount}</span>
                ) : null}
              </span>
              <span className="ui-header-utilities__label">{chromeCopy.cart}</span>
            </Link>
            {accountMenu}
          </nav>
        </div>
      </div>

      <Suspense fallback={null}>{subnav}</Suspense>
    </header>
  );
}
