import type { ReactNode } from "react";

import { ChatBubble } from "./chat-bubble";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { TrustBar } from "./trust-bar";

type SiteLayoutProps = {
  children: ReactNode;
  cartItemCount?: number;
  currentPath?: string;
  activeCategory?: string;
  categories?: { id: string; name: string; slug: string }[];
  mainClassName?: string;
};

export function SiteLayout({
  children,
  cartItemCount = 0,
  currentPath = "/",
  activeCategory,
  categories = [],
  mainClassName,
}: SiteLayoutProps) {
  const mainClasses = ["ui-main", mainClassName].filter(Boolean).join(" ");

  return (
    <div className="ui-shell">
      <a className="ui-skip-link" href="#esas-mezmun">
        Əsas məzmuna keç
      </a>
      <TrustBar />
      <SiteHeader
        cartItemCount={cartItemCount}
        currentPath={currentPath}
        activeCategory={activeCategory}
        categories={categories}
      />
      <main id="esas-mezmun" className={mainClasses}>
        {children}
      </main>
      <SiteFooter />
      <ChatBubble />
    </div>
  );
}
