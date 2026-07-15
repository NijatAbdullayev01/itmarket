"use client";

import Link from "next/link";
import { useState } from "react";

import { CategoryNav } from "./category-nav";
import { BrandLogo } from "./brand-logo";
import {
  IconCart,
  IconClose,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
} from "./icons";

type SiteHeaderProps = {
  cartItemCount?: number;
  currentPath?: string;
  activeCategory?: string;
  categories?: { id: string; name: string; slug: string }[];
};

export function SiteHeader({
  cartItemCount = 0,
  currentPath = "/",
  activeCategory,
  categories = [],
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showBadge = cartItemCount > 0;

  return (
    <header className="ui-site-header">
      <div className="ui-container ui-site-header__inner">
        <Link className="ui-brand" href="/" aria-label="IT Market ana səhifə">
          <BrandLogo />
        </Link>

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
          <button
            type="button"
            className="ui-menu-toggle"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <IconClose width={20} height={20} />
            ) : (
              <IconMenu width={20} height={20} />
            )}
            <span className="sr-only">Menyu</span>
          </button>

          <nav className="ui-header-utilities" aria-label="Hesab və səbət">
            <Link
              href="/"
              className="ui-header-utilities__link"
              aria-label="Sevimlilər"
              title="Sevimlilər"
            >
              <IconHeart width={22} height={22} />
              <span className="ui-header-utilities__label">Sevimlilər</span>
            </Link>
            <Link
              href="/cart"
              aria-current={currentPath.startsWith("/cart") ? "page" : undefined}
              className="ui-header-utilities__link ui-header-utilities__link--cart"
              aria-label={`Səbət, ${cartItemCount} məhsul`}
              title="Səbət"
            >
              <IconCart width={22} height={22} />
              <span
                className={
                  showBadge
                    ? "ui-header-utilities__badge"
                    : "ui-header-utilities__badge ui-header-utilities__badge--muted"
                }
                aria-hidden="true"
              >
                {cartItemCount}
              </span>
              <span className="ui-header-utilities__label">Səbət</span>
            </Link>
            <Link
              href="/"
              className="ui-header-utilities__link"
              aria-label="Hesab"
              title="Hesab"
            >
              <IconUser width={22} height={22} />
              <span className="ui-header-utilities__label">Hesab</span>
            </Link>
          </nav>
        </div>
      </div>

      {categories.length > 0 ? (
        <CategoryNav categories={categories} activeCategory={activeCategory} />
      ) : null}

      <nav
        id="mobile-nav"
        className={mobileOpen ? "ui-mobile-nav ui-mobile-nav--open" : "ui-mobile-nav"}
        aria-label="Mobil naviqasiya"
      >
        <div className="ui-container ui-mobile-nav__links">
          <form action="/" method="get" role="search">
            <div className="ui-header-search ui-header-search--mobile">
              <label className="sr-only" htmlFor="mobile-search">
                Məhsul axtar
              </label>
              <span className="ui-header-search__icon" aria-hidden="true">
                <IconSearch width={18} height={18} />
              </span>
              <input
                id="mobile-search"
                name="q"
                placeholder="Məhsul axtar..."
                autoComplete="off"
              />
              <button type="submit" className="ui-header-search__submit">
                Axtar
              </button>
            </div>
          </form>
          <Link href="/" onClick={() => setMobileOpen(false)}>
            Kataloq
          </Link>
          <Link href="/cart" onClick={() => setMobileOpen(false)}>
            Səbət ({cartItemCount})
          </Link>
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.id}
              href={`/?category=${encodeURIComponent(category.slug)}`}
              onClick={() => setMobileOpen(false)}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
