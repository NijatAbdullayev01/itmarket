"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconHeart } from "@itmarket/ui";
import { useProductFavorites } from "@/hooks/use-product-favorites";

type ProductFavoriteButtonProps = {
  product: {
    id: string;
    variantId: string;
    slug: string;
    name: string;
  };
};

export function ProductFavoriteButton({ product }: ProductFavoriteButtonProps) {
  const router = useRouter();
  const { isInFavorites, toggle } = useProductFavorites();
  const [message, setMessage] = useState<string | null>(null);
  const active = isInFavorites(product.variantId);

  const handleClick = () => {
    const result = toggle(product);

    if (result.added) {
      setMessage("Sevimlilərə əlavə edildi");
      window.setTimeout(() => setMessage(null), 1800);
      return;
    }

    setMessage(null);
  };

  const handleNavigate = () => {
    router.push("/favorites");
  };

  return (
    <div className="ui-product-card__compare-wrap">
      <button
        type="button"
        className={
          active
            ? "ui-product-card__icon-btn ui-product-card__icon-btn--favorite-active"
            : "ui-product-card__icon-btn"
        }
        aria-label={
          active
            ? `${product.name} — sevimlilərdən çıxar`
            : `${product.name} — sevimlilərə əlavə et`
        }
        title={active ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et"}
        aria-pressed={active}
        onClick={handleClick}
      >
        <IconHeart width={18} height={18} />
      </button>
      {message ? (
        <div className="ui-product-card__compare-toast" role="status">
          <span>{message}</span>
          <button type="button" onClick={handleNavigate}>
            Bax
          </button>
        </div>
      ) : null}
    </div>
  );
}
