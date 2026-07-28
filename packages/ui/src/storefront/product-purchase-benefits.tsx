import { IconDelivery, IconDoorPayment, IconReturn, IconWarranty } from "./icons";
import type { ComponentType } from "react";

export type ProductPurchaseBenefitItem = {
  icon: ComponentType<{ width?: number; height?: number }>;
  title: string;
  text: string;
};

export type ProductPurchaseBenefitsCopy = {
  sectionAria: string;
  listAria: string;
};

export const defaultProductPurchaseBenefitsCopy: ProductPurchaseBenefitsCopy = {
  sectionAria: "\u00C7atd\u0131r\u0131lma v\u0259 z\u0259man\u0259t",
  listAria: "Al\u0131\u015F \u00FCst\u00FCnl\u00FCkl\u0259ri",
};

const DEFAULT_ITEMS: ProductPurchaseBenefitItem[] = [
  {
    icon: IconDelivery,
    title: "\u00C7atd\u0131r\u0131lma",
    text: "500 AZN-d\u0259n yuxar\u0131 sifari\u015Fl\u0259r\u0259 Bak\u0131 daxili \u00E7atd\u0131r\u0131lma \u00F6d\u0259ni\u015Fsiz edilir.",
  },
  {
    icon: IconWarranty,
    title: "Z\u0259man\u0259t",
    text: "R\u0259smi z\u0259man\u0259t v\u0259 \u0259lav\u0259 z\u0259man\u0259t se\u00E7imi m\u00F6vcuddur.",
  },
  {
    icon: IconDoorPayment,
    title: "T\u0259hl\u00FCk\u0259sizlik",
    text: "\u00D6d\u0259ni\u015Fl\u0259riniz tam t\u0259hl\u00FCk\u0259siz h\u0259yata ke\u00E7irilir.",
  },
  {
    icon: IconReturn,
    title: "Qaytarma",
    text: "14 g\u00FCn \u0259rzind\u0259 qaytarma.",
  },
];

type ProductPurchaseBenefitsProps = {
  items?: ProductPurchaseBenefitItem[];
  copy?: Partial<ProductPurchaseBenefitsCopy>;
};

export function ProductPurchaseBenefits({
  items = DEFAULT_ITEMS,
  copy: copyProp,
}: ProductPurchaseBenefitsProps) {
  const copy = { ...defaultProductPurchaseBenefitsCopy, ...copyProp };
  return (
    <div className="ui-product-purchase-benefits" aria-label={copy.sectionAria}>
      <ul
        className="ui-product-purchase-benefit ui-product-purchase__trust ui-product-purchase__trust--under-benefit"
        aria-label={copy.listAria}
      >
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.title} className="ui-product-purchase__trust-item">
              <span className="ui-product-purchase-benefit__icon" aria-hidden="true">
                <Icon width={20} height={20} />
              </span>
              <div className="ui-product-purchase-benefit__body">
                <h3 className="ui-product-purchase-benefit__title">{item.title}</h3>
                <p className="ui-product-purchase-benefit__text">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
