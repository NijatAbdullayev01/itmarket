"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconHeart } from "@itmarket/ui";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { useMessages } from "@/components/locale-provider";

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
  const messages = useMessages();
  const [status, setStatus] = useState<"added" | null>(null);
  const active = isInFavorites(product.variantId);

  const handleClick = () => {
    const result = toggle(product);

    if (result.added) {
      setStatus("added");
      window.setTimeout(() => setStatus(null), 1800);
      return;
    }

    setStatus(null);
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
            ? `${product.name} — ${messages.product.favoriteRemove}`
            : `${product.name} — ${messages.product.favoriteAdd}`
        }
        title={active ? messages.product.favoriteRemove : messages.product.favoriteAdd}
        aria-pressed={active}
        onClick={handleClick}
      >
        <IconHeart width={18} height={18} />
      </button>
      {status ? (
        <div className="ui-product-card__compare-toast" role="status">
          <span>{messages.product.favoriteAdded}</span>
          <button type="button" onClick={handleNavigate}>
            {messages.compare.viewLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
