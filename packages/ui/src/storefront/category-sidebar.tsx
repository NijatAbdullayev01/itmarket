"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { resolveCatalogNavHref } from "./catalog-search-header";
import { getCategoryTree, type CategoryItem, type CategoryTreeNode } from "./category-items";
import { CategorySidebarItem } from "./category-sidebar-item";

export type CategorySidebarCopy = {
  navAria?: string;
  empty?: string;
  childrenAria?: string;
};

const defaultCategorySidebarCopy: Required<CategorySidebarCopy> = {
  navAria: "Kateqoriyalar",
  empty: "Kateqoriyalar tezliklə əlavə olunacaq.",
  childrenAria: "{name} alt kateqoriyaları",
};

function formatSidebarMessage(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

/** Flyout-da eyni anda görünən alt kateqoriya sayı; qalanı siyahı içində scroll olunur. */
const FLYOUT_VISIBLE_CHILD_COUNT = 12;

/** Sticky header altından flyout çıxmasın — shell top header altına düşəndə inset. */
function measureFlyoutTopInset(shell: HTMLElement): number {
  const header = document.querySelector(".ui-site-header");
  if (!(header instanceof HTMLElement)) {
    return 0;
  }
  const headerBottom = header.getBoundingClientRect().bottom;
  if (headerBottom <= 0) {
    return 0;
  }
  const shellTop = shell.getBoundingClientRect().top;
  return Math.max(0, Math.ceil(headerBottom - shellTop));
}

type CategorySidebarProps = {
  categories: CategoryItem[];
  brands?: { slug: string }[];
  copy?: CategorySidebarCopy;
};

export function CategorySidebar({
  categories,
  brands = [],
  copy,
}: CategorySidebarProps) {
  const labels = { ...defaultCategorySidebarCopy, ...copy };
  const tree = getCategoryTree(categories);
  const shellRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<CategoryTreeNode | null>(null);
  const flyoutOpen = activeNode !== null && activeNode.children.length > 0;
  const navHref = (slug: string | undefined) =>
    resolveCatalogNavHref(slug, brands);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!flyoutOpen || !shell) {
      shell?.style.removeProperty("--ui-category-flyout-top");
      return;
    }

    const inset = measureFlyoutTopInset(shell);
    // Sidebar demək olar ki, header altında gizlənibsə flyout-u bağla
    if (inset >= shell.getBoundingClientRect().height - 48) {
      setActiveNode(null);
      return;
    }
    shell.style.setProperty("--ui-category-flyout-top", `${inset}px`);

    const closeFlyout = () => setActiveNode(null);
    window.addEventListener("scroll", closeFlyout, { passive: true });
    window.addEventListener("resize", closeFlyout);

    return () => {
      window.removeEventListener("scroll", closeFlyout);
      window.removeEventListener("resize", closeFlyout);
      shell.style.removeProperty("--ui-category-flyout-top");
    };
  }, [flyoutOpen]);

  return (
    <div
      ref={shellRef}
      className={[
        "ui-category-sidebar-shell",
        flyoutOpen ? "ui-category-sidebar-shell--flyout-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseLeave={() => setActiveNode(null)}
    >
      <nav
        className={[
          "ui-category-sidebar",
          flyoutOpen ? "ui-category-sidebar--flyout-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={labels.navAria}
      >
        {tree.length > 0 ? (
          <ul className="ui-category-sidebar__list">
            {tree.map((node) => (
              <CategorySidebarItem
                key={node.id}
                node={node}
                brands={brands}
                active={activeNode?.id === node.id}
                onActivate={setActiveNode}
              />
            ))}
          </ul>
        ) : (
          <div className="ui-category-sidebar__empty">
            <p>{labels.empty}</p>
          </div>
        )}
      </nav>
      {flyoutOpen ? (
        <div
          className="ui-category-sidebar__flyout-panel"
          onMouseEnter={() => setActiveNode(activeNode)}
        >
          <p className="ui-category-sidebar__flyout-title">{activeNode.name}</p>
          <ul
            key={activeNode.id}
            className={[
              "ui-category-sidebar__flyout-list",
              activeNode.children.length > FLYOUT_VISIBLE_CHILD_COUNT
                ? "ui-category-sidebar__flyout-list--scroll"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={formatSidebarMessage(labels.childrenAria, {
              name: activeNode.name,
            })}
          >
            {activeNode.children.map((child) => (
              <li key={child.id}>
                <Link
                  className="ui-category-sidebar__flyout-link"
                  href={navHref(child.slug)}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
