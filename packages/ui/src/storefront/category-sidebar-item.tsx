"use client";

import Link from "next/link";

import { resolveCatalogNavHref } from "./catalog-search-header";
import type { CategoryTreeNode } from "./category-items";
import { CategoryIcon } from "./category-icon";
import { IconChevronRight } from "./icons";

type CategorySidebarItemProps = {
  node: CategoryTreeNode;
  brands?: { slug: string }[];
  active: boolean;
  onActivate: (node: CategoryTreeNode) => void;
};

export function CategorySidebarItem({
  node,
  brands = [],
  active,
  onActivate,
}: CategorySidebarItemProps) {
  const hasChildren = node.children.length > 0;

  return (
    <li
      className={[
        "ui-category-sidebar__group",
        hasChildren ? "ui-category-sidebar__group--has-children" : "",
        active ? "ui-category-sidebar__group--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => {
        onActivate(node);
      }}
    >
      <Link
        className="ui-category-sidebar__link"
        href={resolveCatalogNavHref(node.slug, brands)}
        aria-expanded={hasChildren ? active : undefined}
        aria-haspopup={hasChildren ? "true" : undefined}
      >
        <CategoryIcon name={node.name} slug={node.slug ?? ""} />
        <span className="ui-category-sidebar__name">{node.name}</span>
        <IconChevronRight
          className={[
            "ui-category-sidebar__chevron",
            hasChildren ? "ui-category-sidebar__chevron--flyout" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          width={16}
          height={16}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
