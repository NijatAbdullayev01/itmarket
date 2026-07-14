"use client";

import Link from "next/link";
import { useState } from "react";

import { TrustBar } from "./trust-bar";

type SiteHeaderProps = {
  cartItemCount?: number;
  currentPath?: string;
};

export function SiteHeader({ cartItemCount = 0, currentPath = "/" }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showBadge = cartItemCount > 0;

  return (
    <header className="ui-site-header">
      <div className="ui-container ui-site-header__inner">
        <Link className="ui-brand" href="/" aria-label="IT Market ana səhifə">
          <span className="ui-brand__mark" aria-hidden="true">
            IM
          </span>
          <span>IT Market</span>
        </Link>

        <form className="ui-site-header__search" action="/" method="get" role="search">
          <div className="ui-header-search">
            <label className="sr-only" htmlFor="header-search">
              Məhsul axtar
            </label>
            <input
              id="header-search"
              name="q"
              placeholder="Məhsul, SKU və ya brend axtar..."
              autoComplete="off"
            />
            <button type="submit">Axtar</button>
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
            {mobileOpen ? "✕" : "☰"}
            <span className="sr-only">Menyu</span>
          </button>
          <nav className="ui-site-nav" aria-label="Əsas naviqasiya">
            <Link href="/" aria-current={currentPath === "/" ? "page" : undefined}>
              Kataloq
            </Link>
            <Link
              href="/cart"
              aria-current={currentPath.startsWith("/cart") ? "page" : undefined}
              className="ui-cart-link"
            >
              Səbət
              <span
                className={
                  showBadge ? "ui-cart-badge" : "ui-cart-badge ui-cart-badge--muted"
                }
                aria-label={`Səbətdə ${cartItemCount} məhsul`}
              >
                {cartItemCount}
              </span>
            </Link>
          </nav>
        </div>
      </div>

      <nav
        id="mobile-nav"
        className={mobileOpen ? "ui-mobile-nav ui-mobile-nav--open" : "ui-mobile-nav"}
        aria-label="Mobil naviqasiya"
      >
        <div className="ui-container ui-mobile-nav__links">
          <form action="/" method="get" role="search">
            <div className="ui-header-search" style={{ marginBottom: 12 }}>
              <label className="sr-only" htmlFor="mobile-search">
                Məhsul axtar
              </label>
              <input
                id="mobile-search"
                name="q"
                placeholder="Məhsul axtar..."
                autoComplete="off"
              />
              <button type="submit">Axtar</button>
            </div>
          </form>
          <Link
            href="/"
            aria-current={currentPath === "/" ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            Kataloq
          </Link>
          <Link
            href="/cart"
            aria-current={currentPath.startsWith("/cart") ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            Səbət ({cartItemCount})
          </Link>
        </div>
      </nav>

      <TrustBar />
    </header>
  );
}
