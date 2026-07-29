"use client";

import { useEffect, useMemo, useRef, type ChangeEvent } from "react";

import { getProductImageUrl } from "@itmarket/ui";
import {
  appendCatalogGalleryFiles,
  CATALOG_IMAGE_ACCEPT,
  CATALOG_IMAGE_MAX_COUNT,
  moveCatalogGalleryItem,
  type CatalogGalleryItem,
} from "../../lib/catalog-media-gallery";

type CatalogMediaGalleryFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  items: CatalogGalleryItem[];
  onChange: (items: CatalogGalleryItem[]) => void;
  onErrorChange?: (error: string | undefined) => void;
  disabled?: boolean;
};

export function CatalogMediaGalleryField({
  label,
  hint,
  error,
  items,
  onChange,
  onErrorChange,
  disabled = false,
}: CatalogMediaGalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.kind === "pending") {
        map.set(item.key, URL.createObjectURL(item.file));
      }
    }
    return map;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  function resolvePreviewSrc(item: CatalogGalleryItem): string {
    if (item.kind === "pending") {
      return previewUrls.get(item.key) ?? "/images/product-placeholder.svg";
    }
    return getProductImageUrl({
      id: item.id,
      objectKey: item.objectKey,
      altText: item.altText,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      sortOrder: item.sortOrder,
      ...(item.url === undefined ? {} : { url: item.url }),
    });
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files === null || files.length === 0) {
      return;
    }
    const result = appendCatalogGalleryFiles(items, files);
    onChange(result.items);
    onErrorChange?.(result.error);
    event.target.value = "";
  }

  function removeItem(key: string) {
    onChange(items.filter((item) => item.key !== key));
    onErrorChange?.(undefined);
  }

  function moveItem(key: string, direction: -1 | 1) {
    onChange(moveCatalogGalleryItem(items, key, direction));
  }

  const canAddMore = items.length < CATALOG_IMAGE_MAX_COUNT && !disabled;

  return (
    <div className="catalog-product-variant-fields__media-block catalog-media-gallery">
      <span className="catalog-product-variant-fields__media-label">{label}</span>

      {items.length === 0 ? (
        <div className="catalog-product-variant-fields__media-preview catalog-media-gallery__empty">
          <img src="/images/product-placeholder.svg" alt="Şəkil seçilməyib" />
        </div>
      ) : (
        <ul className="catalog-media-gallery__list" aria-label={label}>
          {items.map((item, index) => (
            <li key={item.key} className="catalog-media-gallery__item">
              <div className="catalog-product-variant-fields__media-preview">
                <img
                  src={resolvePreviewSrc(item)}
                  alt={
                    item.kind === "existing"
                      ? item.altText || `Şəkil ${index + 1}`
                      : `Yeni şəkil ${index + 1}`
                  }
                />
              </div>
              <div className="catalog-media-gallery__actions">
                <button
                  type="button"
                  className="bo-btn-reset catalog-media-gallery__action"
                  disabled={disabled || index === 0}
                  aria-label={`Şəkli yuxarı (${index + 1})`}
                  onClick={() => moveItem(item.key, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="bo-btn-reset catalog-media-gallery__action"
                  disabled={disabled || index === items.length - 1}
                  aria-label={`Şəkli aşağı (${index + 1})`}
                  onClick={() => moveItem(item.key, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="bo-btn-reset catalog-media-gallery__action catalog-media-gallery__action--danger"
                  disabled={disabled}
                  aria-label={`Şəkli sil (${index + 1})`}
                  onClick={() => removeItem(item.key)}
                >
                  Sil
                </button>
              </div>
              <span className="catalog-media-gallery__order">{index + 1}</span>
            </li>
          ))}
        </ul>
      )}

      <label className="catalog-product-variant-fields__media-upload">
        <span className="catalog-product-variant-fields__media-label">
          {items.length === 0 ? "Fayl seçin" : "Daha əlavə et"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={CATALOG_IMAGE_ACCEPT}
          multiple
          disabled={!canAddMore}
          onChange={handleFilesSelected}
          aria-invalid={error !== undefined}
        />
      </label>

      {error !== undefined ? (
        <p className="catalog-subcategories-form__field-error" role="alert">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p className="catalog-product-variant-fields__media-hint">{hint}</p>
      ) : null}
    </div>
  );
}
