"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconCompare } from "@itmarket/ui";
import { MAX_COMPARE_ITEMS } from "@/lib/compare";
import { useProductCompare } from "@/hooks/use-product-compare";
import { useMessages } from "@/components/locale-provider";
import { formatMessage } from "@/lib/i18n";

type ProductCompareButtonProps = {
  product: {
    id: string;
    variantId: string;
    slug: string;
    name: string;
    categorySlug: string;
  };
};

export function ProductCompareButton({ product }: ProductCompareButtonProps) {
  const router = useRouter();
  const { isInCompare, toggle } = useProductCompare();
  const messages = useMessages();
  const [status, setStatus] = useState<"added" | "full" | null>(null);
  const active = isInCompare(product.variantId);

  const handleClick = () => {
    const result = toggle(product);

    if (result.full) {
      setStatus("full");
      window.setTimeout(() => setStatus(null), 2500);
      return;
    }

    if (result.added) {
      setStatus("added");
      window.setTimeout(() => setStatus(null), 1800);
      return;
    }

    setStatus(null);
  };

  const handleNavigate = () => {
    router.push("/compare");
  };

  return (
    <div className="ui-product-card__compare-wrap">
      <button
        type="button"
        className={
          active
            ? "ui-product-card__icon-btn ui-product-card__icon-btn--active"
            : "ui-product-card__icon-btn"
        }
        aria-label={
          active
            ? `${product.name} — ${messages.product.compareRemove}`
            : `${product.name} — ${messages.product.compareAdd}`
        }
        title={active ? messages.product.compareRemove : messages.product.compare}
        aria-pressed={active}
        onClick={handleClick}
      >
        <IconCompare width={18} height={18} />
      </button>
      {status ? (
        <div className="ui-product-card__compare-toast" role="status">
          <span>{status === "added" ? messages.product.compareAdded : formatMessage(messages.product.compareMax, { max: MAX_COMPARE_ITEMS })}</span>
          {status === "added" ? (
            <button type="button" onClick={handleNavigate}>
              {messages.compare.viewLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
