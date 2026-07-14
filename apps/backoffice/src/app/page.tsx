import { Operations } from "./operations";

const navGroups = [
  {
    title: "Kataloq",
    items: [
      { href: "#catalog-operations", label: "Kateqoriya və məhsul" },
      { href: "#catalog-operations", label: "Media" },
    ],
  },
  {
    title: "Stok",
    items: [
      { href: "#catalog-operations", label: "Balans" },
      { href: "#catalog-operations", label: "Transfer" },
    ],
  },
  {
    title: "Sifarişlər",
    items: [{ href: "#orders-section", label: "Sifariş siyahısı" }],
  },
  {
    title: "POS",
    items: [{ href: "#pos-section", label: "Satış və qaytarma" }],
  },
  {
    title: "Hesabatlar",
    items: [{ href: "#reports-section", label: "Export və filter" }],
  },
];

export default function BackofficeHome() {
  return (
    <div className="bo-shell">
      <a className="skip-link" href="#staff-content">
        Əsas məzmuna keç
      </a>
      <header className="office-header">
        <div className="office-brand">
          <span className="office-mark" aria-hidden="true">
            IM
          </span>
          <div>
            <strong>IT Market</strong>
            <span>Əməliyyat mərkəzi</span>
          </div>
        </div>
        <div className="staff-label">
          <span aria-hidden="true" />
          Yalnız əməkdaşlar üçün
        </div>
      </header>

      <div className="bo-layout">
        <aside className="bo-sidebar" aria-label="Operator naviqasiyası">
          {navGroups.map((group) => (
            <div className="bo-nav-group" key={group.title}>
              <p className="bo-nav-group__title">{group.title}</p>
              <nav>
                {group.items.map((item) => (
                  <a key={`${group.title}-${item.label}`} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          ))}
        </aside>
        <Operations />
      </div>

      <footer className="office-footer">
        <span>IT Market · Operator səthi</span>
        <span>Kataloq · Stok · Sifariş · POS · Hesabat</span>
      </footer>
    </div>
  );
}
