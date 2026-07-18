"use client";

import { useMemo, useState, useTransition, useEffect } from "react";

import {
  Badge,
  Button,
  EmptyState,
  EmptyStateLink,
  IconClick,
  IconCompare,
  IconDiscount,
  IconHeart,
  Price,
  ProductAvailabilityRequestModal,
  ProductColorPicker,
  ProductCreditApplicationModal,
  ProductCompanionList,
  ProductInstallmentCard,
  ProductPreorderBadge,
  ProductRatingSummary,
  ProductStoragePicker,
  QuantityStepper,
  extractProductColorOptions,
  extractProductStorageOptions,
  formatAzn,
  getColorValue,
  getStorageValue,
  resolveProductVariantId,
} from "@itmarket/ui";
import { useProductCompare } from "@/hooks/use-product-compare";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { MAX_COMPARE_ITEMS } from "@/lib/compare";
import { dispatchCartAdded } from "@/lib/cart-added-toast";
import { useRouter } from "next/navigation";

import { submitProductAvailabilityRequest, submitProductCreditApplication } from "@/app/actions";
import type { ProductSummary } from "@/lib/api";

type ProductVariant = {
  id: string;
  name: string;
  attributes: Record<string, string>;
  price: string;
  priceFormatted: string;
  previousPrice: string | null;
  previousPriceFormatted: string | null;
  available: number;
};

