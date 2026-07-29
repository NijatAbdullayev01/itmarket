import type { ReactNode } from "react";

import {
  ChatBubble,
  type ChatBubbleProps,
} from "./chat-bubble";
import {
  defaultStorefrontChromeCopy,
  type StorefrontChromeCopy,
} from "./chrome-copy";
import type {
  HeaderCatalogBrand,
  HeaderCatalogCategory,
} from "./header-catalog-button";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import type { MediaImageComponent } from "./media-image";

type SiteLayoutProps = {
  children: ReactNode;
  cartItemCount?: number;
  mainClassName?: string;
  languageSwitcher?: ReactNode;
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
  catalogButton?: ReactNode;
  cartLink?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
  chromeCopy?: StorefrontChromeCopy;
  chatBubble: ChatBubbleProps;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

export function SiteLayout({
  children,
  cartItemCount = 0,
  mainClassName,
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
  chatBubble,
  Image,
}: SiteLayoutProps) {
  const mainClasses = ["ui-main", mainClassName].filter(Boolean).join(" ");

  return (
    <div className="ui-shell">
      <a className="ui-skip-link" href="#esas-mezmun">
        {chromeCopy.skipToContent}
      </a>
      <SiteHeader
        cartItemCount={cartItemCount}
        languageSwitcher={languageSwitcher}
        compareLink={compareLink}
        favoritesLink={favoritesLink}
        accountMenu={accountMenu}
        subnav={subnav}
        catalogButton={catalogButton}
        cartLink={cartLink}
        catalogCategories={catalogCategories}
        catalogBrands={catalogBrands}
        chromeCopy={chromeCopy}
        Image={Image}
      />
      <main id="esas-mezmun" className={mainClasses}>
        {children}
      </main>
      <SiteFooter chromeCopy={chromeCopy} />
      <ChatBubble {...chatBubble} />
    </div>
  );
}
