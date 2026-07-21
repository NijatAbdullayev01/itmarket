"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconCompare } from "@itmarket/ui";
import { MAX_COMPARE_ITEMS } from "@/lib/compare";
import { useProductCompare } from "@/hooks/use-product-compare";

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
  const [message, setMessage] = useState<string | null>(null);
  const active = isInCompare(product.variantId);

  const handleClick = () => {
    const result = toggle(product);

    if (result.full) {
      setMessage(
        `Bu kateqoriyada maksimum ${MAX_COMPARE_ITEMS} məhsul müqayisə edilə bilər.`,
      );
      window.setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (result.added) {
      setMessage("Müqayisəyə əlavə edildi");
      window.setTimeout(() => setMessage(null), 1800);
      return;
    }

    setMessage(null);
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
            ? `${product.name} — müqayisədən çıxar`
            : `${product.name} — müqayisəyə əlavə et`
        }
        title={active ? "Müqayisədən çıxar" : "Müqayisə et"}
        aria-pressed={active}
        onClick={handleClick}
      >
        <IconCompare width={18} height={18} />
      </button>
      {message ? (
        <div className="ui-product-card__compare-toast" role="status">
          <span>{message}</span>
          {message === "Müqayisəyə əlavə edildi" ? (
            <button type="button" onClick={handleNavigate}>
              Bax
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
