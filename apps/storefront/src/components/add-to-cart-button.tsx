"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { addToCart } from "@/app/actions";
import { dispatchCartAdded } from "@/lib/cart-added-toast";
import { IconCart } from "@itmarket/ui";

type AddToCartButtonProps = {
  cartId?: string;
  variantId: string;
  quantity?: number;
  className?: string;
  inCart?: boolean;
  children?: ReactNode;
};

export function AddToCartButton({
  cartId,
  variantId,
  quantity = 1,
  className,
  inCart = false,
  children,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const showGoToCart = inCart || justAdded;

  const handleClick = () => {
    if (showGoToCart) {
      router.push("/cart");
      return;
    }

    const formData = new FormData();
    formData.set("cartId", cartId ?? "");
    formData.set("variantId", variantId);
    formData.set("quantity", String(quantity));

    startTransition(async () => {
      await addToCart(formData);
      dispatchCartAdded();
      setJustAdded(true);
      router.refresh();
    });
  };

  const buttonClassName = [className, showGoToCart ? "ui-product-card__cta--in-cart" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={buttonClassName}
      disabled={isPending}
      onClick={handleClick}
      aria-label={showGoToCart ? "Səbətdə, səbətə keç" : undefined}
    >
      {showGoToCart ? (
        <>
          <IconCart width={18} height={18} />
          Səbətdə
        </>
      ) : (
        children
      )}
    </button>
  );
}
