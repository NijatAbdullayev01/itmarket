"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import { supportsPhoneTabletVariantAttributes } from "@itmarket/contracts";
import { formatAznValue, formatListedAznValue } from "@/lib/format-azn";
import type { ProductDetail } from "@/lib/api";
import {
  localizeProductDescription,
  localizeProductSpecEntries,
  toProductGalleryCopy,
  toProductInfoCopy,
} from "@/lib/i18n";
import {
  getStorefrontProductDisplayTitleFromSummary,
  getStorefrontProductDisplayTitle,
} from "@/lib/product-display-title";
import {
  attributeHintsFromRequiredSpecs,
  mergeVariantAttributeHints,
} from "@/lib/product-variant-attribute-hints";

import { ProductBuyBox } from "./product-buy-box";
import { StorefrontMediaImage } from "./storefront-media-image";
import { useLocale } from "@/components/locale-provider";

type ProductHeroSectionProps = {
  cartId: string;
  cartVariantIds: string[];
  product: ProductDetail;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  companionSlot?: ReactNode;
  companionProducts?: Awaited<
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
  companionSlot,
  companionProducts = [],
  addToCartAction,
  buyNowAction,
}: ProductHeroSectionProps) {
  const { locale, messages } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
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
        priceFormatted:
          formatListedAznValue(variant.price) ??
          messages.common.priceUnavailable,
        previousPrice: variant.previousPrice,
        previousPriceFormatted: formatAznValue(variant.previousPrice),
        available: variant.available,
        availableByOrder: variant.availableByOrder === true,
        media: variant.media ?? (variant.image ? [variant.image] : []),
        image: variant.image,
      })),
    [messages.common.priceUnavailable, product.variants],
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
  const requiredSpecAttributeHints = useMemo(
    () => attributeHintsFromRequiredSpecs(product.requiredSpecs),
    [product.requiredSpecs],
  );
  const fallbackAttributes = useMemo(
    () =>
      mergeVariantAttributeHints(
        normalizeVariantAttributes(
          fallbackVariant?.attributes ?? {},
          fallbackVariant?.name,
        ),
        requiredSpecAttributeHints,
      ),
    [fallbackVariant, requiredSpecAttributeHints],
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
        attributes: mergeVariantAttributeHints(
          normalizeVariantAttributes(variant.attributes, variant.name),
          requiredSpecAttributeHints,
        ),
      })),
    [requiredSpecAttributeHints, variants],
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

  // Keep `?variant=` shareable/synced without adding a history entry per click.
  useEffect(() => {
    const nextVariantId = selectedVariant?.id;
    if (!nextVariantId || !pathname) {
      return;
    }
    const current = searchParams.get("variant");
    if (current === nextVariantId) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", nextVariantId);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedVariant?.id]);

  const galleryMedia = useMemo(
    () =>
      resolveProductGalleryMedia(
        product.media,
        selectedVariant?.media ?? selectedVariant?.image ?? null,
      ),
    [product.media, selectedVariant?.image, selectedVariant?.media],
  );

  const supportsPhoneTabletVariants = supportsPhoneTabletVariantAttributes({
    slug: product.category.slug,
    name: product.category.name,
    parentSlug: product.category.parentSlug,
  });

  const displayTitle = useMemo(() => {
    return getStorefrontProductDisplayTitle(product, selectedVariant ?? null, {
      includeVariantColor: supportsPhoneTabletVariants,
    });
  }, [product, selectedVariant, supportsPhoneTabletVariants]);

  const specEntries = useMemo(
    () =>
      localizeProductSpecEntries(
        buildProductSpecEntries({
          sku: selectedVariant?.sku,
          brandName: product.brand?.name,
          modelName: product.name,
          requiredSpecs: product.requiredSpecs ?? [],
          variantAttributes: selectedVariant?.attributes,
          includePhoneTabletVariantAttributes: supportsPhoneTabletVariants,
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
      supportsPhoneTabletVariants,
    ],
  );

  const localizedDescription = useMemo(
    () => localizeProductDescription(product.description, locale, messages),
    [locale, messages, product.description],
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
            description={localizedDescription}
            copy={toProductGalleryCopy(messages)}
            Image={StorefrontMediaImage}
          />
        </div>
        <div className="ui-product-hero__specs">
          <ProductInfo
            entries={specEntries}
            description={localizedDescription}
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
            displayTitle,
            categorySlug: product.category.slug,
            categoryName: product.category.name,
            categoryParentSlug: product.category.parentSlug,
            brandName: product.brand?.name ?? null,
            brandSlug: product.brand?.slug ?? null,
          }}
          variants={variants}
          requiredSpecs={product.requiredSpecs}
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
          companionSlot={companionSlot}
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
