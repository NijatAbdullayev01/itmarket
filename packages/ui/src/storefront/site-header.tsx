import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { BrandLogo } from "./brand-logo";
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
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
};

export function SiteHeader({
  cartItemCount = 0,
  currentPath = "/",
  compareLink,
  favoritesLink,
  accountMenu,
  subnav,
  catalogCategories = [],
  catalogBrands = [],
}: SiteHeaderProps) {
  const showBadge = cartItemCount > 0;

  return (
    <header className="ui-site-header">
      <div className="ui-container ui-site-header__inner">
        <div className="ui-site-header__start">
          <Link className="ui-brand" href="/" aria-label="IT Market ana səhifə">
            <BrandLogo />
          </Link>
        </div>

        <div className="ui-site-header__center">
          <Suspense fallback={null}>
            <HeaderCatalogButton
              categories={catalogCategories}
              brands={catalogBrands}
            />
          </Suspense>
          <form className="ui-site-header__search" action="/" method="get" role="search">
            <label className="sr-only" htmlFor="header-search">
              Məhsul axtar
            </label>
            <Suspense fallback={<HeaderSearchInputFallback />}>
              <HeaderSearchInput />
            </Suspense>
          </form>
        </div>

        <div className="ui-site-header__actions">
          <nav className="ui-header-utilities" aria-label="Hesab və səbət">
            {compareLink}
            {favoritesLink}
            <Link
              href="/cart"
              aria-current={currentPath.startsWith("/cart") ? "page" : undefined}
              className="ui-header-utilities__link ui-header-utilities__link--cart"
              aria-label={showBadge ? `Səbət, ${cartItemCount} məhsul` : "Səbət"}
              title="Səbət"
            >
              <span className="ui-header-utilities__icon" aria-hidden="true">
                <IconCart width={24} height={24} />
                {showBadge ? (
                  <span className="ui-header-utilities__badge">{cartItemCount}</span>
                ) : null}
              </span>
              <span className="ui-header-utilities__label">Səbət</span>
            </Link>
            {accountMenu}
          </nav>
        </div>
      </div>

      <Suspense fallback={null}>{subnav}</Suspense>
    </header>
  );
}
