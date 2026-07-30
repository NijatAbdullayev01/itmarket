"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  Badge,
  BrandMark,
  Button,
  EmptyState,
  EmptyStateLink,
  IconCart,
  IconClick,
  IconCompare,
  IconDiscount,
  IconHeart,
  Price,
  ProductAvailabilityRequestModal,
  ProductColorPicker,
  ProductCompanionList,
  ProductInstallmentCard,
  ProductPreorderBadge,
  ProductRatingSummary,
  ProductStoragePicker,
  QuantityStepper,
  mergeProductPickerOptions,
  pickVariantOptionValue,
  extractProductColorOptions,
  extractProductRamOptions,
  extractProductStorageOptions,
  formatAzn,
  getColorValue,
  getRamValue,
  getStorageValue,
  normalizeVariantAttributes,
  resolveProductVariantId,
} from "@itmarket/ui";
import { useProductCompare } from "@/hooks/use-product-compare";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { useLocale } from "@/components/locale-provider";
import {
  formatMessage,
  localizeCatalogColor,
  toProductAvailabilityRequestModalCopy,
  toProductColorPickerCopy,
  toProductInstallmentCardCopy,
  toProductStoragePickerCopy,
} from "@/lib/i18n";
import { MAX_COMPARE_ITEMS } from "@/lib/compare";
import { dispatchCartAdded } from "@/lib/cart-added-toast";
import { useRouter } from "next/navigation";
import { StorefrontMediaImage } from "@/components/storefront-media-image";

import { submitProductAvailabilityRequest } from "@/app/actions";
import type { ProductSummary } from "@/lib/api";
import {
  attributeHintsFromRequiredSpecs,
  mergeVariantAttributeHints,
} from "@/lib/product-variant-attribute-hints";

type ProductVariant = {
  id: string;
  name: string;
  attributes: Record<string, string>;
  price: string;
  priceFormatted: string;
  previousPrice: string | null;
  previousPriceFormatted: string | null;
  available: number;
  availableByOrder?: boolean;
};

type VariantSelectionState = {
  selectedColorValue: string | null;
  selectedStorageValue: string | null;
  selectedRamValue: string | null;
  setSelectedColorValue: (value: string | null) => void;
  setSelectedStorageValue: (value: string | null) => void;
  setSelectedRamValue: (value: string | null) => void;
};

type ProductBuyBoxProps = {
  cartId: string;
  cartVariantIds?: string[];
  product: {
    id: string;
    slug: string;
    /**
     * Visible H1 and a11y labels — brand + model + selected variant
     * (aligned with SERP title / Product JSON-LD `name`; see docs/seo.md).
     */
    displayTitle: string;
    categorySlug: string;
    brandName?: string | null;
    brandSlug?: string | null;
  };
  variants: ProductVariant[];
  /** Product-level specs used when a single SKU has no color/storage attributes yet. */
  requiredSpecs?: { label: string; value: string }[];
  variantSelection?: VariantSelectionState;
  addToCartAction: (formData: FormData) => void | Promise<void>;
  buyNowAction: (formData: FormData) => void | Promise<void>;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  companionProducts?: ProductSummary[];
  reviewSummary?: {
    averageRating: number | null;
    count: number;
  };
};

function discountAmount(price: string, previousPrice: string): number | null {
  const current = Number(price);
  const previous = Number(previousPrice);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= current) return null;
  return previous - current;
}

function pickCompatibleOptionValue(
  options: { value: string; available: number }[],
  current: string | null,
): string | null {
  return pickVariantOptionValue(options, current);
}

