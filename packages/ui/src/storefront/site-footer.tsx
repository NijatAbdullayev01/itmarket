import Link from "next/link";

import { BrandLogo } from "./brand-logo";

export function SiteFooter() {
  return (
    <footer className="ui-site-footer">
      <div className="ui-container ui-site-footer__grid">
        <div className="ui-site-footer__brand">
          <Link className="ui-brand" href="/" aria-label="IT Market ana səhifə">
            <BrandLogo />
          </Link>
          <p>
            Texnologiya məhsullarını aydın qiymət, etibarlı çatdırılma və
            peşəkar xidmətlə təqdim edən Azərbaycan mağazası.
          </p>
        </div>
        <div className="ui-site-footer__column">
          <h3>Mağaza</h3>
          <ul>
            <li>
              <Link href="/">Kataloq</Link>
            </li>
            <li>
              <Link href="/cart">Səbət</Link>
            </li>
          </ul>
        </div>
        <div className="ui-site-footer__column">
          <h3>Çatdırılma</h3>
          <ul>
            <li>Bakı şəhəri — 1–2 iş günü</li>
            <li>Regionlar — 2–5 iş günü</li>
            <li>Mağazadan götürmə mövcuddur</li>
          </ul>
        </div>
        <div className="ui-site-footer__column">
          <h3>Əlaqə</h3>
          <ul>
            <li>
              <a href="tel:+994125555555">+994 12 555 55 55</a>
            </li>
            <li>
              <a href="mailto:destek@itmarket.az">destek@itmarket.az</a>
            </li>
            <li>Bakı, Azərbaycan</li>
          </ul>
        </div>
      </div>
      <div className="ui-container ui-site-footer__bottom">
        <span>© {new Date().getFullYear()} IT Market. Bütün hüquqlar qorunur.</span>
      </div>
    </footer>
  );
}
