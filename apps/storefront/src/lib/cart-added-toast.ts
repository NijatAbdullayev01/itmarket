export const CART_ADDED_EVENT = "itmarket:cart-item-added";

export function dispatchCartAdded() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
}
