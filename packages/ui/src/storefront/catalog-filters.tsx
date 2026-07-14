import Link from "next/link";

type CatalogFiltersProps = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: "newest" | "name" | "price";
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  resultCount: number;
};

export function CatalogFilters({
  q,
  category,
  brand,
  sort = "newest",
  categories,
  brands,
  resultCount,
}: CatalogFiltersProps) {
  const activeFilters = [
    category
      ? {
          key: "category",
          label: categories.find((entry) => entry.slug === category)?.name ?? category,
        }
      : null,
    brand
      ? {
          key: "brand",
          label: brands.find((entry) => entry.slug === brand)?.name ?? brand,
        }
      : null,
    q ? { key: "q", label: `“${q}”` } : null,
  ].filter((entry): entry is { key: string; label: string } => entry !== null);

  return (
    <div className="ui-catalog-toolbar">
      <div className="ui-catalog-toolbar__header">
        <div>
          <p className="ui-section-kicker">Kataloq</p>
          <h1 className="ui-page-title">Məhsullar</h1>
        </div>
        <p className="ui-result-count">{resultCount} məhsul tapıldı</p>
      </div>
      <form className="ui-search-form" action="/" method="get">
        <div className="ui-field">
          <label htmlFor="q">Axtarış</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="SKU, məhsul adı..."
          />
        </div>
        <div className="ui-field">
          <label htmlFor="category">Kateqoriya</label>
          <select id="category" name="category" defaultValue={category ?? ""}>
            <option value="">Bütün kateqoriyalar</option>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ui-field">
          <label htmlFor="brand">Brend</label>
          <select id="brand" name="brand" defaultValue={brand ?? ""}>
            <option value="">Bütün brendlər</option>
            {brands.map((entry) => (
              <option key={entry.id} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ui-field">
          <label htmlFor="sort">Sıralama</label>
          <select id="sort" name="sort" defaultValue={sort}>
            <option value="newest">Ən yeni</option>
            <option value="name">Ada görə</option>
            <option value="price">Qiymətə görə</option>
          </select>
        </div>
        <div className="ui-search-form__submit">
          <button className="ui-btn ui-btn--primary" type="submit">
            Filterlə
          </button>
        </div>
      </form>
      {activeFilters.length > 0 ? (
        <div className="ui-filter-chips" aria-label="Aktiv filterlər">
          {activeFilters.map((filter) => (
            <span className="ui-filter-chip ui-filter-chip--active" key={filter.key}>
              {filter.label}
            </span>
          ))}
          <Link className="ui-filter-chip" href="/">
            Filterləri təmizlə
          </Link>
        </div>
      ) : null}
    </div>
  );
}
