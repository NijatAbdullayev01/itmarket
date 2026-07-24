import Link from "next/link";

import { formatAznValue } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";

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
};

export function CartCompleteBar({
  visible,
  onDismiss,
  href = "/cart",
  itemCount = 0,
  subtotal = null,
  items = [],
}: CartCompleteBarProps) {
  if (!visible) return null;

  const formattedTotal = formatAznValue(subtotal) ?? "—";
  const thumbnails = items.slice(0, 8);

  return (
    <div className="ui-cart-complete-bar" role="status" aria-live="polite">
      <div className="ui-cart-complete-bar__body">
        <div className="ui-cart-complete-bar__summary">
          <p className="ui-cart-complete-bar__row">
            <span className="ui-cart-complete-bar__label">
              Səbətinizdə məhsul sayı:
            </span>
            <span
              className="ui-cart-complete-bar__count"
              aria-label={`${itemCount} məhsul`}
            >
              {itemCount}
            </span>
          </p>
          <p className="ui-cart-complete-bar__row">
            <span className="ui-cart-complete-bar__label">Məbləğ:</span>
            <span
              className="ui-cart-complete-bar__total"
              aria-label={`Məbləğ: ${formattedTotal}`}
            >
              {formattedTotal}
            </span>
          </p>
        </div>

        {thumbnails.length > 0 ? (
          <ul
            className="ui-cart-complete-bar__thumbs"
            aria-label="Səbətdəki məhsullar"
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
        >
          Sifarişi tamamla
        </Link>
        <button
          type="button"
          className="ui-cart-complete-bar__dismiss"
          onClick={onDismiss}
          aria-label="Bağla"
        >
          ×
        </button>
      </div>
    </div>
  );
}
