import Link from "next/link";

import { CategoryNav } from "./category-nav";
import { BrandLogo } from "./brand-logo";
import { IconCart, IconHeart, IconSearch, IconUser } from "./icons";

type SiteHeaderProps = {
  cartItemCount?: number;
  currentPath?: string;
};

export function SiteHeader({
  cartItemCount = 0,
  currentPath = "/",
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

        <form className="ui-site-header__search" action="/" method="get" role="search">
          <div className="ui-header-search">
            <label className="sr-only" htmlFor="header-search">
              Məhsul axtar
            </label>
            <span className="ui-header-search__icon" aria-hidden="true">
              <IconSearch width={18} height={18} />
            </span>
            <input
              id="header-search"
              name="q"
              placeholder="Məhsul, SKU və ya brend axtar..."
              autoComplete="off"
            />
            <button type="submit" className="ui-header-search__submit">
              <span className="sr-only">Axtar</span>
              <IconSearch width={18} height={18} />
            </button>
          </div>
        </form>

        <div className="ui-site-header__actions">
          <nav className="ui-header-utilities" aria-label="Hesab və səbət">
            <Link
              href="/"
              className="ui-header-utilities__link"
              aria-label="Sevimlilər"
              title="Sevimlilər"
            >
              <span className="ui-header-utilities__icon" aria-hidden="true">
                <IconHeart width={24} height={24} />
              </span>
              <span className="ui-header-utilities__label">Sevimlilər</span>
            </Link>
            <Link
              href="/cart"
              aria-current={currentPath.startsWith("/cart") ? "page" : undefined}
              className="ui-header-utilities__link ui-header-utilities__link--cart"
              aria-label={`Səbət, ${cartItemCount} məhsul`}
              title="Səbət"
            >
              <span className="ui-header-utilities__icon" aria-hidden="true">
                <IconCart width={24} height={24} />
                <span
                  className={
                    showBadge
                      ? "ui-header-utilities__badge"
                      : "ui-header-utilities__badge ui-header-utilities__badge--muted"
                  }
                >
                  {cartItemCount}
                </span>
              </span>
              <span className="ui-header-utilities__label">Səbət</span>
            </Link>
            <Link
              href="/"
              className="ui-header-utilities__link"
              aria-label="Hesab"
              title="Hesab"
            >
              <span className="ui-header-utilities__icon" aria-hidden="true">
                <IconUser width={24} height={24} />
              </span>
              <span className="ui-header-utilities__label">Hesab</span>
            </Link>
          </nav>
        </div>
      </div>

      <CategoryNav />
    </header>
  );
}
