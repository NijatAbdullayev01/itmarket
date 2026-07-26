"use client";

import { Suspense, type ReactNode } from "react";

import {
  StorefrontShell,
  type HeaderCatalogBrand,
  type HeaderCatalogCategory,
} from "@itmarket/ui";
import { CartCompleteBarHost } from "@/components/cart-complete-bar-host";
import { HeaderAccountLink } from "@/components/header-account-link";
import { HeaderCompareLink } from "@/components/header-compare-link";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { HeaderLanguageSwitcher } from "@/components/header-language-switcher";
import { LocaleProvider, useLocale } from "@/components/locale-provider";
import { ScrollToTopOnNavigate } from "@/components/scroll-to-top-on-navigate";
import {
  toChromeCopy,
  withLocalizedCategoryNames,
  type Locale,
} from "@/lib/i18n";

type StorefrontAppShellProps = {
  children: ReactNode;
  locale: Locale;
  cartItemCount?: number;
  authenticated?: boolean;
  subnav?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
};

function StorefrontAppShellInner({
  children,
  cartItemCount = 0,
  authenticated = false,
  subnav,
  catalogCategories = [],
  catalogBrands = [],
}: Omit<StorefrontAppShellProps, "locale">) {
  const { messages } = useLocale();
  const chromeCopy = toChromeCopy(messages);
  const localizedCategories = withLocalizedCategoryNames(
    catalogCategories,
    messages.catalog.categoryNames,
  );

  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTopOnNavigate />
      </Suspense>
      <CartCompleteBarHost />
      <StorefrontShell
        cartItemCount={cartItemCount}
        authenticated={authenticated}
        languageSwitcher={<HeaderLanguageSwitcher />}
        compareLink={<HeaderCompareLink />}
        favoritesLink={<HeaderFavoritesLink />}
        accountMenu={<HeaderAccountLink authenticated={authenticated} />}
        subnav={subnav}
        catalogCategories={localizedCategories}
        catalogBrands={catalogBrands}
        chromeCopy={chromeCopy}
      >
        {children}
      </StorefrontShell>
    </>
  );
}

export function StorefrontAppShell({
  locale,
  ...props
}: StorefrontAppShellProps) {
  return (
    <LocaleProvider locale={locale}>
      <StorefrontAppShellInner {...props} />
    </LocaleProvider>
  );
}
