"use client";

import { useState } from "react";

import {
  getProductImageAlt,
  getProductImageUrl,
  PRODUCT_PLACEHOLDER,
  type ProductMedia,
} from "../utils/product-image";

type ProductGalleryProps = {
  media: ProductMedia[];
  productName: string;
};

export function ProductGallery({ media, productName }: ProductGalleryProps) {
  const images =
    media.length > 0
      ? media
      : [
          {
            id: "placeholder",
            objectKey: PRODUCT_PLACEHOLDER,
            altText: productName,
            mimeType: "image/svg+xml",
            byteSize: 0,
            sortOrder: 0,
          },
        ];
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="ui-gallery">
      <div className="ui-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getProductImageUrl(active)}
          alt={getProductImageAlt(active, productName)}
        />
      </div>
      {images.length > 1 ? (
        <div className="ui-gallery__thumbs" aria-label="Məhsul şəkilləri">
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={
                index === activeIndex
                  ? "ui-gallery__thumb ui-gallery__thumb--active"
                  : "ui-gallery__thumb"
              }
              aria-label={`Şəkil ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getProductImageUrl(item)}
                alt=""
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
