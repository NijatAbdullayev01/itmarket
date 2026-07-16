"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { addToCart } from "@/app/actions";
import { dispatchCartAdded } from "@/lib/cart-added-toast";

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

  return (
    <button
      type="button"
      className={className}
      disabled={isPending}
      onClick={handleClick}
    >
      {showGoToCart ? "Səbətə keç" : children}
    </button>
  );
}
