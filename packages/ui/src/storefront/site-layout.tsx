import type { ReactNode } from "react";

import { ChatBubble } from "./chat-bubble";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type SiteLayoutProps = {
  children: ReactNode;
  cartItemCount?: number;
  currentPath?: string;
  mainClassName?: string;
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
};

export function SiteLayout({
  children,
  cartItemCount = 0,
  currentPath = "/",
  mainClassName,
  compareLink,
  favoritesLink,
  accountMenu,
  subnav,
}: SiteLayoutProps) {
  const mainClasses = ["ui-main", mainClassName].filter(Boolean).join(" ");

  return (
    <div className="ui-shell">
      <a className="ui-skip-link" href="#esas-mezmun">
        Əsas məzmuna keç
      </a>
      <SiteHeader
        cartItemCount={cartItemCount}
        currentPath={currentPath}
        compareLink={compareLink}
        favoritesLink={favoritesLink}
        accountMenu={accountMenu}
        subnav={subnav}
      />
      <main id="esas-mezmun" className={mainClasses}>
        {children}
      </main>
      <SiteFooter />
      <ChatBubble />
    </div>
  );
}
