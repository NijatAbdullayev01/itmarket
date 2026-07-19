"use client";

import Link from "next/link";
import { useState } from "react";

import { getCategoryTree, type CategoryItem, type CategoryTreeNode } from "./category-items";
import { CategorySidebarItem } from "./category-sidebar-item";

type CategorySidebarProps = {
  categories: CategoryItem[];
};

function categoryHref(slug: string) {
  return `/?category=${encodeURIComponent(slug)}`;
}

export function CategorySidebar({ categories }: CategorySidebarProps) {
  const tree = getCategoryTree(categories);
  const [activeNode, setActiveNode] = useState<CategoryTreeNode | null>(null);
  const flyoutOpen = activeNode !== null && activeNode.children.length > 0;

  return (
    <div
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
        aria-label="Kateqoriyalar"
      >
        {tree.length > 0 ? (
          <ul className="ui-category-sidebar__list">
            {tree.map((node) => (
              <CategorySidebarItem
                key={node.id}
                node={node}
                active={activeNode?.id === node.id}
                onActivate={setActiveNode}
              />
            ))}
          </ul>
        ) : (
          <div className="ui-category-sidebar__empty">
            <p>Kateqoriyalar tezliklə əlavə olunacaq.</p>
          </div>
        )}
      </nav>
      {flyoutOpen ? (
        <div
          className="ui-category-sidebar__flyout-panel"
          onMouseEnter={() => setActiveNode(activeNode)}
        >
          <ul
            className="ui-category-sidebar__flyout-list"
            aria-label={`${activeNode.name} alt kateqoriyaları`}
          >
            {activeNode.children.map((child) => (
              <li key={child.id}>
                <Link
                  className="ui-category-sidebar__flyout-link"
                  href={categoryHref(child.slug)}
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
