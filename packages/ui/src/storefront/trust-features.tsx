import type { ComponentType } from "react";

import {
  IconDelivery,
  IconInstallmentPayment,
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
    title: "R\u0259smi z\u0259man\u0259t",
    text: "B\u00FCt\u00FCn m\u0259hsullara r\u0259smi distrib\u00FCtor z\u0259man\u0259ti verilir.",
  },
  {
    icon: IconDelivery,
    title: "\u00D6d\u0259ni\u015Fsiz \u00E7atd\u0131r\u0131lma",
    text: "1500 AZN-d\u0259n yuxar\u0131 sifari\u015Fl\u0259r\u0259 Bak\u0131 daxili \u00E7atd\u0131r\u0131lma \u00F6d\u0259ni\u015Fsiz edilir.",
  },
  {
    icon: IconInstallmentPayment,
    title: "Rahat \u00F6d\u0259ni\u015F",
    text: "Kartla, k\u00F6\u00E7\u00FCrm\u0259 il\u0259 v\u0259 hiss\u0259-hiss\u0259 \u00F6d\u0259yin \u2014 m\u00FCdd\u0259ti \u00F6z\u00FCn\u00FCz se\u00E7in.",
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
              <Icon width={28} height={28} />
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
