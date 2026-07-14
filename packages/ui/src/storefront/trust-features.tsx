export function TrustFeatures() {
  return (
    <section className="ui-feature-grid" aria-labelledby="etibar-basligi">
      <h2 id="etibar-basligi" className="ui-section-heading" style={{ gridColumn: "1 / -1" }}>
        Niyə IT Market?
      </h2>
      <article className="ui-feature-card">
        <span className="ui-feature-card__icon" aria-hidden="true">
          ◎
        </span>
        <h3>Seçilmiş texnologiya</h3>
        <p>
          Noutbuk, monitor və aksesuarlar yalnız yoxlanılmış brend və
          modellərdən ibarətdir.
        </p>
      </article>
      <article className="ui-feature-card">
        <span className="ui-feature-card__icon" aria-hidden="true">
          ₼
        </span>
        <h3>AZN ilə aydın qiymət</h3>
        <p>
          Bütün qiymətlər manatla göstərilir. Checkout-da çatdırılma haqqı
          əvvəlcədən hesablanır.
        </p>
      </article>
      <article className="ui-feature-card">
        <span className="ui-feature-card__icon" aria-hidden="true">
          ✓
        </span>
        <h3>Sürətli sifariş</h3>
        <p>
          Bir neçə addımda sifariş verin — nağd, kart və ya taksit seçimi ilə
          rahat ödəyin.
        </p>
      </article>
    </section>
  );
}
