"use client";

import { useState } from "react";

import { submitProductAvailabilityRequest } from "@/app/actions";
import { useMessages } from "@/components/locale-provider";
import { toProductAvailabilityRequestModalCopy } from "@/lib/i18n";
import {
  IconClock,
  ProductAvailabilityRequestModal,
} from "@itmarket/ui";

type ProductPreorderButtonProps = {
  productId: string;
  productName: string;
  variantId: string;
  variantName?: string;
  className?: string;
  label: string;
  /** Optional compact visible label (aria-label stays `label`). */
  shortLabel?: string;
  mode?: "preorder" | "stock_alert";
};

export function ProductPreorderButton({
  productId,
  productName,
  variantId,
  variantName,
  className,
  label,
  shortLabel,
  mode = "preorder",
}: ProductPreorderButtonProps) {
  const messages = useMessages();
  const [open, setOpen] = useState(false);
  const fullLabel = label;
  const compactLabel = shortLabel?.trim() || label;

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <IconClock width={18} height={18} />
        <span className="ui-product-card__cta-text">
          <span className="ui-product-card__cta-text--full">{fullLabel}</span>
          <span className="ui-product-card__cta-text--short" aria-hidden="true">
            {compactLabel}
          </span>
        </span>
      </button>

      <ProductAvailabilityRequestModal
        open={open}
        mode={mode}
        onClose={() => setOpen(false)}
        productName={productName}
        variantName={variantName}
        productId={productId}
        variantId={variantId}
        onSubmit={submitProductAvailabilityRequest}
        copy={toProductAvailabilityRequestModalCopy(messages)}
      />
    </>
  );
}
