import Link from "next/link";

const DISCOUNT_TICKER_MESSAGES = [
  "Yay endirimləri — seçilmiş məhsullarda xüsusi qiymət",
  "0% 12 ay taksit imkanı",
  "99 AZN-dən yuxarı pulsuz çatdırılma",
  "Məişət texnikasında endirim kampaniyası",
  "Noutbuk və monitorlarda sərfəli təkliflər",
];

export function CategoryNav() {
  const tickerItems = [...DISCOUNT_TICKER_MESSAGES, ...DISCOUNT_TICKER_MESSAGES];

  return (
    <nav className="ui-category-nav" aria-label="Endirimlər və kampaniyalar">
      <div className="ui-container ui-category-nav__inner">
        <Link
          href="/?sort=price"
          className="ui-category-nav__ticker"
          aria-label="Endirimlər və kampaniyalar"
        >
          <span className="ui-category-nav__ticker-label">Endirimlər</span>
          <span className="ui-category-nav__ticker-viewport" aria-hidden="true">
            <span className="ui-category-nav__ticker-track">
              {tickerItems.map((message, index) => (
                <span key={`${message}-${index}`} className="ui-category-nav__ticker-item">
                  {message}
                </span>
              ))}
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
