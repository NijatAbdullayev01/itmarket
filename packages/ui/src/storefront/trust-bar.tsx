export function TrustBar() {
  return (
    <div className="ui-trust-bar" aria-label="Mağaza üstünlükləri">
      <div className="ui-container ui-trust-bar__inner">
        <a className="ui-trust-bar__phone" href="tel:+994125555555">
          <span className="ui-trust-bar__icon" aria-hidden="true">
            ☎
          </span>
          *5555 — pulsuz zəng
        </a>
        <span className="ui-trust-bar__item">
          <span className="ui-trust-bar__icon" aria-hidden="true">
            ✓
          </span>
          Rəsmi zəmanətli məhsullar
        </span>
        <span className="ui-trust-bar__item">
          <span className="ui-trust-bar__icon" aria-hidden="true">
            ₼
          </span>
          Nağd və kart ödənişi
        </span>
        <span className="ui-trust-bar__item">
          <span className="ui-trust-bar__icon" aria-hidden="true">
            →
          </span>
          Bakı və regionlara çatdırılma
        </span>
      </div>
    </div>
  );
}
