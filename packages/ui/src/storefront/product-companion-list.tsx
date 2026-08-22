import Link from "next/link";

import { Price } from "../primitives/price";
import { formatListedAznValue } from "../utils/format-azn";
import { getProductInstallmentTeaser } from "../utils/product-installment-teaser";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import {
  DefaultMediaImage,
  type MediaImageComponent,
} from "./media-image";
import { IconChevronRight } from "./icons";

export type ProductCompanionItem = {
  id: string;
  slug: string;
  name: string;
  price: string | null;
  available: number;
  defaultVariantId: string | null;
  image?: ProductMedia | null;
};

export type ProductCompanionListCopy = {
  title?: string;
  ariaLabel?: string;
  priceUnavailable?: string;
  viewDetails?: string;
  addToCart?: string;
  monthsUnit?: string;
};

type ProductCompanionListProps = {
  items: ProductCompanionItem[];
  cartId: string;
  buyNowAction: (formData: FormData) => void | Promise<void>;
  copy?: ProductCompanionListCopy;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

export function ProductCompanionList({
  items,
  cartId,
  buyNowAction,
  copy,
  Image: ImageComponent = DefaultMediaImage,
}: ProductCompanionListProps) {
  const title = copy?.title ?? "Yanında ala biləcəyiniz məhsullar";
  const ariaLabel = copy?.ariaLabel ?? title;
  const priceUnavailable = copy?.priceUnavailable ?? "Sorğu əsasında";
  const viewDetails = copy?.viewDetails ?? "Bax";
  const addToCart = copy?.addToCart ?? "Əlavə et";
  const monthsUnit = copy?.monthsUnit ?? "ay";
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      id="product-companions"
      className="ui-product-companions"
      aria-label={ariaLabel}
    >
      <h2 className="ui-product-companions__title">
        {title}
      </h2>
      <ul className="ui-product-companions__list">
        {items.map((item) => {
          const imageUrl = getProductImageUrl(item.image);
          const imageAlt = getProductImageAlt(item.image, item.name);
          const canQuickAdd =
            item.available > 0 && item.defaultVariantId !== null;
          const formattedPrice = formatListedAznValue(item.price);
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
                <ImageComponent
                  src={imageUrl}
                  alt={imageAlt}
                  loading="lazy"
                  width={200}
                  height={200}
                  sizes="120px"
                />
              </Link>
              <div className="ui-product-companion__body">
                <Link
                  href={`/products/${item.slug}`}
                  className="ui-product-companion__name"
                  title={item.name}
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
                      {priceUnavailable}
                    </span>
                  )}
                  {installmentTeaser ? (
                    <span className="ui-product-companion__installment">
                      {installmentTeaser.months} {monthsUnit} ·{" "}
                      {installmentTeaser.monthlyAmountFormatted}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="ui-product-companion__action">
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
                      aria-label={`${item.name} — ${addToCart}`}
                    >
                      <span>{addToCart}</span>
                    </button>
                  </form>
                ) : (
                  <Link
                    href={`/products/${item.slug}`}
                    className="ui-product-companion__add ui-product-companion__add--link"
                    aria-label={`${item.name} — ${viewDetails}`}
                  >
                    <span>{viewDetails}</span>
                    <IconChevronRight width={13} height={13} />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
