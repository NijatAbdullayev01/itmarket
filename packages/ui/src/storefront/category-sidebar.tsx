import Link from "next/link";

import { getRootCategories, type CategoryItem } from "./category-items";
import { CategoryIcon } from "./category-icon";
import { IconChevronRight } from "./icons";

type CategorySidebarProps = {
  categories: CategoryItem[];
};

export function CategorySidebar({ categories }: CategorySidebarProps) {
  const items = getRootCategories(categories);

  return (
    <nav className="ui-category-sidebar" aria-label="Kateqoriyalar">
      {items.length > 0 ? (
        <ul className="ui-category-sidebar__list">
          {items.map((category) => (
            <li key={category.id}>
              <Link
                className="ui-category-sidebar__link"
                href={`/?category=${encodeURIComponent(category.slug)}`}
              >
                <CategoryIcon name={category.name} slug={category.slug} />
                <span className="ui-category-sidebar__name">{category.name}</span>
                <IconChevronRight
                  className="ui-category-sidebar__chevron"
                  width={16}
                  height={16}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-category-sidebar__empty">
          <p>Kateqoriyalar tezliklə əlavə olunacaq.</p>
        </div>
      )}
    </nav>
  );
}
