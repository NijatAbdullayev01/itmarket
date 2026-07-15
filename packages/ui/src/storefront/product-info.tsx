import { BrandMark } from "./brand-mark";
import { IconDelivery, IconStore } from "./icons";

type ProductInfoProps = {
  name: string;
  description: string | null;
  category: { name: string; slug: string };
  brand: { name: string; slug: string } | null;
  attributes?: Record<string, string>;
  categoryHref?: string;
};

const FULFILLMENT = [
  {
    icon: IconDelivery,
    title: "Çatdırılma",
    text: "Bakı və regionlara çatdırılma mövcuddur.",
  },
  {
    icon: IconStore,
    title: "Mağazadan götürmə",
    text: "Checkout zamanı mağaza seçimi aktivləşir.",
  },
] as const;

export function ProductInfo({
  name,
  description,
  category,
  brand,
  attributes,
  categoryHref,
}: ProductInfoProps) {
  const specEntries =
    attributes && Object.keys(attributes).length > 0
      ? Object.entries(attributes)
      : null;

  return (
    <section className="ui-product-info" aria-labelledby="product-title">
      <header className="ui-product-info__header">
        <div className="ui-product-info__meta">
          {categoryHref ? (
            <a className="ui-product-info__category" href={categoryHref}>
              {category.name}
            </a>
          ) : (
            <span className="ui-product-info__category ui-product-info__category--static">
              {category.name}
            </span>
          )}
          {brand ? (
            <span className="ui-product-info__brand">
              <BrandMark
                name={brand.name}
                slug={brand.slug}
                className="ui-product-info__brand-logo"
              />
            </span>
          ) : null}
        </div>
        <h1 className="ui-product-info__title" id="product-title">
          {name}
        </h1>
      </header>

      <div className="ui-product-info__section ui-product-info__section--about">
        <h2 className="ui-product-info__section-title">Məhsul haqqında</h2>
        <div className="ui-product-info__about-panel">
          <p className="ui-product-info__description">
            {description ?? "Bu məhsul üçün təsvir əlavə edilməyib."}
          </p>
          {specEntries ? (
            <div className="ui-product-info__highlights-wrap">
              <p className="ui-product-info__highlights-label">
                Texniki göstəricilər
              </p>
              <dl
                className="ui-product-info__highlights"
                aria-label="Texniki göstəricilər"
              >
                {specEntries.map(([key, value]) => (
                  <div className="ui-product-info__highlight" key={key}>
                    <dt className="ui-product-info__highlight-key">{key}</dt>
                    <dd className="ui-product-info__highlight-value">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ui-product-info__section">
        <h2 className="ui-product-info__section-title">Çatdırılma və götürmə</h2>
        <div className="ui-product-info__fulfillment">
          {FULFILLMENT.map((item) => {
            const Icon = item.icon;
            return (
              <article className="ui-product-info__fulfillment-card" key={item.title}>
                <span className="ui-product-info__fulfillment-icon" aria-hidden="true">
                  <Icon width={22} height={22} />
                </span>
                <div className="ui-product-info__fulfillment-body">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