export function ProductBuyBox({
  cartId,
  cartVariantIds = [],
  product,
  variants,
  requiredSpecs,
  variantSelection,
  addToCartAction,
  buyNowAction,
  customerEmail,
  customerFirstName,
  customerLastName,
  companionProducts = [],
  reviewSummary,
}: ProductBuyBoxProps) {
  const router = useRouter();
  const { isInCompare, toggle } = useProductCompare();
  const { isInFavorites, toggle: toggleFavorite } = useProductFavorites();
  const { locale, messages } = useLocale();
  const [compareStatus, setCompareStatus] = useState<"added" | "full" | null>(null);
  const [favoriteStatus, setFavoriteStatus] = useState<"added" | null>(null);
  const [cartAddedVariantId, setCartAddedVariantId] = useState<string | null>(
    null,
  );
  const [isAddingToCart, startAddToCart] = useTransition();
  const [stockAlertModalOpen, setStockAlertModalOpen] = useState(false);
  const [preorderModalOpen, setPreorderModalOpen] = useState(false);

  const firstAvailable = variants.find((variant) => variant.available > 0);
  const fallbackVariant = firstAvailable ?? variants[0];
  const fallbackAttributes = normalizeVariantAttributes(
    fallbackVariant?.attributes ?? {},
    fallbackVariant?.name,
  );
  const [internalColorValue, setInternalColorValue] = useState<string | null>(
    () => getColorValue(fallbackAttributes),
  );
  const [internalStorageValue, setInternalStorageValue] = useState<string | null>(
    () => getStorageValue(fallbackAttributes),
  );
  const [internalRamValue, setInternalRamValue] = useState<string | null>(() =>
    getRamValue(fallbackAttributes),
  );
  const selectedColorValue =
    variantSelection?.selectedColorValue ?? internalColorValue;
  const selectedStorageValue =
    variantSelection?.selectedStorageValue ?? internalStorageValue;
  const selectedRamValue =
    variantSelection?.selectedRamValue ?? internalRamValue;
  const setSelectedColorValue =
    variantSelection?.setSelectedColorValue ?? setInternalColorValue;
  const setSelectedStorageValue =
    variantSelection?.setSelectedStorageValue ?? setInternalStorageValue;
  const setSelectedRamValue =
    variantSelection?.setSelectedRamValue ?? setInternalRamValue;
  const [quantity, setQuantity] = useState(1);

  const requiredSpecAttributeHints = useMemo(
    () => attributeHintsFromRequiredSpecs(requiredSpecs),
    [requiredSpecs],
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

  const selectedId = useMemo(
    () =>
      resolveProductVariantId(catalogVariants, {
        colorValue: selectedColorValue,
        storageValue: selectedStorageValue,
        ramValue: selectedRamValue,
      }),
    [catalogVariants, selectedColorValue, selectedRamValue, selectedStorageValue],
  );

  const selected = useMemo(
    () => variants.find((variant) => variant.id === selectedId) ?? fallbackVariant,
    [selectedId, variants, fallbackVariant],
  );
  const allColorOptions = useMemo(
    () => extractProductColorOptions(catalogVariants),
    [catalogVariants],
  );
  const allStorageOptions = useMemo(
    () => extractProductStorageOptions(catalogVariants),
    [catalogVariants],
  );
  const colorOptions = useMemo(
    () =>
      mergeProductPickerOptions(
        allColorOptions,
        extractProductColorOptions(catalogVariants, {
          storageValue: selectedStorageValue,
          ramValue: selectedRamValue,
        }),
      ),
    [
      allColorOptions,
      catalogVariants,
      selectedRamValue,
      selectedStorageValue,
    ],
  );
  const storageOptions = useMemo(
    () =>
      mergeProductPickerOptions(
        allStorageOptions,
        extractProductStorageOptions(catalogVariants, {
          colorValue: selectedColorValue,
          ramValue: selectedRamValue,
        }),
      ),
    [
      allStorageOptions,
      catalogVariants,
      selectedColorValue,
      selectedRamValue,
    ],
  );
  // Show color/storage even for a single SKU so buyers see the attributes
  // (not only when there are multiple choices to switch between).
  const hasColorSelection = allColorOptions.length > 0;
  const hasStorageSelection = allStorageOptions.length > 0;
  const hasVariantPicker = hasColorSelection || hasStorageSelection;
  const matrixSelection =
    allColorOptions.length > 1 && allStorageOptions.length > 1;

  const cartAdded = cartAddedVariantId === selected.id;
  const isVariantInCart =
    cartVariantIds.includes(selected.id) || cartAdded;

  const inCompare = isInCompare(selected.id);
  const inFavorites = isInFavorites(selected.id);
  const isUnavailable = selected !== undefined && selected.available <= 0;
  const canOrderByRequest =
    isUnavailable && selected?.availableByOrder === true;
  const hasSale =
    selected?.previousPrice !== null &&
    selected?.previousPrice !== undefined &&
    Number(selected.previousPrice) > Number(selected.price);
  const saleDiscount =
    hasSale && selected
      ? discountAmount(selected.price, selected.previousPrice!)
      : null;

  const handleCompare = () => {
    const result = toggle({
      id: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.displayTitle,
      categorySlug: product.categorySlug,
    });

    if (result.full) {
      setCompareStatus("full");
      window.setTimeout(() => setCompareStatus(null), 2500);
      return;
    }

    if (result.added) {
      setCompareStatus("added");
      window.setTimeout(() => setCompareStatus(null), 1800);
      return;
    }

    setCompareStatus(null);
  };

  const handleFavorite = () => {
    const result = toggleFavorite({
      id: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.displayTitle,
    });

    if (result.added) {
      setFavoriteStatus("added");
      window.setTimeout(() => setFavoriteStatus(null), 1800);
      return;
    }

    setFavoriteStatus(null);
  };

  const handleAddToCartClick = () => {
    if (isVariantInCart) {
      router.push("/cart");
      return;
    }

    if (selected === undefined) return;

    const formData = new FormData();
    formData.set("cartId", cartId);
    formData.set("variantId", selected.id);
    formData.set("quantity", String(quantity));

    startAddToCart(async () => {
      await addToCartAction(formData);
      dispatchCartAdded();
      setCartAddedVariantId(selected.id);
      router.refresh();
    });
  };

  if (variants.length === 0 || selected === undefined) {
    return (
      <div className="ui-product-purchase ui-product-purchase--empty">
        <EmptyState
          title={messages.product.unavailableTitle}
          description={messages.product.unavailableDescription}
          action={<EmptyStateLink href="/" label={messages.product.backToCatalog} />}
        />
      </div>
    );
  }

  return (
    <div className="ui-product-hero__buy-stack">
      <div className="ui-product-purchase">
      <div className="ui-product-purchase__price-block">
        <div className="ui-product-purchase__price-row">
          <h1 className="ui-product-purchase__name">{product.displayTitle}</h1>
          {product.brandSlug && product.brandName ? (
            <p className="ui-product-purchase__brand">
              <Link
                href={`/brands/${encodeURIComponent(product.brandSlug)}`}
                className="ui-product-purchase__brand-link"
              >
                <BrandMark
                  name={product.brandName}
                  slug={product.brandSlug}
                  fallback="null"
                  className="ui-product-purchase__brand-logo"
                />
                <span className="ui-product-purchase__brand-name">
                  {product.brandName}
                </span>
              </Link>
            </p>
          ) : null}
          <div className="ui-product-purchase__prices">
            <Price
              value={selected.priceFormatted}
              className="ui-product-purchase__price"
            />
            {hasSale && selected.previousPriceFormatted ? (
              <Price
                value={selected.previousPriceFormatted}
                variant="previous"
                className="ui-product-purchase__price-old"
              />
            ) : null}
          </div>
          {saleDiscount !== null ||
          selected.available > 0 ||
          selected.available <= 0 ? (
            <div className="ui-product-purchase__price-meta">
              {saleDiscount !== null ? (
                <span className="ui-product-purchase__discount">
                  <IconDiscount width={14} height={14} />
                  −{formatAzn(saleDiscount)}
                </span>
              ) : null}
              {selected.available > 0 ? (
                selected.available <= 3 ? (
                  <Badge variant="warning">
                    {formatMessage(messages.cart.lineLastN, {
                      n: selected.available,
                    })}
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <img
                      src="/images/icon-warehouse.png"
                      alt=""
                      width={16}
                      height={16}
                      className="ui-badge__icon"
                      aria-hidden="true"
                    />
                    {messages.common.inStock}
                  </Badge>
                )
              ) : (
                <ProductPreorderBadge
                  label={
                    canOrderByRequest
                      ? messages.product.availableByOrderBadge
                      : messages.product.preorderBadge
                  }
                  variant={canOrderByRequest ? "warning" : "error"}
                />
              )}
              <span className="ui-product-purchase__vat-refund-logo-wrap">
                <img
                  src="/images/edv-geri-al-logo.png"
                  alt="ƏDV GERİ AL"
                  width={600}
                  height={300}
                  decoding="async"
                  className="ui-product-purchase__vat-refund-logo"
                />
              </span>
            </div>
          ) : null}
          {reviewSummary ? (
            <ProductRatingSummary
              averageRating={reviewSummary.averageRating}
              count={reviewSummary.count}
              copy={{
                reviewCount: messages.product.reviewCount,
                ratingAria: messages.product.ratingAria,
              }}
            />
          ) : null}
        </div>
        {hasVariantPicker ? (
          <div className="ui-product-purchase__options">
            {hasStorageSelection ? (
              <ProductStoragePicker
                key={`storage-picker-${locale}`}
                matrixSelection={matrixSelection}
                options={storageOptions}
                selectedValue={selectedStorageValue ?? storageOptions[0].value}
                copy={toProductStoragePickerCopy(messages)}
                onSelect={(value) => {
                  const mergedColors = mergeProductPickerOptions(
                    allColorOptions,
                    extractProductColorOptions(catalogVariants, {
                      storageValue: value,
                      ramValue: selectedRamValue,
                    }),
                  );
                  const nextColor = pickCompatibleOptionValue(
                    mergedColors,
                    selectedColorValue,
                  );

                  setSelectedStorageValue(value);
                  setSelectedColorValue(nextColor);
                  setSelectedRamValue(
                    pickCompatibleOptionValue(
                      extractProductRamOptions(catalogVariants, {
                        storageValue: value,
                        colorValue: nextColor,
                      }),
                      selectedRamValue,
                    ),
                  );
                  setQuantity(1);
                }}
              />
            ) : null}
            {hasColorSelection ? (
              <ProductColorPicker
                key={`color-picker-${locale}`}
                matrixSelection={matrixSelection}
                colors={colorOptions}
                selectedValue={selectedColorValue ?? colorOptions[0].value}
                copy={toProductColorPickerCopy(messages)}
                formatLabel={(label) => localizeCatalogColor(label, locale)}
                onSelect={(value) => {
                  const mergedStorage = mergeProductPickerOptions(
                    allStorageOptions,
                    extractProductStorageOptions(catalogVariants, {
                      colorValue: value,
                      ramValue: selectedRamValue,
                    }),
                  );
                  const nextStorage = pickCompatibleOptionValue(
                    mergedStorage,
                    selectedStorageValue,
                  );

                  setSelectedColorValue(value);
                  setSelectedStorageValue(nextStorage);
                  setSelectedRamValue(
                    pickCompatibleOptionValue(
                      extractProductRamOptions(catalogVariants, {
                        colorValue: value,
                        storageValue: nextStorage,
                      }),
                      selectedRamValue,
                    ),
                  );
                  setQuantity(1);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {isUnavailable ? (
        <div className="ui-product-purchase__form">
          <div className="ui-product-purchase__actions">
            <div className="ui-product-purchase__unavailable-actions">
              {canOrderByRequest ? (
                <Button
                  type="button"
                  block
                  className="ui-product-purchase__preorder"
                  onClick={() => setPreorderModalOpen(true)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width={20}
                    height={20}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {messages.product.preorder}
                </Button>
              ) : (
                <Button
                  type="button"
                  block
                  className="ui-product-purchase__notify"
                  onClick={() => setStockAlertModalOpen(true)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width={20}
                    height={20}
                    aria-hidden="true"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {messages.product.notifyWhenAvailable}
                </Button>
              )}
            </div>
            <div className="ui-product-purchase__secondary-actions">
              <div className="ui-product-purchase__compare-wrap">
                <button
                  type="button"
                  className={
                    inCompare
                      ? "ui-product-purchase__compare ui-product-purchase__compare--active"
                      : "ui-product-purchase__compare"
                  }
                  aria-label={
                    inCompare
                      ? `${product.displayTitle} — ${messages.product.compareRemove}`
                      : `${product.displayTitle} — ${messages.product.compareAdd}`
                  }
                  aria-pressed={inCompare}
                  onClick={handleCompare}
                >
                  <IconCompare width={20} height={20} />
                  <span>{inCompare ? messages.product.inCompare : messages.product.compare}</span>
                </button>
                {compareStatus ? (
                  <div
                    className="ui-product-purchase__compare-toast"
                    role="status"
                  >
                    <span>{compareStatus === "added" ? messages.product.compareAdded : formatMessage(messages.product.compareMax, { max: MAX_COMPARE_ITEMS })}</span>
                    {compareStatus === "added" ? (
                      <button
                        type="button"
                        onClick={() => router.push("/compare")}
                      >
                        {messages.compare.viewLabel}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="ui-product-purchase__favorite-wrap">
                <button
                  type="button"
                  className={
                    inFavorites
                      ? "ui-product-purchase__favorite ui-product-purchase__favorite--active"
                      : "ui-product-purchase__favorite"
                  }
                  aria-label={
                    inFavorites
                      ? `${product.displayTitle} — ${messages.product.favoriteRemove}`
                      : `${product.displayTitle} — ${messages.product.favoriteAdd}`
                  }
                  aria-pressed={inFavorites}
                  onClick={handleFavorite}
                >
                  <IconHeart width={20} height={20} />
                  <span>{inFavorites ? messages.product.inFavorites : messages.product.favorites}</span>
                </button>
                {favoriteStatus ? (
                  <div
                    className="ui-product-purchase__favorite-toast"
                    role="status"
                  >
                    <span>{messages.product.favoriteAdded}</span>
                    <button
                      type="button"
                      onClick={() => router.push("/favorites")}
                    >
                      {messages.compare.viewLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
      <form
        action={addToCartAction}
        className="ui-product-purchase__form"
      >
        <input type="hidden" name="cartId" value={cartId} />
        <input type="hidden" name="quantity" value={quantity} />

        {variants.length > 1 && !hasVariantPicker ? (
          <div className="ui-field">
            <label htmlFor="variantId">Variant</label>
            <select
              id="variantId"
              name="variantId"
              value={selectedId}
              onChange={(event) => {
                const variant = catalogVariants.find(
                  (entry) => entry.id === event.target.value,
                );
                setSelectedColorValue(
                  getColorValue(
                    normalizeVariantAttributes(
                      variant?.attributes ?? {},
                      variant?.name,
                    ),
                  ) ?? null,
                );
                setSelectedStorageValue(
                  getStorageValue(
                    normalizeVariantAttributes(
                      variant?.attributes ?? {},
                      variant?.name,
                    ),
                  ) ?? null,
                );
                setSelectedRamValue(
                  getRamValue(
                    normalizeVariantAttributes(
                      variant?.attributes ?? {},
                      variant?.name,
                    ),
                  ) ?? null,
                );
                setQuantity(1);
              }}
            >
              {variants.map((variant) => (
                <option
                  disabled={variant.available <= 0}
                  key={variant.id}
                  value={variant.id}
                >
                  {variant.name} · {variant.priceFormatted}
                  {variant.available <= 0 ? ` · ${messages.common.outOfStock}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="variantId" value={selected.id} />
        )}

        <div className="ui-product-purchase__actions">
          <div className="ui-product-purchase__cta-row">
            <Button
              type="submit"
              formAction={buyNowAction}
              variant="secondary"
              className="ui-product-purchase__quick-buy"
            >
              <IconClick width={20} height={20} />
              {messages.product.buyNow}
            </Button>
            <Button
              type="button"
              block
              className="ui-product-purchase__cta"
              disabled={isAddingToCart}
              onClick={handleAddToCartClick}
            >
              <IconCart width={20} height={20} />
              {isVariantInCart ? messages.product.goToCart : messages.product.addToCart}
            </Button>
          </div>
          <div className="ui-product-purchase__qty-compare-row">
            <div className="ui-product-purchase__qty-row">
              <QuantityStepper
                value={quantity}
                min={1}
                max={selected.available}
                label={messages.common.quantity}
                onChange={setQuantity}
              />
            </div>
            <div className="ui-product-purchase__compare-wrap">
              <button
                type="button"
                className={
                  inCompare
                    ? "ui-product-purchase__compare ui-product-purchase__compare--active"
                    : "ui-product-purchase__compare"
                }
                aria-label={
                  inCompare
                    ? `${product.displayTitle} — ${messages.product.compareRemove}`
                    : `${product.displayTitle} — ${messages.product.compareAdd}`
                }
                aria-pressed={inCompare}
                onClick={handleCompare}
              >
                <IconCompare width={20} height={20} />
                <span>{inCompare ? messages.product.inCompare : messages.product.compare}</span>
              </button>
              {compareStatus ? (
                <div className="ui-product-purchase__compare-toast" role="status">
                  <span>{compareStatus === "added" ? messages.product.compareAdded : formatMessage(messages.product.compareMax, { max: MAX_COMPARE_ITEMS })}</span>
                  {compareStatus === "added" ? (
                    <button type="button" onClick={() => router.push("/compare")}>
                      {messages.compare.viewLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="ui-product-purchase__favorite-wrap">
              <button
                type="button"
                className={
                  inFavorites
                    ? "ui-product-purchase__favorite ui-product-purchase__favorite--active"
                    : "ui-product-purchase__favorite"
                }
                aria-label={
                  inFavorites
                    ? `${product.displayTitle} — ${messages.product.favoriteRemove}`
                    : `${product.displayTitle} — ${messages.product.favoriteAdd}`
                }
                aria-pressed={inFavorites}
                onClick={handleFavorite}
              >
                <IconHeart width={20} height={20} />
                <span>{inFavorites ? messages.product.inFavorites : messages.product.favorites}</span>
              </button>
              {favoriteStatus ? (
                <div className="ui-product-purchase__favorite-toast" role="status">
                  <span>{messages.product.favoriteAdded}</span>
                  <button
                    type="button"
                    onClick={() => router.push("/favorites")}
                  >
                    {messages.compare.viewLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </form>
      )}
      </div>

      <ProductInstallmentCard
        totalAmount={Number(selected.price) * quantity}
        cartId={cartId}
        variantId={selected.id}
        quantity={quantity}
        buyNowAction={buyNowAction}
        purchaseDisabled={isUnavailable}
        copy={toProductInstallmentCardCopy(messages)}
      />

      {!isUnavailable ? (
        <ProductCompanionList
          items={companionProducts}
          cartId={cartId}
          buyNowAction={buyNowAction}
          Image={StorefrontMediaImage}
        />
      ) : null}

      {canOrderByRequest ? (
        <ProductAvailabilityRequestModal
          open={preorderModalOpen}
          mode="preorder"
          onClose={() => setPreorderModalOpen(false)}
          productName={product.displayTitle}
          variantName={selected.name}
          productId={product.id}
          variantId={selected.id}
          defaultFirstName={customerFirstName}
          defaultLastName={customerLastName}
          defaultEmail={customerEmail}
          onSubmit={submitProductAvailabilityRequest}
          copy={toProductAvailabilityRequestModalCopy(messages)}
        />
      ) : (
        <ProductAvailabilityRequestModal
          open={stockAlertModalOpen}
          mode="stock_alert"
          onClose={() => setStockAlertModalOpen(false)}
          productName={product.displayTitle}
          variantName={selected.name}
          productId={product.id}
          variantId={selected.id}
          defaultFirstName={customerFirstName}
          defaultLastName={customerLastName}
          defaultEmail={customerEmail}
          onSubmit={submitProductAvailabilityRequest}
          copy={toProductAvailabilityRequestModalCopy(messages)}
        />
      )}
    </div>
  );
}
