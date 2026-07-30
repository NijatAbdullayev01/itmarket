"use client";

import {
  useCallback,
  useId,
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
import type { ProductSpecEntry } from "../utils/product-spec-entries";
import { formatChromeMessage } from "./chrome-copy";
import { IconChevronDown } from "./icons";
import {
  DefaultMediaImage,
  type MediaImageComponent,
} from "./media-image";
import { ProductSpecsPanel } from "./product-specs-panel";

export type ProductGalleryCopy = {
  specsShow: string;
  specsHide: string;
  galleryAria: string;
  imageN: string;
  descriptionTitle: string;
};

export const defaultProductGalleryCopy: ProductGalleryCopy = {
  specsShow: "X\u00FCsusiyy\u0259tl\u0259r\u0259 bax",
  specsHide: "X\u00FCsusiyy\u0259tl\u0259ri gizl\u0259t",
  galleryAria: "M\u0259hsul \u015F\u0259kill\u0259ri",
  imageN: "\u015E\u0259kil {n}",
  descriptionTitle: "M\u0259hsul haqq\u0131nda",
};

type ProductGalleryProps = {
  media: ProductMedia[];
  productName: string;
  /** Spec rows shown in a mobile-only disclosure under the gallery image. */
  specEntries?: ProductSpecEntry[];
  /** Nested under the mobile specs disclosure (same as desktop panel). */
  description?: string | null;
  copy?: Partial<ProductGalleryCopy>;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

export function ProductGallery({
  media,
  productName,
  specEntries,
  description,
  copy: copyProp,
  Image: ImageComponent = DefaultMediaImage,
}: ProductGalleryProps) {
  const copy = { ...defaultProductGalleryCopy, ...copyProp };
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
  const [specsOpen, setSpecsOpen] = useState(false);
  const specsPanelId = useId();
  const active = images[activeIndex] ?? images[0];
  const activeSrc = getProductImageUrl(active);
  const descriptionText = description?.trim() ?? "";
  const hasSpecsBlock =
    Boolean(specEntries && specEntries.length > 0) || descriptionText.length > 0;

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
        <ImageComponent
          key={active.id}
          imageRef={handleImageRef}
          src={activeSrc}
          alt={getProductImageAlt(active, productName)}
          style={imageStyle}
          onLoad={handleImageLoad}
          priority
          width={800}
          height={800}
          sizes="(max-width: 768px) 100vw, 520px"
        />
      </div>
      {hasSpecsBlock ? (
        <div className="ui-gallery__specs">
          <button
            type="button"
            className="ui-gallery__specs-link"
            aria-expanded={specsOpen}
            aria-controls={specsPanelId}
            onClick={() => setSpecsOpen((current) => !current)}
          >
            {specsOpen ? copy.specsHide : copy.specsShow}
            <IconChevronDown
              className={
                specsOpen
                  ? "ui-gallery__specs-icon ui-gallery__specs-icon--expanded"
                  : "ui-gallery__specs-icon"
              }
              width={16}
              height={16}
              aria-hidden="true"
            />
          </button>
          {specsOpen ? (
            <div id={specsPanelId} className="ui-gallery__specs-panel">
              <ProductSpecsPanel
                entries={specEntries ?? []}
                description={descriptionText || null}
                showHeader={false}
                copy={{ descriptionTitle: copy.descriptionTitle }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {images.length > 1 ? (
        <div className="ui-gallery__thumbs" aria-label={copy.galleryAria}>
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={
                index === activeIndex
                  ? "ui-gallery__thumb ui-gallery__thumb--active"
                  : "ui-gallery__thumb"
              }
              aria-label={formatChromeMessage(copy.imageN, { n: index + 1 })}
              aria-current={index === activeIndex}
              onClick={() => {
                setFrame(null);
                setFrameStatus("idle");
                setActiveIndex(index);
              }}
            >
              <ImageComponent
                src={getProductImageUrl(item)}
                alt={getProductImageAlt(
                  item,
                  `${productName} (${index + 1})`,
                )}
                loading="lazy"
                width={96}
                height={96}
                sizes="96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
