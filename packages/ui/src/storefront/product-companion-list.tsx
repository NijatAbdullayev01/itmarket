import Link from "next/link";

import { Price } from "../primitives/price";
import { formatAznValue } from "../utils/format-azn";
import { getProductInstallmentTeaser } from "../utils/product-installment-teaser";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";

export type ProductCompanionItem = {
  id: string;
  slug: string;
  name: string;
  price: string | null;
  available: number;
  defaultVariantId: string | null;
  image?: ProductMedia | null;
};

type ProductCompanionListProps = {
  items: ProductCompanionItem[];
  cartId: string;
  buyNowAction: (formData: FormData) => void | Promise<void>;
};

export function ProductCompanionList({
  items,
  cartId,
  buyNowAction,
}: ProductCompanionListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      id="product-companions"
      className="ui-product-companions"
      aria-label="Yanında ala biləcəyiniz məhsullar"
    >
      <h2 className="ui-product-companions__title">
        Yanında ala biləcəyiniz məhsullar
      </h2>
      <ul className="ui-product-companions__list">
        {items.map((item) => {
          const imageUrl = getProductImageUrl(item.image);
          const imageAlt = getProductImageAlt(item.image, item.name);
          const canQuickAdd =
            item.available > 0 && item.defaultVariantId !== null;
          const formattedPrice = formatAznValue(item.price);
          const installmentTeaser =
            item.available > 0
              ? getProductInstallmentTeaser(item.price)
              : null;

          return (
            <li key={item.id} className="ui-product-companion">
              <Link
                href={`/products/${item.slug}`}
                className="ui-product-companion__media"
              >
                <img src={imageUrl} alt={imageAlt} loading="lazy" decoding="async" />
              </Link>
              <div className="ui-product-companion__body">
                <Link
                  href={`/products/${item.slug}`}
                  className="ui-product-companion__name"
                >
                  {item.name}
                </Link>
                <div className="ui-product-companion__pricing">
                  {formattedPrice ? (
                    <Price
                      value={formattedPrice}
                      className="ui-product-companion__price"
                    />
                  ) : (
                    <span className="ui-product-companion__price ui-product-companion__price--missing">
                      Qiymət yoxdur
                    </span>
                  )}
                  {installmentTeaser ? (
                    <span className="ui-product-companion__installment">
                      {installmentTeaser.months} ay ·{" "}
                      {installmentTeaser.monthlyAmountFormatted}
                    </span>
                  ) : null}
                </div>
              </div>
              {canQuickAdd ? (
                <form action={buyNowAction} className="ui-product-companion__form">
                  <input type="hidden" name="cartId" value={cartId} />
                  <input
                    type="hidden"
                    name="variantId"
                    value={item.defaultVariantId!}
                  />
                  <input type="hidden" name="quantity" value="1" />
                  <button
                    type="submit"
                    className="ui-product-companion__add"
                    aria-label={`${item.name} — əlavə et`}
                  >
                    Əlavə et
                  </button>
                </form>
              ) : (
                <Link
                  href={`/products/${item.slug}`}
                  className="ui-product-companion__add ui-product-companion__add--link"
                  aria-label={`${item.name} — bax`}
                >
                  Bax
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
