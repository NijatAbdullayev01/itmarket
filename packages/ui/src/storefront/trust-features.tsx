import type { ComponentType } from "react";

import {
  IconBestPrice,
  IconDelivery,
  IconWarranty,
} from "./icons";

export type TrustFeatureItem = {
  icon: ComponentType<{ width?: number; height?: number }>;
  title: string;
  text: string;
};

export type TrustFeaturesCopy = {
  sectionAria: string;
};

export const defaultTrustFeaturesCopy: TrustFeaturesCopy = {
  sectionAria: "Ma\u011Faza \u00FCst\u00FCnl\u00FCkl\u0259ri",
};

const DEFAULT_FEATURES: TrustFeatureItem[] = [
  {
    icon: IconWarranty,
    title: "Z\u0259man\u0259t se\u00E7imi",
    text: "R\u0259smi z\u0259man\u0259t v\u0259 ya \u0259lav\u0259 z\u0259man\u0259t \u2014 sizin se\u00E7iminiz.",
  },
  {
    icon: IconDelivery,
    title: "Pulsuz \u00E7atd\u0131r\u0131lma",
    text: "99 AZN-d\u0259n yuxar\u0131 sifari\u015Fl\u0259r\u0259 Bak\u0131 \u00FCzr\u0259 pulsuz \u00E7atd\u0131r\u0131lma.",
  },
  {
    icon: IconBestPrice,
    title: "\u018Fn s\u0259rf\u0259li qiym\u0259t z\u0259man\u0259ti",
    text: "Eyni m\u0259hsulu daha ucuz tapsan\u0131z, f\u0259rqi \u00F6d\u0259yirik.",
  },
];

type TrustFeaturesProps = {
  items?: TrustFeatureItem[];
  copy?: Partial<TrustFeaturesCopy>;
};

export function TrustFeatures({
  items = DEFAULT_FEATURES,
  copy: copyProp,
}: TrustFeaturesProps) {
  const copy = { ...defaultTrustFeaturesCopy, ...copyProp };
  return (
    <section className="ui-usp-strip" aria-label={copy.sectionAria}>
      {items.map((feature) => {
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