type ProductBuyBoxProps = {
  cartId: string;
  cartVariantIds?: string[];
  product: {
    id: string;
    slug: string;
    name: string;
    categorySlug: string;
  };
  variants: ProductVariant[];
  addToCartAction: (formData: FormData) => void | Promise<void>;
  buyNowAction: (formData: FormData) => void | Promise<void>;
  customerEmail?: string;
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

export function ProductBuyBox({
  cartId,
  cartVariantIds = [],
  product,
  variants,
  addToCartAction,
  buyNowAction,
  customerEmail,
  companionProducts = [],
  reviewSummary,
}: ProductBuyBoxProps) {
  const router = useRouter();
  const { isInCompare, toggle } = useProductCompare();
  const { isInFavorites, toggle: toggleFavorite } = useProductFavorites();
  const [compareMessage, setCompareMessage] = useState<string | null>(null);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [isAddingToCart, startAddToCart] = useTransition();
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [stockAlertModalOpen, setStockAlertModalOpen] = useState(false);
  const [preorderModalOpen, setPreorderModalOpen] = useState(false);

  const firstAvailable = variants.find((variant) => variant.available > 0);
  const fallbackVariant = firstAvailable ?? variants[0];
  const [selectedColorValue, setSelectedColorValue] = useState<string | null>(
    () => getColorValue(fallbackVariant?.attributes ?? {}),
  );
  const [selectedStorageValue, setSelectedStorageValue] = useState<string | null>(
    () => getStorageValue(fallbackVariant?.attributes ?? {}),
  );
  const [quantity, setQuantity] = useState(1);

  const selectedId = useMemo(
    () =>
      resolveProductVariantId(variants, {
        colorValue: selectedColorValue,
        storageValue: selectedStorageValue,
      }),
    [variants, selectedColorValue, selectedStorageValue],
  );

  const selected = useMemo(
    () => variants.find((variant) => variant.id === selectedId) ?? fallbackVariant,
    [selectedId, variants, fallbackVariant],
  );
  const colorOptions = useMemo(
    () =>
      extractProductColorOptions(variants, {
        storageValue: selectedStorageValue,
      }),
    [variants, selectedStorageValue],
  );
  const storageOptions = useMemo(
    () =>
      extractProductStorageOptions(variants, {
        colorValue: selectedColorValue,
      }),
    [variants, selectedColorValue],
  );
  const hasColorSelection = colorOptions.length > 0;
  const hasStorageSelection = storageOptions.length > 0;
  const hasVariantPicker = hasColorSelection || hasStorageSelection;

  useEffect(() => {
    setCartAdded(false);
  }, [selectedId]);

  const isVariantInCart =
    cartVariantIds.includes(selected.id) || cartAdded;

  const inCompare = isInCompare(product.id);
  const inFavorites = isInFavorites(product.id);
  const isUnavailable = selected !== undefined && selected.available <= 0;
  const hasSale =
    selected?.previousPrice !== null &&
    selected?.previousPrice !== undefined &&
    Number(selected.previousPrice) > Number(selected.price);
  const saleDiscount =
    hasSale && selected
      ? discountAmount(selected.price, selected.previousPrice!)
      : null;

  const handleCompare = () => {
    const result = toggle(product);

    if (result.full) {
      setCompareMessage(
        `Bu kateqoriyada maksimum ${MAX_COMPARE_ITEMS} məhsul müqayisə edilə bilər.`,
      );
      window.setTimeout(() => setCompareMessage(null), 2500);
      return;
    }

    if (result.added) {
      setCompareMessage("Müqayisəyə əlavə edildi");
      window.setTimeout(() => setCompareMessage(null), 1800);
      return;
    }

    setCompareMessage(null);
  };

  const handleFavorite = () => {
    const result = toggleFavorite(product);

    if (result.added) {
      setFavoriteMessage("Sevimlilərə əlavə edildi");
      window.setTimeout(() => setFavoriteMessage(null), 1800);
      return;
    }

    setFavoriteMessage(null);
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
      setCartAdded(true);
      router.refresh();
    });
  };

  const handleCreditBuy = () => {
    setCreditModalOpen(true);
  };

  if (variants.length === 0 || selected === undefined) {
    return (
      <div className="ui-product-purchase ui-product-purchase--empty">
        <EmptyState
          title="Bu məhsul hazırda stokda yoxdur"
          description="Stok yenilənəndə kataloqda görünəcək."
          action={<EmptyStateLink href="/" label="Kataloqa qayıt" />}
        />
      </div>
    );
  }

  return (
    <div className="ui-product-hero__buy-stack">
      <div className="ui-product-purchase">
      <div className="ui-product-purchase__price-block">
        <div className="ui-product-purchase__price-row">
          <p className="ui-product-purchase__name">{product.name}</p>
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
          selected.available > 3 ||
          selected.available <= 0 ? (
            <div className="ui-product-purchase__price-meta">
              {saleDiscount !== null ? (
                <span className="ui-product-purchase__discount">
                  <IconDiscount width={14} height={14} />
                  −{formatAzn(saleDiscount)}
                </span>
              ) : null}
              {selected.available > 3 ? (
                <>
                  <Badge variant="success">
                    <img
                      src="/images/icon-warehouse.png"
                      alt=""
                      width={16}
                      height={16}
                      className="ui-badge__icon"
                      aria-hidden="true"
                    />
                    Mövcuddur
                  </Badge>
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
                </>
              ) : null}
              {selected.available <= 0 ? <ProductPreorderBadge /> : null}
            </div>
          ) : null}
          {reviewSummary ? (
            <ProductRatingSummary
              averageRating={reviewSummary.averageRating}
              count={reviewSummary.count}
            />
          ) : null}
        </div>
        {(hasColorSelection || hasStorageSelection) ? (
          <div className="ui-product-purchase__options">
            {hasColorSelection ? (
              <ProductColorPicker
                colors={colorOptions}
                selectedValue={selectedColorValue ?? colorOptions[0].value}
                onSelect={(value) => {
                  setSelectedColorValue(value);
                  const nextStorageOptions = extractProductStorageOptions(
                    variants,
                    { colorValue: value },
                  );
                  if (
                    selectedStorageValue &&
                    !nextStorageOptions.some(
                      (option) => option.value === selectedStorageValue,
                    )
                  ) {
                    setSelectedStorageValue(
                      nextStorageOptions.find((option) => option.available > 0)
                        ?.value ??
                        nextStorageOptions[0]?.value ??
                        null,
                    );
                  }
                  setQuantity(1);
                }}
              />
            ) : null}
            {hasStorageSelection ? (
              <ProductStoragePicker
                options={storageOptions}
                selectedValue={selectedStorageValue ?? storageOptions[0].value}
                onSelect={(value) => {
                  setSelectedStorageValue(value);
                  const nextColorOptions = extractProductColorOptions(variants, {
                    storageValue: value,
                  });
                  if (
                    selectedColorValue &&
                    !nextColorOptions.some(
                      (option) => option.value === selectedColorValue,
                    )
                  ) {
                    setSelectedColorValue(
                      nextColorOptions.find((option) => option.available > 0)
                        ?.value ??
                        nextColorOptions[0]?.value ??
                        null,
                    );
                  }
                  setQuantity(1);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {selected.available > 0 && selected.available <= 3 ? (
        <div className="ui-product-purchase__stock">
          <Badge variant="warning">Son {selected.available} ədəd</Badge>
        </div>
      ) : null}

      {isUnavailable ? (
        <div className="ui-product-purchase__form">
          <div className="ui-product-purchase__actions">
            <div className="ui-product-purchase__unavailable-actions">
              <Button
                type="button"
                variant="secondary"
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
                Mövcud olanda bildir
              </Button>
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
                Ön sifariş
              </Button>
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
                    ? `${product.name} — müqayisədən çıxar`
                    : `${product.name} — müqayisəyə əlavə et`
                }
                aria-pressed={inCompare}
                onClick={handleCompare}
              >
                <IconCompare width={20} height={20} />
                <span>{inCompare ? "Müqayisədə" : "Müqayisə et"}</span>
              </button>
              {compareMessage ? (
                <div className="ui-product-purchase__compare-toast" role="status">
                  <span>{compareMessage}</span>
                  {compareMessage === "Müqayisəyə əlavə edildi" ? (
                    <button type="button" onClick={() => router.push("/compare")}>
                      Bax
                    </button>
                  ) : null}
                </div>
              ) : null}
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
                const variant = variants.find(
                  (entry) => entry.id === event.target.value,
                );
                setSelectedColorValue(
                  getColorValue(variant?.attributes ?? {}) ?? null,
                );
                setSelectedStorageValue(
                  getStorageValue(variant?.attributes ?? {}) ?? null,
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
                  {variant.available <= 0 ? " · Stokda yoxdur" : ""}
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
              Bir kliklə al
            </Button>
            <Button
              type="button"
              block
              className="ui-product-purchase__cta"
              disabled={isAddingToCart}
              onClick={handleAddToCartClick}
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
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {isVariantInCart ? "Səbətə keç" : "Səbətə əlavə et"}
            </Button>
          </div>
          <div className="ui-product-purchase__qty-compare-row">
            <div className="ui-product-purchase__qty-row">
              <QuantityStepper
                value={quantity}
                min={1}
                max={selected.available}
                label="Miqdar"
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
                    ? `${product.name} — müqayisədən çıxar`
                    : `${product.name} — müqayisəyə əlavə et`
                }
                aria-pressed={inCompare}
                onClick={handleCompare}
              >
                <IconCompare width={20} height={20} />
                <span>{inCompare ? "Müqayisədə" : "Müqayisə et"}</span>
              </button>
              {compareMessage ? (
                <div className="ui-product-purchase__compare-toast" role="status">
                  <span>{compareMessage}</span>
                  {compareMessage === "Müqayisəyə əlavə edildi" ? (
                    <button type="button" onClick={() => router.push("/compare")}>
                      Bax
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
                    ? `${product.name} — sevimlilərdən çıxar`
                    : `${product.name} — sevimlilərə əlavə et`
                }
                aria-pressed={inFavorites}
                onClick={handleFavorite}
              >
                <IconHeart width={20} height={20} />
                <span>{inFavorites ? "Sevimlərdə" : "Sevimlilər"}</span>
              </button>
              {favoriteMessage ? (
                <div className="ui-product-purchase__favorite-toast" role="status">
                  <span>{favoriteMessage}</span>
                </div>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            block
            className="ui-product-credit-buy"
            onClick={handleCreditBuy}
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
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Kreditlə al
          </Button>
        </div>
      </form>
      )}
      </div>

      {!isUnavailable ? (
      <>
      <ProductInstallmentCard
        totalAmount={Number(selected.price) * quantity}
        cartId={cartId}
        variantId={selected.id}
        quantity={quantity}
        buyNowAction={buyNowAction}
      />

      <ProductCompanionList
        items={companionProducts}
        cartId={cartId}
        buyNowAction={buyNowAction}
      />
      </>
      ) : null}

      {!isUnavailable ? (
      <ProductCreditApplicationModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        productName={product.name}
        amount={Number(selected.price) * quantity}
        cartId={cartId}
        productId={product.id}
        variantId={selected.id}
        quantity={quantity}
        onSubmit={submitProductCreditApplication}
      />
      ) : null}

      <ProductAvailabilityRequestModal
        open={stockAlertModalOpen}
        mode="stock_alert"
        onClose={() => setStockAlertModalOpen(false)}
        productName={product.name}
        variantName={selected.name}
        productId={product.id}
        variantId={selected.id}
        defaultEmail={customerEmail}
        onSubmit={submitProductAvailabilityRequest}
      />

      <ProductAvailabilityRequestModal
        open={preorderModalOpen}
        mode="preorder"
        onClose={() => setPreorderModalOpen(false)}
        productName={product.name}
        variantName={selected.name}
        productId={product.id}
        variantId={selected.id}
        defaultEmail={customerEmail}
        onSubmit={submitProductAvailabilityRequest}
      />
    </div>
  );
}
