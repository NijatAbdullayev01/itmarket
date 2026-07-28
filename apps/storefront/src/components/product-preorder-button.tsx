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
};

export function ProductPreorderButton({
  productId,
  productName,
  variantId,
  variantName,
  className,
  label,
}: ProductPreorderButtonProps) {
  const messages = useMessages();
  const [open, setOpen] = useState(false);

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
          <span className="ui-product-card__cta-text--full">{label}</span>
          <span className="ui-product-card__cta-text--short" aria-hidden="true">
            {label}
          </span>
        </span>
      </button>

      <ProductAvailabilityRequestModal
        open={open}
        mode="preorder"
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
