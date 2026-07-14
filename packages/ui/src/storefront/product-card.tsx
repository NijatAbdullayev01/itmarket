import Link from "next/link";

import { Badge } from "../primitives/badge";
import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAzn } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";

type ProductCardProps = {
  slug: string;
  name: string;
  brandName?: string | null;
  price: string | null;
  previousPrice?: string | null;
  available: number;
  image?: ProductMedia | null;
};

export function ProductCard({
  slug,
  name,
  brandName,
  price,
  previousPrice,
  available,
  image,
}: ProductCardProps) {
  const imageUrl = getProductImageUrl(image);
  const imageAlt = getProductImageAlt(image, name);
  const hasSale =
    previousPrice !== null &&
    previousPrice !== undefined &&
    price !== null &&
    Number(previousPrice) > Number(price);

  return (
    <Card className="ui-product-card">
      <Link className="ui-product-card__link" href={`/products/${slug}`}>
        <div className="ui-product-card__media">
          {hasSale ? (
            <span className="ui-product-card__sale-badge">
              <Badge variant="warning">Endirim</Badge>
            </span>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={imageAlt} loading="lazy" />
        </div>
      </Link>
      {brandName ? <p className="ui-product-card__brand">{brandName}</p> : null}
      <h3 className="ui-product-card__title">
        <Link href={`/products/${slug}`}>{name}</Link>
      </h3>
      <div className="ui-product-card__footer">
        <div>
          {price === null ? (
            <span className="ui-price">Qiymət yoxdur</span>
          ) : (
            <>
              <Price
                value={formatAzn(Number(price))}
                variant={hasSale ? "sale" : "default"}
              />
              {hasSale ? (
                <>
                  {" "}
                  <Price
                    value={formatAzn(Number(previousPrice))}
                    variant="previous"
                  />
                </>
              ) : null}
            </>
          )}
        </div>
        {available > 0 ? (
          available <= 3 ? (
            <Badge variant="warning">Son {available} ədəd</Badge>
          ) : (
            <Badge variant="success">Stokda var</Badge>
          )
        ) : (
          <Badge variant="neutral">Stokda yoxdur</Badge>
        )}
      </div>
      <Link className="ui-btn ui-btn--secondary ui-btn--block" href={`/products/${slug}`}>
        Bax
      </Link>
    </Card>
  );
}
