import {
  IconBestPrice,
  IconDelivery,
  IconWarranty,
} from "./icons";

const FEATURES = [
  {
    icon: IconWarranty,
    title: "Zəmanət seçimi",
    text: "Rəsmi zəmanət və ya əlavə zəmanət — sizin seçiminiz.",
  },
  {
    icon: IconDelivery,
    title: "Pulsuz çatdırılma",
    text: "99 AZN-dən yuxarı sifarişlərə Bakı üzrə pulsuz çatdırılma.",
  },
  {
    icon: IconBestPrice,
    title: "Ən sərfəli qiymət zəmanəti",
    text: "Eyni məhsulu daha ucuz tapsanız, fərqi ödəyirik.",
  },
];

export function TrustFeatures() {
  return (
    <section className="ui-usp-strip" aria-label="Mağaza üstünlükləri">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        return (
          <article className="ui-usp-card" key={feature.title}>
            <span className="ui-usp-card__icon" aria-hidden="true">
              <Icon />
            </span>
            <div className="ui-usp-card__body">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
