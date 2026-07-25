"use client";

import {
  useCallback,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";

import {
  measureGalleryContentFrame,
  supportsObjectViewBox,
  type GalleryContentFrame,
} from "../utils/gallery-content-frame";
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
  const [frame, setFrame] = useState<GalleryContentFrame | null>(null);
  const [frameStatus, setFrameStatus] = useState<"idle" | "ready" | "skip">(
    "idle",
  );
  const active = images[activeIndex] ?? images[0];
  const activeSrc = getProductImageUrl(active);

  const syncFrame = useCallback((image: HTMLImageElement | null) => {
    if (!image || !image.naturalWidth) {
      return;
    }
    try {
      const measured = measureGalleryContentFrame(image);
      setFrame(measured);
      setFrameStatus(measured ? "ready" : "skip");
    } catch {
      setFrame(null);
      setFrameStatus("skip");
    }
  }, []);

  const handleImageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete) {
        syncFrame(node);
      }
    },
    [syncFrame],
  );

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    syncFrame(event.currentTarget);
  };

  const useViewBox = Boolean(frame && supportsObjectViewBox());
  // Stage size is controlled in CSS (full column width × 550px). Measured
  // framing only drives crop/zoom, never layout height.
  const mainStyle = {
    ...(frame && !useViewBox
      ? ({ ["--gallery-zoom" as string]: String(frame.zoom) } as CSSProperties)
      : null),
  } as CSSProperties;

  const imageStyle = {
    ...(useViewBox && frame
      ? ({
          objectViewBox: frame.viewBox,
        } as CSSProperties)
      : null),
  } as CSSProperties;

  return (
    <div className="ui-gallery">
      <div
        className="ui-gallery__main"
        data-frame={
          frameStatus === "idle"
            ? "idle"
            : useViewBox
              ? "viewbox"
              : frame
                ? "zoom"
                : "skip"
        }
        style={mainStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.id}
          ref={handleImageRef}
          src={activeSrc}
          alt={getProductImageAlt(active, productName)}
          style={imageStyle}
          onLoad={handleImageLoad}
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
              onClick={() => {
                setFrame(null);
                setFrameStatus("idle");
                setActiveIndex(index);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getProductImageUrl(item)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
