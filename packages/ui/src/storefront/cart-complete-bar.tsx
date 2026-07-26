import Link from "next/link";

import { formatChromeMessage } from "./chrome-copy";
import { formatAznValue } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";

export type CartCompleteBarCopy = {
  countLabel: string;
  countLabelShort: string;
  productCountAria: string;
  amountLabel: string;
  itemsAria: string;
  checkout: string;
  checkoutShort: string;
  close: string;
};

export const defaultCartCompleteBarCopy: CartCompleteBarCopy = {
  countLabel: "S\u0259b\u0259tinizdə m\u0259hsul say\u0131:",
  countLabelShort: "M\u0259hsul:",
  productCountAria: "{count} m\u0259hsul",
  amountLabel: "M\u0259bl\u0259\u011F:",
  itemsAria: "S\u0259b\u0259td\u0259ki m\u0259hsullar",
  checkout: "Sifari\u015Fi tamamla",
  checkoutShort: "Tamamla",
  close: "Ba\u011Fla",
};

export type CartCompleteBarItem = {
  id: string;
  productName: string;
  image?: ProductMedia | null;
};

type CartCompleteBarProps = {
  visible: boolean;
  onDismiss: () => void;
  href?: string;
  itemCount?: number;
  subtotal?: string | null;
  items?: CartCompleteBarItem[];
  copy?: Partial<CartCompleteBarCopy>;
};

export function CartCompleteBar({
  visible,
  onDismiss,
  href = "/cart",
  itemCount = 0,
  subtotal = null,
  items = [],
  copy: copyProp,
}: CartCompleteBarProps) {
  if (!visible) return null;

  const copy = { ...defaultCartCompleteBarCopy, ...copyProp };
  const formattedTotal = formatAznValue(subtotal) ?? "\u2014";
  const thumbnails = items.slice(0, 8);

  return (
    <div className="ui-cart-complete-bar" role="status" aria-live="polite">
      <div className="ui-cart-complete-bar__body">
        <div className="ui-cart-complete-bar__summary">
          <p className="ui-cart-complete-bar__row">
            <span className="ui-cart-complete-bar__label">
              <span className="ui-cart-complete-bar__label-full">
                {copy.countLabel}
              </span>
              <span
                className="ui-cart-complete-bar__label-short"
                aria-hidden="true"
              >
                {copy.countLabelShort}
              </span>
            </span>
            <span
              className="ui-cart-complete-bar__count"
              aria-label={formatChromeMessage(copy.productCountAria, { count: itemCount })}
            >
              {itemCount}
            </span>
          </p>
          <p className="ui-cart-complete-bar__row">
            <span className="ui-cart-complete-bar__label">{copy.amountLabel}</span>
            <span
              className="ui-cart-complete-bar__total"
              aria-label={`${copy.amountLabel} ${formattedTotal}`}
            >
              {formattedTotal}
            </span>
          </p>
        </div>

        {thumbnails.length > 0 ? (
          <ul
            className="ui-cart-complete-bar__thumbs"
            aria-label={copy.itemsAria}
          >
            {thumbnails.map((item) => (
              <li key={item.id} className="ui-cart-complete-bar__thumb">
                <Link href={href} onClick={onDismiss} tabIndex={-1}>
                  <img
                    src={getProductImageUrl(item.image)}
                    alt={getProductImageAlt(item.image, item.productName)}
                    loading="lazy"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="ui-cart-complete-bar__actions">
        <Link
          className="ui-btn ui-btn--primary ui-cart-complete-bar__cta"
          href={href}
          onClick={onDismiss}
          aria-label={copy.checkout}
        >
          <span className="ui-cart-complete-bar__cta-full" aria-hidden="true">
            {copy.checkout}
          </span>
          <span className="ui-cart-complete-bar__cta-short" aria-hidden="true">
            {copy.checkoutShort}
          </span>
        </Link>
        <button
          type="button"
          className="ui-cart-complete-bar__dismiss"
          onClick={onDismiss}
          aria-label={copy.close}
        >
          {"\u00D7"}
        </button>
      </div>
    </div>
  );
}
