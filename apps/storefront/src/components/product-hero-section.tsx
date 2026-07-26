"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  ProductGallery,
  ProductInfo,
  buildProductSpecEntries,
  filterProductReviewsForVariant,
  getColorValue,
  getRamValue,
  getStorageValue,
  normalizeVariantAttributes,
  resolveProductGalleryMedia,
  resolveProductVariantId,
  summarizeProductReviews,
} from "@itmarket/ui";
import { formatAznValue } from "@/lib/format-azn";
import type { ProductDetail } from "@/lib/api";
import {
  localizeProductSpecEntries,
  toProductGalleryCopy,
  toProductInfoCopy,
} from "@/lib/i18n";
import {
  getStorefrontProductDisplayTitleFromSummary,
  getStorefrontProductDisplayTitle,
} from "@/lib/product-display-title";

import { ProductBuyBox } from "./product-buy-box";
import { useLocale } from "@/components/locale-provider";

type ProductHeroSectionProps = {
  cartId: string;
  cartVariantIds: string[];
  product: ProductDetail;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  companionProducts: Awaited<
    ReturnType<typeof import("@/lib/api").listCompanionProducts>
  >["items"];
  addToCartAction: (formData: FormData) => void | Promise<void>;
  buyNowAction: (formData: FormData) => void | Promise<void>;
};

export function ProductHeroSection({
  cartId,
  cartVariantIds,
  product,
  customerEmail,
  customerFirstName,
  customerLastName,
  companionProducts,
  addToCartAction,
  buyNowAction,
}: ProductHeroSectionProps) {
  const { locale, messages } = useLocale();
  const searchParams = useSearchParams();
  const variantFromUrl = searchParams.get("variant");

  const variants = useMemo(
    () =>
      product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        attributes: variant.attributes,
        price: variant.price,
        priceFormatted: formatAznValue(variant.price) ?? "Qiymət yoxdur",
        previousPrice: variant.previousPrice,
        previousPriceFormatted: formatAznValue(variant.previousPrice),
        available: variant.available,
        image: variant.image,
      })),
    [product.variants],
  );

  const preferredVariant = useMemo(() => {
    if (variantFromUrl) {
      const match = variants.find((variant) => variant.id === variantFromUrl);
      if (match) {
        return match;
      }
    }
    return null;
  }, [variantFromUrl, variants]);

  const firstAvailable = variants.find((variant) => variant.available > 0);
  const fallbackVariant = preferredVariant ?? firstAvailable ?? variants[0];
  const fallbackAttributes = normalizeVariantAttributes(
    fallbackVariant?.attributes ?? {},
    fallbackVariant?.name,
  );

  const [selectedColorValue, setSelectedColorValue] = useState<string | null>(
    () => getColorValue(fallbackAttributes) ?? null,
  );
  const [selectedStorageValue, setSelectedStorageValue] = useState<string | null>(
    () => getStorageValue(fallbackAttributes) ?? null,
  );
  const [selectedRamValue, setSelectedRamValue] = useState<string | null>(
    () => getRamValue(fallbackAttributes) ?? null,
  );

  const catalogVariants = useMemo(
    () =>
      variants.map((variant) => ({
        ...variant,
        attributes: normalizeVariantAttributes(variant.attributes, variant.name),
      })),
    [variants],
  );

  const selectedVariantId = useMemo(
    () =>
      resolveProductVariantId(catalogVariants, {
        colorValue: selectedColorValue,
        storageValue: selectedStorageValue,
        ramValue: selectedRamValue,
      }),
    [catalogVariants, selectedColorValue, selectedRamValue, selectedStorageValue],
  );

  const selectedVariant = useMemo(() => {
    const match = variants.find((variant) => variant.id === selectedVariantId);
    return match ?? fallbackVariant;
  }, [fallbackVariant, selectedVariantId, variants]);

  const galleryMedia = useMemo(
    () =>
      resolveProductGalleryMedia(
        product.media,
        selectedVariant?.image ?? null,
      ),
    [product.media, selectedVariant?.image],
  );

  const displayTitle = useMemo(
    () =>
      getStorefrontProductDisplayTitle(product, selectedVariant ?? null),
    [product, selectedVariant],
  );

  const specEntries = useMemo(
    () =>
      localizeProductSpecEntries(
        buildProductSpecEntries({
          sku: selectedVariant?.sku,
          brandName: product.brand?.name,
          modelName: product.name,
          requiredSpecs: product.requiredSpecs ?? [],
          variantAttributes: selectedVariant?.attributes,
        }),
        locale,
        messages,
      ),
    [
      locale,
      messages,
      product.brand?.name,
      product.name,
      product.requiredSpecs,
      selectedVariant?.attributes,
      selectedVariant?.sku,
    ],
  );

  const variantReviews = useMemo(
    () =>
      filterProductReviewsForVariant(
        product.reviews,
        selectedVariant?.id ?? null,
      ),
    [product.reviews, selectedVariant?.id],
  );
  const variantReviewSummary = useMemo(
    () => summarizeProductReviews(variantReviews),
    [variantReviews],
  );

  return (
    <section className="ui-product-hero" aria-label={messages.product.overviewAria}>
      <div className="ui-product-hero__left">
        <div className="ui-product-hero__gallery">
          <ProductGallery
            key={selectedVariant?.id ?? product.id}
            media={galleryMedia}
            productName={displayTitle}
            specEntries={specEntries}
            copy={toProductGalleryCopy(messages)}
          />
        </div>
        <div className="ui-product-hero__specs">
          <ProductInfo
            entries={specEntries}
            reviewSummary={variantReviewSummary}
            reviews={variantReviews}
            copy={toProductInfoCopy(messages)}
          />
        </div>
      </div>
      <div className="ui-product-hero__buy">
        <ProductBuyBox
          cartId={cartId}
          cartVariantIds={cartVariantIds}
          product={{
            id: product.id,
            slug: product.slug,
            name: displayTitle,
            categorySlug: product.category.slug,
          }}
          variants={variants}
          variantSelection={{
            selectedColorValue,
            selectedStorageValue,
            selectedRamValue,
            setSelectedColorValue,
            setSelectedStorageValue,
            setSelectedRamValue,
          }}
          addToCartAction={addToCartAction}
          buyNowAction={buyNowAction}
          customerEmail={customerEmail}
          customerFirstName={customerFirstName}
          customerLastName={customerLastName}
          companionProducts={companionProducts.map((item) => ({
            ...item,
            name: getStorefrontProductDisplayTitleFromSummary(item),
          }))}
          reviewSummary={variantReviewSummary}
        />
      </div>
    </section>
  );
}
