"use client";

import Link from "next/link";
import { useState } from "react";

import type { CategoryTreeNode } from "./category-items";
import { CategoryIcon } from "./category-icon";
import { IconChevronRight } from "./icons";

type CategorySidebarItemProps = {
  node: CategoryTreeNode;
  active: boolean;
  onActivate: (node: CategoryTreeNode) => void;
};

function categoryHref(slug: string) {
  return `/?category=${encodeURIComponent(slug)}`;
}

export function CategorySidebarItem({
  node,
  active,
  onActivate,
}: CategorySidebarItemProps) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li
      className={[
        "ui-category-sidebar__group",
        hasChildren ? "ui-category-sidebar__group--has-children" : "",
        active ? "ui-category-sidebar__group--active" : "",
        open ? "ui-category-sidebar__group--open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => {
        if (hasChildren && window.matchMedia("(min-width: 1101px)").matches) {
          onActivate(node);
        }
      }}
    >
      <Link
        className="ui-category-sidebar__link"
        href={categoryHref(node.slug)}
        aria-expanded={hasChildren ? active || open : undefined}
        aria-haspopup={hasChildren ? "true" : undefined}
        onClick={(event) => {
          if (!hasChildren) {
            return;
          }

          if (window.matchMedia("(max-width: 1100px)").matches) {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
      >
        <CategoryIcon name={node.name} slug={node.slug} />
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
      {hasChildren && open ? (
        <div className="ui-category-sidebar__mobile-flyout">
          <ul
            className="ui-category-sidebar__flyout-list"
            aria-label={`${node.name} alt kateqoriyaları`}
          >
            {node.children.map((child) => (
              <li key={child.id}>
                <Link
                  className="ui-category-sidebar__flyout-link"
                  href={categoryHref(child.slug)}
                  onClick={() => setOpen(false)}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
