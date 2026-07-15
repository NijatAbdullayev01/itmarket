import Link from "next/link";

type CategoryNavProps = {
  categories: { id: string; name: string; slug: string }[];
  activeCategory?: string;
};

const CAMPAIGNS = [
  { label: "Endirimlər", href: "/?sort=price" },
  { label: "Yeni gələnlər", href: "/?sort=newest" },
];

export function CategoryNav({ categories, activeCategory }: CategoryNavProps) {
  return (
    <nav className="ui-category-nav" aria-label="Kateqoriyalar və kampaniyalar">
      <div className="ui-container ui-category-nav__inner">
        <div className="ui-category-nav__scroll">
          <Link
            href="/"
            className={
              activeCategory === undefined
                ? "ui-category-nav__link ui-category-nav__link--active"
                : "ui-category-nav__link"
            }
            aria-current={activeCategory === undefined ? "page" : undefined}
          >
            Hamısı
          </Link>
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/?category=${encodeURIComponent(category.slug)}`}
              className={
                activeCategory === category.slug
                  ? "ui-category-nav__link ui-category-nav__link--active"
                  : "ui-category-nav__link"
              }
              aria-current={
                activeCategory === category.slug ? "page" : undefined
              }
            >
              {category.name}
            </Link>
          ))}
          {CAMPAIGNS.map((campaign) => (
            <Link
              key={campaign.href}
              href={campaign.href}
              className="ui-category-nav__link ui-category-nav__link--campaign"
            >
              {campaign.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
